#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { create, use } from "@memvid/sdk";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Types for memvid SDK
interface MemvidInstance {
  put: (data: {
    text: string;
    title?: string;
    metadata?: Record<string, unknown>;
    labels?: string[];
    enableEmbedding?: boolean;
  }) => Promise<void>;
  find: (
    query: string | undefined,
    options?: { k?: number; mode?: "auto" | "lex" | "sem" }
  ) => Promise<SearchResult[] | { hits: SearchResult[] }>;
  timeline?: (options?: { k?: number }) => Promise<SearchResult[]>;
}

interface SearchResult {
  id?: string;
  title?: string;
  text?: string;
  snippet?: string;
  preview?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

// Configuration - XDG compliant
const XDG_DATA_HOME =
  process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const CAPSULES_DIR = join(XDG_DATA_HOME, "memvid", "capsules");

// Ensure capsules directory exists
function ensureCapsuleDir(): void {
  if (!existsSync(CAPSULES_DIR)) {
    mkdirSync(CAPSULES_DIR, { recursive: true });
  }
}

// Get capsule path from name
function getCapsulePath(name: string): string {
  ensureCapsuleDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(CAPSULES_DIR, `${safeName}.mv2`);
}

// Cache for open capsules
const capsuleCache = new Map<string, MemvidInstance>();

// Get or create capsule instance
async function getCapsule(
  name: string,
  createIfNotExists = true
): Promise<MemvidInstance> {
  const cached = capsuleCache.get(name);
  if (cached) return cached;

  const path = getCapsulePath(name);
  let instance: MemvidInstance;

  try {
    if (!existsSync(path)) {
      if (!createIfNotExists) {
        throw new Error(`Capsule '${name}' does not exist`);
      }
      instance = (await create(path)) as unknown as MemvidInstance;
    } else {
      instance = (await use("basic", path)) as unknown as MemvidInstance;
    }
    capsuleCache.set(name, instance);
    return instance;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to access capsule '${name}': ${message}`);
  }
}

// List available capsules
function listCapsules(): string[] {
  ensureCapsuleDir();
  return readdirSync(CAPSULES_DIR)
    .filter((f) => f.endsWith(".mv2"))
    .map((f) => f.replace(".mv2", ""));
}

// Normalize search results
function normalizeResults(
  results: SearchResult[] | { hits: SearchResult[] }
): SearchResult[] {
  return Array.isArray(results) ? results : results.hits || [];
}

// Tool definitions
const tools: Tool[] = [
  // Storage tools
  {
    name: "store_memory",
    description:
      "Store information in a memvid capsule. Use this to save context, notes, code snippets, conversations, or any data for later retrieval. Supports tags for organization and optional vector embeddings for semantic search.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description:
            "Name of the capsule (e.g., 'agent-context', 'knowledge-base', 'session-cache'). Created automatically if it doesn't exist.",
        },
        text: {
          type: "string",
          description: "The content to store",
        },
        title: {
          type: "string",
          description: "Optional title/identifier for this memory",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional tags for categorization (e.g., ['meeting', 'project-alpha'])",
        },
        metadata: {
          type: "object",
          description:
            "Optional key-value metadata (e.g., {\"source\": \"slack\", \"date\": \"2024-01-15\"})",
          additionalProperties: true,
        },
        enable_embedding: {
          type: "boolean",
          description:
            "Generate vector embedding for semantic search (requires AI provider). Default: false",
          default: false,
        },
      },
      required: ["capsule", "text"],
    },
  },
  {
    name: "delete_capsule",
    description:
      "Delete an entire capsule file. This permanently removes all memories in the capsule. Use with caution.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description: "Name of the capsule to delete",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm deletion",
        },
      },
      required: ["capsule", "confirm"],
    },
  },

  // Search tools
  {
    name: "semantic_search",
    description:
      "Search memories by meaning using vector embeddings. Best for finding conceptually related content even when exact words don't match. Requires embeddings to be enabled when storing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description: "Name of the capsule to search",
        },
        query: {
          type: "string",
          description:
            "Natural language query describing what you're looking for",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
          default: 10,
        },
      },
      required: ["capsule", "query"],
    },
  },
  {
    name: "text_search",
    description:
      "Search memories using full-text/keyword search (BM25). Best for finding exact words, names, identifiers, or specific terms.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description: "Name of the capsule to search",
        },
        query: {
          type: "string",
          description: "Keywords or text to search for",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
          default: 10,
        },
      },
      required: ["capsule", "query"],
    },
  },
  {
    name: "smart_search",
    description:
      "Search using automatic mode selection - memvid decides whether to use semantic or lexical search based on the query. Good default choice when unsure which search type to use.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description: "Name of the capsule to search",
        },
        query: {
          type: "string",
          description: "Search query (natural language or keywords)",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 10)",
          default: 10,
        },
      },
      required: ["capsule", "query"],
    },
  },
  {
    name: "recent_memories",
    description:
      "Get the most recent memories from a capsule in chronological order. Useful for retrieving recent context or reviewing what was stored.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description: "Name of the capsule to query",
        },
        limit: {
          type: "number",
          description: "Number of recent memories to return (default: 10)",
          default: 10,
        },
      },
      required: ["capsule"],
    },
  },

  // Capsule management
  {
    name: "list_capsules",
    description:
      "List all available memory capsules in the storage directory.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_capsule",
    description:
      "Create a new empty capsule. The capsule will be created in the XDG data directory.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description:
            "Name for the new capsule (alphanumeric, hyphens, underscores)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "capsule_info",
    description:
      "Get information about a capsule including its storage path and whether it exists.",
    inputSchema: {
      type: "object" as const,
      properties: {
        capsule: {
          type: "string",
          description: "Name of the capsule to get info about",
        },
      },
      required: ["capsule"],
    },
  },
];

// Format search result for output
function formatResult(result: SearchResult): string {
  const title = result.title || "Untitled";
  const content = result.snippet || result.text || result.preview || "";
  const score = result.score !== undefined ? `Score: ${result.score}` : "";
  return `[${title}]\n${content}\n${score}`.trim();
}

// Tool handlers
async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    switch (name) {
      // Storage tools
      case "store_memory": {
        const capsule = await getCapsule(args.capsule as string);
        await capsule.put({
          text: args.text as string,
          title: args.title as string | undefined,
          labels: args.tags as string[] | undefined,
          metadata: args.metadata as Record<string, unknown> | undefined,
          enableEmbedding: (args.enable_embedding as boolean) || false,
        });
        return {
          content: [
            {
              type: "text",
              text: `Stored memory in capsule '${args.capsule}'${args.title ? ` with title '${args.title}'` : ""}`,
            },
          ],
        };
      }

      case "delete_capsule": {
        if (args.confirm !== true) {
          return {
            content: [
              {
                type: "text",
                text: "Deletion not confirmed. Set 'confirm' to true to delete the capsule.",
              },
            ],
          };
        }
        const path = getCapsulePath(args.capsule as string);
        if (!existsSync(path)) {
          return {
            content: [
              {
                type: "text",
                text: `Capsule '${args.capsule}' does not exist`,
              },
            ],
          };
        }
        capsuleCache.delete(args.capsule as string);
        unlinkSync(path);
        return {
          content: [
            {
              type: "text",
              text: `Deleted capsule '${args.capsule}'`,
            },
          ],
        };
      }

      // Search tools
      case "semantic_search": {
        const capsule = await getCapsule(args.capsule as string, false);
        const results = await capsule.find(args.query as string, {
          k: (args.limit as number) || 10,
          mode: "sem",
        });
        const hits = normalizeResults(results);
        return {
          content: [
            {
              type: "text",
              text:
                hits.length > 0
                  ? hits.map(formatResult).join("\n\n---\n\n")
                  : "No results found",
            },
          ],
        };
      }

      case "text_search": {
        const capsule = await getCapsule(args.capsule as string, false);
        const results = await capsule.find(args.query as string, {
          k: (args.limit as number) || 10,
          mode: "lex",
        });
        const hits = normalizeResults(results);
        return {
          content: [
            {
              type: "text",
              text:
                hits.length > 0
                  ? hits.map(formatResult).join("\n\n---\n\n")
                  : "No results found",
            },
          ],
        };
      }

      case "smart_search": {
        const capsule = await getCapsule(args.capsule as string, false);
        const results = await capsule.find(args.query as string, {
          k: (args.limit as number) || 10,
          mode: "auto",
        });
        const hits = normalizeResults(results);
        return {
          content: [
            {
              type: "text",
              text:
                hits.length > 0
                  ? hits.map(formatResult).join("\n\n---\n\n")
                  : "No results found",
            },
          ],
        };
      }

      case "recent_memories": {
        const capsule = await getCapsule(args.capsule as string, false);
        let hits: SearchResult[];
        if (typeof capsule.timeline === "function") {
          hits = await capsule.timeline({ k: (args.limit as number) || 10 });
        } else {
          const results = await capsule.find(undefined, {
            k: (args.limit as number) || 10,
          });
          hits = normalizeResults(results);
        }
        return {
          content: [
            {
              type: "text",
              text:
                hits.length > 0
                  ? hits.map(formatResult).join("\n\n---\n\n")
                  : "No memories found in capsule",
            },
          ],
        };
      }

      // Capsule management
      case "list_capsules": {
        const capsules = listCapsules();
        return {
          content: [
            {
              type: "text",
              text:
                capsules.length > 0
                  ? `Available capsules:\n${capsules.map((c) => `  - ${c}`).join("\n")}\n\nStorage directory: ${CAPSULES_DIR}`
                  : `No capsules found.\nStorage directory: ${CAPSULES_DIR}\nUse 'store_memory' or 'create_capsule' to create one.`,
            },
          ],
        };
      }

      case "create_capsule": {
        const name = args.name as string;
        const path = getCapsulePath(name);
        if (existsSync(path)) {
          return {
            content: [
              {
                type: "text",
                text: `Capsule '${name}' already exists at ${path}`,
              },
            ],
          };
        }
        await getCapsule(name, true);
        return {
          content: [
            {
              type: "text",
              text: `Created capsule '${name}' at ${path}`,
            },
          ],
        };
      }

      case "capsule_info": {
        const name = args.capsule as string;
        const path = getCapsulePath(name);
        const exists = existsSync(path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  name,
                  path,
                  exists,
                  capsulesDirectory: CAPSULES_DIR,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
    };
  }
}

// Main server setup
async function main() {
  const server = new Server(
    {
      name: "mcp-memvid",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(
      request.params.name,
      (request.params.arguments as Record<string, unknown>) || {}
    );
  });

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("mcp-memvid server started");
  console.error(`Capsules directory: ${CAPSULES_DIR}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

# mcp-memvid-state-service

A **single-file AI memory layer** MCP server wrapping [memvid](https://memvid.com) - providing vector search, full-text search, and temporal queries as a Redis/Qdrant alternative for AI agents.

## Key Features
- **10 Tools** | **3 Search Modes** | **4 Local Embedding Models** | **Ollama + OpenAI Support**

## Quick Start

```bash
# Install globally
npm install -g mcp-memvid

# Or run directly
npx mcp-memvid
```

Add to Claude Code (`~/.claude.json`):

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["mcp-memvid"],
      "env": {
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

## Tools Overview

| Category | Tools | Description |
|----------|-------|-------------|
| **Storage** | `store_memory`, `delete_capsule` | Store text with embeddings, tags, metadata |
| **Search** | `semantic_search`, `text_search`, `smart_search` | Vector, BM25, and auto-mode search |
| **Temporal** | `recent_memories` | Chronological retrieval |
| **Management** | `list_capsules`, `create_capsule`, `capsule_info` | Capsule lifecycle |
| **Config** | `embedding_config` | View embedding provider status |

## Embedding Providers

| Provider | Config | Models |
|----------|--------|--------|
| **Local** (default) | None needed | `bge-small`, `bge-base`, `nomic`, `gte-large` |
| **Ollama** | `OLLAMA_HOST=http://localhost:11434` | Routes through OpenAI-compatible API |
| **OpenAI** | `OPENAI_API_KEY=sk-...` | `openai-small`, `openai-large` |

## Usage Examples

```javascript
// Store with embeddings
store_memory({
  capsule: "knowledge-base",
  text: "The API uses JWT tokens with 24h expiry",
  title: "Auth Architecture",
  tags: ["api", "security"],
  enable_embedding: true
})

// Semantic search
semantic_search({
  capsule: "knowledge-base",
  query: "how does authentication work"
})

// Check config
embedding_config()
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OLLAMA_HOST` | Ollama server URL (enables local LLM embeddings) |
| `OPENAI_API_KEY` | OpenAI API key for cloud embeddings |
| `MEMVID_EMBEDDING_MODEL` | Default embedding model |
| `XDG_DATA_HOME` | Override capsule storage location |

## Storage

Capsules stored in `$XDG_DATA_HOME/memvid/capsules/` (default: `~/.local/share/memvid/capsules/`)

Each `.mv2` capsule is a single portable file containing all data, indices, and metadata.

## Platform Support

| Platform | Local Embeddings |
|----------|-----------------|
| Linux x64 | Yes |
| macOS ARM64/x64 | Yes |
| Windows x64 | Use Ollama or OpenAI |

## Part of the Claude Code Plugin Ecosystem

This MCP server is part of the [**agents-skills-plugins**](https://github.com/EricGrill/agents-skills-plugins) marketplace - a community collection of 41+ plugins extending Claude Code with specialized capabilities.

```bash
# Browse the full marketplace
/plugin marketplace add EricGrill/agents-skills-plugins
```

## License

MIT

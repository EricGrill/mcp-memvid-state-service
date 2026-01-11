# mcp-memvid

MCP server for [memvid](https://memvid.com) - a single-file AI memory layer with vector search, full-text search, and temporal queries.

## Features

- **Store memories** - Save context, notes, code, conversations with tags and metadata
- **Semantic search** - Find conceptually related content using vector embeddings
- **Text search** - Find exact keywords using BM25 full-text search
- **Smart search** - Auto-selects best search mode based on query
- **Temporal queries** - Retrieve recent memories in chronological order
- **Named capsules** - Organize memories into separate `.mv2` files
- **XDG compliant** - Stores capsules in `$XDG_DATA_HOME/memvid/capsules/`

## Installation

```bash
npm install -g mcp-memvid
```

Or run directly:
```bash
npx mcp-memvid
```

## Usage with Claude Code

Add to your Claude Code MCP configuration (`~/.claude.json`):

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["mcp-memvid"]
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "memvid": {
      "command": "mcp-memvid"
    }
  }
}
```

## Tools

### Storage

| Tool | Description |
|------|-------------|
| `store_memory` | Store text with optional title, tags, metadata, and embeddings |
| `delete_capsule` | Delete an entire capsule (requires confirmation) |

### Search

| Tool | Description |
|------|-------------|
| `semantic_search` | Find by meaning using vector embeddings |
| `text_search` | Find by exact keywords (BM25) |
| `smart_search` | Auto-select best search mode |
| `recent_memories` | Get memories in chronological order |

### Capsule Management

| Tool | Description |
|------|-------------|
| `list_capsules` | List all available capsules |
| `create_capsule` | Create a new empty capsule |
| `capsule_info` | Get path and status of a capsule |

## Examples

### Store a memory
```
store_memory(
  capsule: "project-notes",
  text: "The API uses JWT tokens for authentication. Tokens expire after 24 hours.",
  title: "Auth Implementation",
  tags: ["api", "auth", "security"]
)
```

### Search memories
```
smart_search(
  capsule: "project-notes",
  query: "how does authentication work"
)
```

### Get recent context
```
recent_memories(
  capsule: "agent-context",
  limit: 5
)
```

## Storage Location

Capsules are stored in:
- `$XDG_DATA_HOME/memvid/capsules/` (typically `~/.local/share/memvid/capsules/`)

Each capsule is a single `.mv2` file containing all data, indices, and metadata.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `XDG_DATA_HOME` | Override base data directory |
| `OPENAI_API_KEY` | Required for semantic search with embeddings |

## License

MIT

# mcp-memvid

MCP server for [memvid](https://memvid.com) - a single-file AI memory layer with vector search, full-text search, and temporal queries.

## Features

- **Store memories** - Save context, notes, code, conversations with tags and metadata
- **Semantic search** - Find conceptually related content using vector embeddings
- **Text search** - Find exact keywords using BM25 full-text search
- **Smart search** - Auto-selects best search mode based on query
- **Temporal queries** - Retrieve recent memories in chronological order
- **Named capsules** - Organize memories into separate `.mv2` files
- **Multiple embedding providers** - Local models, OpenAI, or Ollama
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

### With Ollama (recommended for local embeddings)

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

### With OpenAI

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["mcp-memvid"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Embedding Models

### Local Models (No API Key Required)

These work out of the box on Linux/macOS:

| Model | Dimensions | Notes |
|-------|------------|-------|
| `bge-small` | 384 | Default, fast, good quality |
| `bge-base` | 768 | Better quality, slower |
| `nomic` | 768 | Good multilingual support |
| `gte-large` | 1024 | Highest quality, slowest |

### Ollama (Local, Private)

1. Install [Ollama](https://ollama.ai)
2. Pull an embedding model: `ollama pull nomic-embed-text`
3. Set `OLLAMA_HOST=http://localhost:11434`
4. Use `embedding_model: "openai-small"` (routes through Ollama's OpenAI-compatible API)

### OpenAI (Cloud)

1. Set `OPENAI_API_KEY`
2. Use `embedding_model: "openai-small"` or `"openai-large"`

## Tools

### Storage

| Tool | Description |
|------|-------------|
| `store_memory` | Store text with optional embeddings, title, tags, metadata |
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
| `embedding_config` | Show current embedding configuration |

## Examples

### Store with local embeddings (default)
```
store_memory(
  capsule: "knowledge",
  text: "The API uses JWT tokens for authentication.",
  title: "Auth Notes",
  enable_embedding: true
)
```

### Store with Ollama embeddings
```
store_memory(
  capsule: "knowledge",
  text: "PostgreSQL is our primary database.",
  title: "DB Architecture",
  enable_embedding: true,
  embedding_model: "openai-small"  // routes through Ollama if OLLAMA_HOST is set
)
```

### Semantic search
```
semantic_search(
  capsule: "knowledge",
  query: "how does authentication work"
)
```

### Check embedding config
```
embedding_config()
// Returns:
// {
//   "defaultModel": "bge-small",
//   "effectiveModel": "openai-small",  // if Ollama configured
//   "ollamaHost": "http://localhost:11434",
//   "openaiBaseUrl": "http://localhost:11434/v1",
//   ...
// }
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OLLAMA_HOST` | Ollama server URL (e.g., `http://localhost:11434`) |
| `OPENAI_API_KEY` | OpenAI API key for cloud embeddings |
| `OPENAI_BASE_URL` | Custom OpenAI-compatible endpoint |
| `MEMVID_EMBEDDING_MODEL` | Default embedding model |
| `XDG_DATA_HOME` | Override base data directory |

## Storage Location

Capsules are stored in:
- `$XDG_DATA_HOME/memvid/capsules/` (typically `~/.local/share/memvid/capsules/`)

Each capsule is a single `.mv2` file containing all data, indices, and metadata.

## Platform Support

| Platform | Local Embeddings | Notes |
|----------|-----------------|-------|
| Linux x64 | Yes | Full support |
| macOS ARM64 | Yes | Full support |
| macOS x64 | Yes | Full support |
| Windows x64 | No | Use OpenAI or Ollama |

## License

MIT

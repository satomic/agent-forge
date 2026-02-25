---
name: mcp-template
description: "Starter templates for VS Code MCP server configurations. USE FOR: MCP setup, adding MCP servers, configuring tools, Playwright, GitHub MCP. DO NOT USE FOR: agent creation, hook configuration, workflow automation."
---

# MCP Server Configuration Templates

## Minimal Starter (GitHub + Playwright)

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-playwright"]
    }
  }
}
```

## Database Access

```json
{
  "servers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${input:databaseUrl:Enter PostgreSQL connection string}"
      }
    }
  }
}
```

## File System Access

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y", "@modelcontextprotocol/server-filesystem",
        "${workspaceFolder}"
      ]
    }
  }
}
```

## Common Server Registry

| Server | Package/URL | Purpose |
|--------|-------------|---------|
| GitHub | `https://api.githubcopilot.com/mcp` | GitHub API tools |
| Playwright | `@microsoft/mcp-server-playwright` | Browser automation |
| Filesystem | `@modelcontextprotocol/server-filesystem` | File operations |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Database queries |

## When to Use

- Adding external tool capabilities to Copilot Chat
- Connecting to databases, APIs, or browser automation
- Setting up development environment tools

## When NOT to Use

- For coding guidelines — use instruction files
- For AI-powered tasks — use agents instead
- For event-driven automation — use hooks or agentic workflows

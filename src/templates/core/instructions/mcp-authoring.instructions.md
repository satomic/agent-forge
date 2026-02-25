---
name: "MCP Server Authoring"
description: "Standards for configuring Model Context Protocol servers in VS Code"
applyTo: "**/.vscode/mcp.json"
---

# MCP Server Configuration Guidelines

## Configuration File (`.vscode/mcp.json`)

### Structure

```json
{
  "servers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-server-name"]
    }
  }
}
```

### Server Types

#### Stdio (local process)
```json
{
  "command": "npx",
  "args": ["-y", "@scope/mcp-server"],
  "env": {
    "API_KEY": "${input:apiKey:Enter your API key}"
  }
}
```

#### HTTP (remote endpoint)
```json
{
  "type": "http",
  "url": "https://api.example.com/mcp"
}
```

## Security Rules

- Use `${input:varName:hint}` for API keys and secrets — never hardcode
- Only add servers from trusted sources
- Review server capabilities before adding
- Use `npx -y` for auto-install to avoid manual setup steps

## Best Practices

- Use descriptive server names as keys (e.g., `"playwright"` not `"server1"`)
- Group related servers with consistent naming
- Include only servers relevant to the project's tech stack
- Document custom servers with comments (JSON5 not supported — use README)

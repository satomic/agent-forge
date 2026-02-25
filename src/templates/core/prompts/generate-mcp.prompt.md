---
name: "generate-mcp"
description: "Generate MCP server configuration for VS Code"
agent: "copilot-architect"
tools:
  - read
  - edit
  - search
---

# Generate MCP Configuration

${input:purpose:Describe what tools you need (e.g., "browser automation and database access", "GitHub API integration", "file system and web scraping")}

## Task

Generate an MCP server configuration for VS Code based on the described needs.

## Output

Create: `.vscode/mcp.json`

## Requirements

- Include only servers relevant to the described purpose
- Use `${input:varName:hint}` for any API keys or secrets
- Prefer `npx -y` for auto-installing npm-based servers
- Use descriptive server names as keys
- If a `.vscode/mcp.json` already exists, merge new servers into it

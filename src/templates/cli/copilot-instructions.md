# AGENT-FORGE Generation Workspace

This is a temporary workspace for generating Copilot customization artifacts using multi-agent orchestration.

## Output Structure

Generated files go to these locations:

```
.github/
├── agents/          # Agent definitions (*.agent.md)
├── prompts/         # Prompt files (*.prompt.md)
├── instructions/    # Instruction files (*.instructions.md)
├── skills/          # Skill directories with SKILL.md
│   └── {name}/
│       └── SKILL.md
├── hooks/           # Hook configurations (*.json)
│   ├── *.json       # Hook event configs
│   └── scripts/     # Companion shell scripts
└── workflows/       # Agentic workflow definitions (*.md)

.vscode/
└── mcp.json         # MCP server configuration
```

## Multi-Agent Orchestration

The **forge-orchestrator** delegates to specialized sub-agents:
- **forge-agent-writer** — Creates `.agent.md` files
- **forge-instruction-writer** — Creates `.instructions.md` files
- **forge-prompt-writer** — Creates `.prompt.md` files
- **forge-skill-writer** — Creates `SKILL.md` files
- **forge-hook-writer** — Creates hook JSON configs and scripts
- **forge-mcp-writer** — Creates `.vscode/mcp.json`
- **forge-workflow-writer** — Creates agentic workflow `.md` files

Each sub-agent writes only its own artifact type. The orchestrator coordinates them.

## Rules

- Generate files directly to the paths specified in the prompt
- Use YAML frontmatter with `---` delimiters for markdown artifacts
- Use valid JSON for hook and MCP configurations
- Follow the artifact schemas defined in each sub-agent
- Do not create files outside the designated output directories
- MCP configs go to `.vscode/mcp.json`, NOT `.github/`

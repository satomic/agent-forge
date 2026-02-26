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

## Generation Quality Standards

Every generated artifact MUST meet these non-negotiable standards:

1. **No generic filler** — Every responsibility, rule, and pattern must reference the described use case and tech stack. "Follow best practices" is never acceptable.
2. **Explain the WHY** — Every technical standard and instruction rule must include reasoning (after an em dash or in parentheses). The AI uses reasoning to make correct edge-case decisions.
3. **Tech-stack specificity** — Content must name the actual frameworks, libraries, and patterns relevant to the use case. A React agent must mention hooks, JSX, component patterns — not generic "frontend development."
4. **Skill trigger precision** — Every skill `description` MUST include `USE FOR:` with 5-10 trigger phrases and `DO NOT USE FOR:` with 3-5 exclusion phrases. This controls on-demand context loading.
5. **Minimum depth** — Each agent needs at least 4 domain-specific responsibilities. Each instruction file needs at least 3 rule sections with code examples. Each skill needs actionable patterns, not theory.

## Reasoning Protocol

All sub-agents must internally assess before generating:

1. **Identify** the primary domain, technologies, and patterns from the prompt
2. **Determine** what content is unique to this use case (skip anything a linter or generic docs already cover)
3. **Self-check** the output against the Quality Standards above before finishing — if any item is generic or missing reasoning, revise it

## Rules

- Generate files directly to the paths specified in the prompt
- Use YAML frontmatter with `---` delimiters for markdown artifacts
- Use valid JSON for hook and MCP configurations
- Follow the artifact schemas defined in each sub-agent
- Do not create files outside the designated output directories
- MCP configs go to `.vscode/mcp.json`, NOT `.github/`

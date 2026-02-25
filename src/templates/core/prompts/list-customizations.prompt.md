---
name: 'list-customizations'
description: 'Scan the workspace for all Copilot customization files and present a structured summary'
tools:
  - 'read'
  - 'search'
agent: agent
---

# List All Copilot Customizations

Scan the current workspace for all VSCode Copilot customization artifacts and present a structured summary.

## Scan Targets

Search for these file types and locations:

### Custom Agents
- `.github/agents/*.agent.md`
- `use-cases/*/agents/*.agent.md`
- `.claude/agents/*.md`
- Any `.agent.md` files in configured `chat.agentFilesLocations`

### Prompt Files
- `.github/prompts/*.prompt.md`
- `use-cases/*/prompts/*.prompt.md`
- Any `.prompt.md` files in configured `chat.promptFilesLocations`

### Instruction Files
- `.github/copilot-instructions.md` (always-on)
- `AGENTS.md` (always-on, root and subfolders)
- `CLAUDE.md` / `.claude/CLAUDE.md` (always-on)
- `.github/instructions/*.instructions.md` (file-based)
- `use-cases/*/instructions/*.instructions.md` (generated)
- `.claude/rules/*.instructions.md` (Claude compat)

### Agent Skills
- `.github/skills/*/SKILL.md`
- `use-cases/*/skills/*/SKILL.md`
- `.claude/skills/*/SKILL.md`
- `.agents/skills/*/SKILL.md`

### Generated Use Cases
- `use-cases/*/README.md`

## Output Format

Present the results as a structured report:

```
## Customization Inventory

### Agents (N found)
| Name | File | Description | User-Invokable | Tools |
|---|---|---|---|---|

### Prompts (N found)
| Name | File | Description | Agent | Tools |
|---|---|---|---|---|

### Instructions (N found)
| Name | File | Type | ApplyTo / Scope |
|---|---|---|---|

### Skills (N found)
| Name | Directory | Description | Invokable | Auto-load |
|---|---|---|---|---|

### Generated Use Cases (N found)
| Use Case | Folder | Agents | Prompts | Instructions | Skills |
|---|---|---|---|---|---|

### Relationships
- [Agent] references [Instruction]
- [Agent] uses [Skill]
- [Prompt] invokes [Agent]
- [Coordinator] delegates to [Workers]
```

## Additional Analysis

After listing, provide:
1. **Coverage gaps**: Are there file types or areas without instruction coverage?
2. **Unused artifacts**: Any artifacts that aren't referenced by others?
3. **Recommendations**: Suggest additional customizations that would complement the existing set

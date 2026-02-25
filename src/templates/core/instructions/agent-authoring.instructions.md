---
name: 'Agent Authoring Standards'
description: 'Conventions and rules for writing custom agent definition files (*.agent.md)'
applyTo: '**/*.agent.md'
---

# Custom Agent Authoring Standards

## Frontmatter — Required and Optional Fields

Every `.agent.md` file MUST include a YAML frontmatter header. Include **all** applicable fields — omit only those that are truly not needed, and add an inline comment explaining the omission.

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | No | `string` | Display name in the agents dropdown. Defaults to file name if omitted. |
| `description` | Yes | `string` | Brief description shown as placeholder text in the chat input. Be specific about what the agent does. |
| `argument-hint` | No | `string` | Hint text shown in chat input to guide users. E.g., `"Describe the feature to plan"`. |
| `tools` | Yes | `string[]` | List of tool/tool-set names available to this agent. Use `<server>/*` for all MCP server tools. Common: `read`, `edit`, `search`, `fetch`, `agent`, `terminal`. |
| `agents` | No | `string[] \| '*'` | Subagents this agent can invoke. `*` = all, `[]` = none, or list specific names like `['Planner', 'Reviewer']`. Requires `agent` in `tools`. |
| `model` | No | `string \| string[]` | AI model(s) to use. Single string or prioritized array. Format: `Model Name (vendor)`. E.g., `'Claude Sonnet 4.5 (copilot)'`. |
| `user-invocable` | No | `boolean` | Whether this agent appears in the agents dropdown (default: `true`). Set `false` for subagent-only workers. |
| `disable-model-invocation` | No | `boolean` | Prevent AI from auto-invoking this as a subagent (default: `false`). Set `true` for user-triggered-only agents. |
| `target` | No | `string` | Target environment: `vscode` or `github-copilot`. |
| `mcp-servers` | No | `object[]` | MCP server config JSON for `target: github-copilot` agents. |
| `handoffs` | No | `object[]` | Suggested next actions to transition between agents. See Handoffs section below. |

## Handoff Object Fields

Each entry in `handoffs` supports:

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | Yes | `string` | Button text shown to the user. |
| `agent` | Yes | `string` | Target agent identifier to switch to. |
| `prompt` | No | `string` | Prompt text sent to the target agent. |
| `send` | No | `boolean` | Auto-submit the prompt (default: `false`). |
| `model` | No | `string` | Override model for this handoff. Format: `Model Name (vendor)`. |

## Body Content Rules

- Start with a clear role statement: "You are a [role] that [purpose]."
- Use numbered steps for sequential workflows
- Use bullet points for guidelines and constraints
- Reference tools with `#tool:<tool-name>` syntax
- Reference shared instructions via Markdown links pointing to `.instructions.md` files
- Keep the body focused — delegate detailed reference data to linked instruction files or skills
- Include concrete examples of expected input/output when the agent's task is non-obvious

## Naming Conventions

- File name: `kebab-case.agent.md` (e.g., `create-agent.agent.md`)
- `name` field: Title Case with spaces (e.g., `Create Agent`)
- Worker agents (subagent-only): set `user-invocable: false`
- Coordinator agents: explicitly list allowed subagents in `agents` field

## Anti-Patterns to Avoid

- Do NOT put detailed coding standards in agent files — use `.instructions.md` files instead
- Do NOT duplicate instructions across multiple agents — extract to shared instruction files and link them
- Do NOT omit `tools` — an agent without tools has severely limited capability
- Do NOT use the deprecated `infer` field — use `user-invocable` and `disable-model-invocation` instead

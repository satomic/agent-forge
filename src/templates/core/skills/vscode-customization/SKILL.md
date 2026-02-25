---
name: vscode-customization
description: >-
  Comprehensive reference for all VSCode Copilot customization artifact types —
  custom agents (.agent.md), prompt files (.prompt.md), instruction files (.instructions.md),
  agent skills (SKILL.md), always-on instructions (copilot-instructions.md, AGENTS.md, CLAUDE.md),
  and handoff/subagent configurations. Use this skill when creating, modifying, or reviewing
  any Copilot customization file to ensure correct frontmatter schema, field types, and
  best practices.
---

# VSCode Copilot Customization — Complete Schema Reference

This skill provides the authoritative schema for every customization artifact type in VS Code's GitHub Copilot integration. Load this skill whenever you need to generate or validate customization files.

---

## 1. Custom Agents (`.agent.md`)

### Location
- Workspace: `.github/agents/`
- User profile: profile `agents/` folder
- Claude compat: `.claude/agents/` (plain `.md` files)

### Frontmatter Schema

```yaml
---
# name (string, optional) — Display name in agents dropdown. Defaults to file name.
name: 'My Agent'

# description (string, recommended) — Placeholder text in chat input. Be specific.
description: 'Generates implementation plans for new features'

# argument-hint (string, optional) — Guidance text shown in chat input.
argument-hint: 'Describe the feature you want to plan'

# tools (string[], recommended) — Available tools/tool-sets for this agent.
# Common: read, edit, search, fetch, agent, terminal, diagnostics
# MCP: use '<server-name>/*' for all server tools
tools:
  - 'read'
  - 'search'
  - 'agent'

# agents (string[] | '*', optional) — Which subagents this agent can invoke.
# '*' = all agents, [] = none, or list specific names.
# Requires 'agent' in tools.
agents:
  - 'Planner'
  - 'Reviewer'

# model (string | string[], optional) — AI model(s) to use. Prioritized array.
# Format: 'Model Name (vendor)' — e.g., 'Claude Sonnet 4.5 (copilot)'
# If omitted, uses the currently selected model.
model: 'Claude Sonnet 4.5 (copilot)'

# user-invocable (boolean, optional, default: true) — Show in agents dropdown.
# Set false for subagent-only workers.
user-invocable: true

# disable-model-invocation (boolean, optional, default: false) — Prevent AI from
# auto-invoking this as a subagent. Set true for user-triggered-only agents.
disable-model-invocation: false

# target (string, optional) — Target environment: 'vscode' or 'github-copilot'.
target: vscode

# mcp-servers (object[], optional) — MCP server config for github-copilot target.
# mcp-servers:
#   - name: 'my-server'
#     url: 'https://...'

# handoffs (object[], optional) — Transition buttons to other agents.
handoffs:
  - label: 'Start Implementation'     # Button text shown to user
    agent: implementation              # Target agent identifier
    prompt: 'Implement the plan above' # Prompt sent to target agent
    send: false                        # Auto-submit? (default: false)
    model: 'GPT-5 (copilot)'          # Override model for handoff (optional)
---
```

### Body Format
```markdown
You are a [role] that [purpose].

## Guidelines
- Bullet-pointed instructions
- Reference tools: #tool:search, #tool:read
- Reference instructions: [Agent Authoring](../../instructions/agent-authoring.instructions.md)

## Steps
1. Step one
2. Step two

## Examples
[Optional input/output examples]
```

---

## 2. Prompt Files (`.prompt.md`)

### Location
- Workspace: `.github/prompts/`
- User profile: profile `prompts/` folder

### Frontmatter Schema

```yaml
---
# name (string, optional) — Name after typing '/' in chat. Defaults to file name.
name: 'create-component'

# description (string, optional) — Short description shown on hover.
description: 'Scaffold a new React component with tests'

# argument-hint (string, optional) — Hint text when prompt is invoked.
argument-hint: 'component name and props'

# agent (string, optional) — Agent to use: 'ask', 'agent', 'plan', or custom agent name.
# Defaults to current agent. If tools are specified, defaults to 'agent'.
agent: agent

# model (string, optional) — Language model to use. If omitted, uses selected model.
model: 'Claude Sonnet 4.5 (copilot)'

# tools (string[], optional) — Available tools for this prompt execution.
tools:
  - 'read'
  - 'edit'
  - 'search'
---
```

### Variables Available in Body
| Variable | Description |
|---|---|
| `${workspaceFolder}` | Absolute path to workspace root |
| `${workspaceFolderBasename}` | Workspace folder name |
| `${selection}` / `${selectedText}` | Current editor selection |
| `${file}` | Current file absolute path |
| `${fileBasename}` | Current file name with extension |
| `${fileDirname}` | Current file directory |
| `${fileBasenameNoExtension}` | Current file name without extension |
| `${input:varName}` | Free text input from user |
| `${input:varName:placeholder}` | Input with placeholder hint |

---

## 3. Instruction Files (`.instructions.md`)

### Location
- Workspace: `.github/instructions/`
- User profile: profile `prompts/` folder
- Claude compat: `.claude/rules/` (workspace) or `~/.claude/rules/` (user)

### Frontmatter Schema

```yaml
---
# name (string, optional) — Display name in UI. Defaults to file name.
name: 'Python Standards'

# description (string, optional) — Shown on hover. Also used for semantic matching
# to auto-apply instructions when description matches the current task.
description: 'Coding conventions for Python files'

# applyTo (string, optional) — Glob pattern relative to workspace root.
# Defines which files trigger this instruction automatically.
# If omitted, NOT applied automatically — manual attachment only.
# Use '**' to apply to all files (sparingly).
applyTo: '**/*.py'
---
```

### Common `applyTo` Patterns
- `**/*.py` — All Python files
- `**/*.{ts,tsx}` — All TypeScript files
- `src/backend/**` — All backend files
- `**/*.test.{js,ts}` — Test files only
- `**/Dockerfile*` — Dockerfiles
- `**` — Everything (use sparingly)

---

## 4. Always-On Instruction Files

### `copilot-instructions.md`
- Location: `.github/copilot-instructions.md`
- No frontmatter needed — applied to all chat requests automatically
- Use for: project-wide coding standards, architecture decisions, tech stack declarations

### `AGENTS.md`
- Location: workspace root (or subfolders with `chat.useNestedAgentsMdFiles`)
- No frontmatter needed
- Use for: multi-agent compatibility, subfolder-specific rules
- Setting: `chat.useAgentsMdFile`

### `CLAUDE.md`
- Locations: workspace root, `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`
- Local variant: `CLAUDE.local.md` (not committed)
- Setting: `chat.useClaudeMdFile`

---

## 5. Agent Skills (`SKILL.md`)

### Location
- Project: `.github/skills/<skill-name>/SKILL.md`
- Personal: `~/.copilot/skills/<skill-name>/SKILL.md`
- Also: `.claude/skills/`, `.agents/skills/`

### Frontmatter Schema

```yaml
---
# name (string, REQUIRED) — Unique lowercase identifier with hyphens.
# MUST match parent directory name. Max 64 characters.
name: webapp-testing

# description (string, REQUIRED) — What the skill does and when to use it.
# Be specific — Copilot uses this to decide when to load the skill.
# Max 1024 characters.
description: >-
  Test web applications using Playwright. Use when writing, running,
  or debugging end-to-end tests for web UIs.

# argument-hint (string, optional) — Hint shown when invoked as / command.
argument-hint: '[test file] [options]'

# user-invocable (boolean, optional, default: true) — Show in / menu.
user-invocable: true

# disable-model-invocation (boolean, optional, default: false) — Prevent
# automatic loading based on relevance. Require manual / invocation only.
disable-model-invocation: false
---
```

### Directory Structure
```
skill-name/
├── SKILL.md          # Required
├── scripts/          # Optional automation scripts
├── examples/         # Optional usage examples
└── resources/        # Optional supporting docs
```

### Progressive Disclosure
1. **Discovery** — Only `name` + `description` loaded (always, lightweight)
2. **Instructions** — Full `SKILL.md` body loaded when relevant
3. **Resources** — Additional files loaded only when referenced

---

## 6. Subagent Configuration

### How Subagents Work
- Main agent delegates subtasks to subagents that run in isolated context windows
- Subagents are synchronous — main agent waits for results
- Multiple subagents can run in parallel
- Only the final result is returned to the main agent's context

### Key Properties for Subagent Control

| Property | In Agent File | Effect |
|---|---|---|
| `agents: ['A', 'B']` | Coordinator | Restrict which subagents can be invoked |
| `agents: '*'` | Coordinator | Allow all subagents (default) |
| `agents: []` | Any agent | Prevent any subagent use |
| `user-invocable: false` | Worker | Hide from dropdown, accessible only as subagent |
| `disable-model-invocation: true` | Worker | Prevent auto-invocation as subagent |

### Invoking Subagents
- Requires `agent` tool in the coordinator's `tools` list
- Agent-initiated (AI decides) or user-hinted ("use the Planner agent as a subagent")
- In prompt files: include `runSubagent` or `agent` in `tools` frontmatter

---

## 7. Tool List Priority Order

When tools are specified in multiple places:
1. Tools in the **prompt file** (`tools` field) — highest priority
2. Tools from the **referenced agent** (`agent` field in prompt)
3. **Default tools** for the selected agent — lowest priority

---

## 8. Quick Reference — File Locations

| Artifact | Workspace | User Profile |
|---|---|---|
| Custom Agent | `.github/agents/*.agent.md` | Profile `agents/` |
| Prompt File | `.github/prompts/*.prompt.md` | Profile `prompts/` |
| Instruction | `.github/instructions/*.instructions.md` | Profile `prompts/` |
| Skill | `.github/skills/<name>/SKILL.md` | `~/.copilot/skills/` |
| Always-on | `.github/copilot-instructions.md` | N/A |
| AGENTS.md | Workspace root | N/A |

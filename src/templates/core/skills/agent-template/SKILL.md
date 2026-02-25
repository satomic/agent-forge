---
name: agent-template
description: >-
  Complete field reference and copyable template for creating custom agent
  definition files (.agent.md). Covers every frontmatter field — name,
  description, tools, agents, model, user-invocable, disable-model-invocation,
  target, mcp-servers, handoffs — with types, defaults, and inline documentation.
  USE FOR: creating .agent.md files, agent frontmatter reference, agent field
  documentation, coordinator agents, worker agents, subagent configuration.
user-invocable: false
---

# Custom Agent Template — Complete Field Reference

Use this template as a starting point when creating new `.agent.md` files. Every available frontmatter field is shown with its type, default value, and documentation.

## Template

Copy the following into a new `.github/agents/<name>.agent.md` file:

```markdown
---
# ============================================================================
# CUSTOM AGENT DEFINITION — .agent.md
# ============================================================================
# Location: .github/agents/<name>.agent.md (workspace) or profile agents/ (user)
# Docs: https://code.visualstudio.com/docs/copilot/customization/custom-agents
# ============================================================================

# name (string, optional)
# Display name in the agents dropdown. Defaults to file name if omitted.
# Use Title Case with spaces.
name: 'My Agent Name'

# description (string, recommended)
# Brief description shown as placeholder text in the chat input field.
# Be specific about what the agent does — this helps users choose the right agent.
description: 'What this agent does in one sentence'

# argument-hint (string, optional)
# Hint text shown in the chat input field to guide users on what to type.
# Keep it short and action-oriented.
argument-hint: 'Describe what you want'

# tools (string[], recommended)
# List of tool or tool-set names available for this agent.
# Common tools:
#   read       — read files in the workspace
#   edit       — create/modify files
#   search     — search workspace content
#   terminal   — run terminal commands
#   fetch      — fetch web pages
#   agent      — invoke subagents (required for subagent delegation)
#   diagnostics — get compiler/linter errors
# MCP servers: use '<server-name>/*' for all tools from an MCP server
# If a tool isn't available at runtime, it's silently ignored.
tools:
  - 'read'
  - 'search'

# agents (string[] | '*', optional)
# Controls which custom agents can be invoked as subagents.
# Requires 'agent' in the tools list above.
#   '*'           — allow ALL custom agents as subagents (default)
#   []            — prevent any subagent use
#   ['A', 'B']    — allow only specific named agents
# Explicitly listing an agent overrides its disable-model-invocation setting.
# agents: ['Planner', 'Reviewer']

# model (string | string[], optional)
# AI model to use. Specify as 'Model Name (vendor)'.
# Can be a single string or a prioritized array (tries each in order).
# If omitted, uses the model selected in the model picker.
# Examples:
#   'Claude Sonnet 4.5 (copilot)'
#   'GPT-5 (copilot)'
#   ['Claude Sonnet 4.5 (copilot)', 'GPT-5 (copilot)']  # fallback chain
# model: 'Claude Sonnet 4.5 (copilot)'

# user-invocable (boolean, optional, default: true)
# Controls whether this agent appears in the agents dropdown in chat.
# Set to false to create agents only accessible as subagents.
user-invocable: true

# disable-model-invocation (boolean, optional, default: false)
# Prevents the AI from automatically invoking this agent as a subagent.
# Set to true when the agent should only be triggered explicitly by users.
# Note: a coordinator's 'agents' list overrides this setting.
disable-model-invocation: false

# target (string, optional)
# Target environment for the agent.
# Values: 'vscode' or 'github-copilot'
# target: vscode

# mcp-servers (object[], optional)
# MCP server configurations for target: github-copilot agents.
# mcp-servers:
#   - name: 'server-name'
#     url: 'https://mcp-server-url'
#     auth:
#       type: 'bearer'
#       token: '${{ secrets.TOKEN }}'

# handoffs (object[], optional)
# Suggested next actions that appear as buttons after the agent responds.
# Creates guided sequential workflows between agents.
# handoffs:
#   - label: 'Button Text'          # (required) Text shown on the handoff button
#     agent: target-agent            # (required) Agent identifier to switch to
#     prompt: 'Prompt for target'    # (optional) Prompt sent to target agent
#     send: false                    # (optional) Auto-submit? Default: false
#     model: 'GPT-5 (copilot)'      # (optional) Override model for this handoff
---

You are a [role] that [purpose].

## Guidelines

- Guideline 1
- Guideline 2

## Steps

1. First, do this
2. Then, do this
3. Finally, do this

## References

- Shared instructions: `../instructions/<your-topic>.instructions.md`
- Use #tool:search to find relevant code
- Use #tool:read to examine files
```

## Field Summary Table

| Field | Type | Default | Required |
|---|---|---|---|
| `name` | `string` | file name | No |
| `description` | `string` | — | Recommended |
| `argument-hint` | `string` | — | No |
| `tools` | `string[]` | — | Recommended |
| `agents` | `string[] \| '*'` | `'*'` | No |
| `model` | `string \| string[]` | selected model | No |
| `user-invocable` | `boolean` | `true` | No |
| `disable-model-invocation` | `boolean` | `false` | No |
| `target` | `string` | — | No |
| `mcp-servers` | `object[]` | — | No |
| `handoffs` | `object[]` | — | No |
| `handoffs[].label` | `string` | — | Yes (in handoff) |
| `handoffs[].agent` | `string` | — | Yes (in handoff) |
| `handoffs[].prompt` | `string` | — | No |
| `handoffs[].send` | `boolean` | `false` | No |
| `handoffs[].model` | `string` | — | No |

---
name: prompt-template
description: >-
  Complete field reference and copyable template for creating reusable prompt
  files (.prompt.md). Covers every frontmatter field — name, description,
  argument-hint, agent, model, tools — with types, defaults, available
  variables table, and tool priority order.
  USE FOR: creating .prompt.md files, prompt frontmatter reference, prompt
  variables, slash commands, tool priority order, agent routing.
user-invocable: false
---

# Prompt File Template — Complete Field Reference

Use this template as a starting point when creating new `.prompt.md` files. Every available frontmatter field and variable is shown with documentation.

## Template

Copy the following into a new `.github/prompts/<name>.prompt.md` file:

```markdown
---
# ============================================================================
# PROMPT FILE DEFINITION — .prompt.md
# ============================================================================
# Location: .github/prompts/<name>.prompt.md (workspace) or profile prompts/ (user)
# Docs: https://code.visualstudio.com/docs/copilot/customization/prompt-files
# ============================================================================

# name (string, optional)
# Name shown after typing '/' in chat. Defaults to file name.
# Use lowercase kebab-case. Keep short and action-oriented.
name: 'my-prompt'

# description (string, optional)
# Short description shown on hover. Helps users understand what the prompt does.
description: 'What this prompt accomplishes in one sentence'

# argument-hint (string, optional)
# Hint text shown in the chat input field when the prompt is invoked.
# Guides users on what additional information to provide.
argument-hint: 'what to type after /my-prompt'

# agent (string, optional)
# The agent to use when running this prompt.
# Built-in options:
#   ask    — question/explanation mode (no tool use)
#   agent  — implementation mode (full tool access)
#   plan   — planning mode
# Or use a custom agent name (e.g., 'Copilot Architect')
# Default: current agent. If tools are specified, defaults to 'agent'.
agent: agent

# model (string, optional)
# Language model to use for this prompt execution.
# Format: 'Model Name (vendor)' — e.g., 'Claude Sonnet 4.5 (copilot)'
# If omitted, uses the currently selected model in the model picker.
# model: 'Claude Sonnet 4.5 (copilot)'

# tools (string[], optional)
# List of tool/tool-set names available during this prompt's execution.
# These OVERRIDE tools from the agent (highest priority).
# Common tools: read, edit, search, terminal, fetch, agent, diagnostics
# MCP: '<server-name>/*' for all MCP server tools
# If a tool isn't available at runtime, it's silently ignored.
tools:
  - 'read'
  - 'edit'
---

# Prompt Title

[Clear instructions for what the prompt should accomplish]

## Input

${input:variableName:placeholder text for the user}

## Requirements

- Requirement 1
- Requirement 2

## Expected Output

[Description of the format and content expected]

## Examples

### Example Input
[Show what the user might provide]

### Example Output
[Show what the AI should produce]

## References

- Shared instructions: `../instructions/<your-topic>.instructions.md`
- Use #tool:search for workspace context
```

## Available Variables

Use these in the prompt body for dynamic content:

| Variable | Description | Example Use |
|---|---|---|
| `${workspaceFolder}` | Absolute path to workspace root | Path construction |
| `${workspaceFolderBasename}` | Name of workspace folder | Display names |
| `${selection}` | Currently selected text in editor | Operate on selection |
| `${selectedText}` | Alias for `${selection}` | Same as above |
| `${file}` | Absolute path of current file | File-specific operations |
| `${fileBasename}` | Current file name with extension | Display file name |
| `${fileDirname}` | Directory of current file | Relative operations |
| `${fileBasenameNoExtension}` | File name without extension | Naming conventions |
| `${input:name}` | Free-text user input | Custom parameters |
| `${input:name:placeholder}` | User input with placeholder hint | Guided parameters |

## Tool Priority Order

When tools are specified in multiple places:
1. **Prompt file** `tools` — highest priority (overrides agent)
2. **Referenced agent** tools — from the `agent` field
3. **Default agent** tools — lowest priority

## Field Summary Table

| Field | Type | Default | Required |
|---|---|---|---|
| `name` | `string` | file name | No |
| `description` | `string` | — | No |
| `argument-hint` | `string` | — | No |
| `agent` | `string` | current agent / `agent` if tools set | No |
| `model` | `string` | selected model | No |
| `tools` | `string[]` | — | No |

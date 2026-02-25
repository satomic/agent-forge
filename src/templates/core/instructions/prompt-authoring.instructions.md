---
name: 'Prompt Authoring Standards'
description: 'Conventions and rules for writing reusable prompt files (*.prompt.md)'
applyTo: '**/*.prompt.md'
---

# Prompt File Authoring Standards

## Frontmatter — All Available Fields

Every `.prompt.md` file SHOULD include a YAML frontmatter header. Include all applicable fields.

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | No | `string` | The name used after typing `/` in chat. Defaults to file name if omitted. Use lowercase kebab-case. |
| `description` | No | `string` | Short description shown on hover. Explain what the prompt does. |
| `argument-hint` | No | `string` | Hint text shown in the chat input field when the prompt is invoked. E.g., `"component name and props"`. |
| `agent` | No | `string` | The agent used for running the prompt: `ask`, `agent`, `plan`, or the name of a custom agent. Defaults to the current agent. If `tools` are specified, defaults to `agent`. |
| `model` | No | `string` | Language model to use. If omitted, uses the currently selected model. Format: `Model Name (vendor)`. |
| `tools` | No | `string[]` | List of tool or tool-set names available for this prompt. Can include built-in tools, tool sets, MCP tools, or extension tools. Use `<server>/*` for all MCP server tools. |

## Variable Syntax

Use these variables in the prompt body for dynamic content:

| Variable | Description |
|---|---|
| `${workspaceFolder}` | Absolute path to the workspace root |
| `${workspaceFolderBasename}` | Name of the workspace folder |
| `${selection}` / `${selectedText}` | Currently selected text in the editor |
| `${file}` | Absolute path of the current file |
| `${fileBasename}` | File name with extension |
| `${fileDirname}` | Directory of the current file |
| `${fileBasenameNoExtension}` | File name without extension |
| `${input:varName}` | User input variable — prompts user for free text |
| `${input:varName:placeholder}` | User input with placeholder hint text |

## Body Content Rules

- Write clear, specific instructions about what the prompt should accomplish
- Specify the expected output format explicitly (code, markdown, JSON, etc.)
- Provide examples of expected input and output to guide the AI
- Use Markdown links to reference custom instructions rather than duplicating guidelines
- Reference tools with `#tool:<tool-name>` syntax when the prompt relies on specific tool capabilities
- Use `${input:varName:placeholder}` for user-configurable parts of the prompt

## Tool List Priority

When both a prompt file and a custom agent specify tools, this priority applies:
1. Tools specified in the prompt file (highest)
2. Tools from the referenced custom agent (`agent` field)
3. Default tools for the selected agent (lowest)

## File Organization

- Store workspace prompts in `.github/prompts/`
- Store user-wide prompts in the VS Code profile `prompts/` folder
- Use the `chat.promptFilesLocations` setting to add custom prompt directories
- Use the `chat.promptFilesRecommendations` setting to show prompts as recommended actions in new chat sessions

## Naming Conventions

- File name: `kebab-case.prompt.md` (e.g., `create-react-form.prompt.md`)
- `name` field: lowercase kebab-case matching the file name (e.g., `create-react-form`)
- Keep names short and action-oriented — they appear after `/` in chat

## Anti-Patterns to Avoid

- Do NOT put always-on coding standards in prompt files — use `.instructions.md` instead
- Do NOT hardcode file paths — use variables like `${workspaceFolder}` and `${file}`
- Do NOT create prompts that duplicate built-in slash commands like `/explain` or `/fix`
- Do NOT omit the `description` — users need to know what a prompt does before invoking it

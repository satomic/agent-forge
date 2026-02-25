---
name: 'Instruction Authoring Standards'
description: 'Conventions and rules for writing custom instruction files (*.instructions.md)'
applyTo: '**/*.instructions.md'
---

# Instruction File Authoring Standards

## Types of Instruction Files

| Type | File | Location | Scope |
|---|---|---|---|
| Always-on (project) | `copilot-instructions.md` | `.github/` | All chat requests in workspace |
| Always-on (multi-agent) | `AGENTS.md` | Workspace root or subfolders | All chat requests; cross-agent compatible |
| Always-on (Claude compat) | `CLAUDE.md` | Root, `.claude/`, or `~/` | Claude Code + VS Code |
| File-based | `*.instructions.md` | `.github/instructions/` or profile `prompts/` | Files matching `applyTo` glob |
| Organization-level | Defined on GitHub.com | GitHub organization | All repos in the org |

## Frontmatter — All Available Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | No | `string` | Display name shown in the UI. Defaults to the file name if omitted. |
| `description` | No | `string` | Short description shown on hover in the Chat view. Also used for semantic matching — if the description matches the current task, the instruction may auto-apply even without `applyTo`. |
| `applyTo` | No | `string` | Glob pattern relative to workspace root that defines which files trigger this instruction. Use `**` to apply to all files. If omitted, the instruction is NOT applied automatically — manual attachment only. |

## Glob Pattern Examples for `applyTo`

| Pattern | Matches |
|---|---|
| `**/*.py` | All Python files in the workspace |
| `**/*.{ts,tsx}` | All TypeScript and TSX files |
| `src/backend/**` | All files under `src/backend/` |
| `**/*.test.{js,ts}` | All JS/TS test files |
| `**/Dockerfile*` | All Dockerfiles |
| `**` | All files (use sparingly) |

## Body Content Rules

- Write instructions as concise, self-contained bullet points
- Include the **reasoning** behind each rule — the AI makes better edge-case decisions when it understands _why_
  - Good: "Use `date-fns` instead of `moment.js` — moment.js is deprecated and increases bundle size"
  - Bad: "Use `date-fns`"
- Show preferred and avoided patterns with concrete code examples using fenced code blocks
- Focus on **non-obvious rules** that linters/formatters don't enforce
- Reference tools with `#tool:<tool-name>` syntax when instructions relate to specific tool usage
- Reference workspace files with Markdown links for additional context: `\[API Guidelines]\(../docs/api-guide.md\)`

## File Organization

- Store workspace instructions in `.github/instructions/`
- Store user-wide instructions in the VS Code profile `prompts/` folder
- For Claude compatibility, also detect from `.claude/rules/` (workspace) and `~/.claude/rules/` (user)
- Use `chat.instructionsFilesLocations` setting to configure additional instruction directories
- One instruction file per concern — don't mix Python rules with TypeScript rules

## Naming Conventions

- File name: `kebab-case.instructions.md` (e.g., `python-standards.instructions.md`)
- `name` field: Title Case (e.g., `Python Standards`)
- Name should clearly indicate the scope/topic

## Instruction Priority

When multiple instruction sources exist, all are provided to the AI. Conflicts resolve by priority:
1. **Personal instructions** (user-level) — highest priority
2. **Repository instructions** (`copilot-instructions.md` or `AGENTS.md`)
3. **Organization instructions** — lowest priority

## Required VS Code Settings

Ensure these settings are enabled for instructions to work:
- `chat.includeApplyingInstructions` — for `applyTo` pattern-based instructions
- `chat.includeReferencedInstructions` — for instructions referenced via Markdown links
- `chat.useAgentsMdFile` — for `AGENTS.md` support

## Anti-Patterns to Avoid

- Do NOT create a single massive instruction file — split by concern/language/framework
- Do NOT duplicate instructions across files — extract common rules to a shared file and reference with Markdown links
- Do NOT use `applyTo: '**'` unless the rules truly apply to every file type
- Do NOT put task-specific workflows in instruction files — use prompt files or agent files for that
- Do NOT skip the `description` field — it enables semantic matching for auto-application

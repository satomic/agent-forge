---
name: instruction-template
description: >-
  Complete field reference and copyable template for creating instruction files
  (.instructions.md), always-on instructions (copilot-instructions.md), and
  multi-agent instructions (AGENTS.md). Covers frontmatter fields — name,
  description, applyTo — with glob patterns, configuration settings, and
  instruction priority rules.
  USE FOR: creating .instructions.md files, instruction frontmatter reference,
  applyTo glob patterns, copilot-instructions.md, AGENTS.md, always-on rules.
user-invocable: false
---

# Instruction File Template — Complete Field Reference

Use this template as a starting point when creating new `.instructions.md` files. Every available frontmatter field is shown with documentation.

## Template — File-Based Instruction

Copy the following into a new `.github/instructions/<name>.instructions.md` file:

```markdown
---
# ============================================================================
# INSTRUCTION FILE DEFINITION — .instructions.md
# ============================================================================
# Location: .github/instructions/<name>.instructions.md (workspace)
#           or profile prompts/ folder (user-wide)
# Docs: https://code.visualstudio.com/docs/copilot/customization/custom-instructions
# ============================================================================

# name (string, optional)
# Display name shown in the UI (Configure Chat > Chat Instructions).
# Defaults to the file name if omitted. Use Title Case.
name: 'My Standards'

# description (string, optional)
# Short description shown on hover in the Chat view.
# IMPORTANT: Also used for SEMANTIC MATCHING — if the description matches
# the current task, the instruction may auto-apply even without applyTo.
# Be specific and descriptive.
description: 'Coding conventions and best practices for [topic]'

# applyTo (string, optional)
# Glob pattern RELATIVE TO WORKSPACE ROOT that defines which files
# trigger this instruction automatically.
# If omitted: instruction is NOT applied automatically (manual only).
# Use '**' to apply to all files (use sparingly).
#
# Common patterns:
#   '**/*.py'              — All Python files
#   '**/*.{ts,tsx}'        — All TypeScript/TSX files
#   '**/*.{js,jsx}'        — All JavaScript/JSX files
#   '**/*.{css,scss,less}' — All stylesheets
#   '**/*.test.{js,ts}'    — All test files
#   'src/backend/**'       — All files in backend directory
#   '**/Dockerfile*'       — All Dockerfiles
#   '**/*.md'              — All Markdown files
#   '**'                   — All files (use for truly universal rules)
applyTo: '**/*.py'
---

# Topic Standards

## Conventions

- Convention 1 — reason why this matters
- Convention 2 — reason why this matters

## Preferred Patterns

```language
// GOOD: Description of the preferred approach
const result = preferredApproach();
```

## Avoided Patterns

```language
// BAD: Description of what to avoid and why
const result = avoidedApproach(); // reason this is problematic
```

## References

- Related docs: `../../docs/relevant-doc.md`
- Use `#tool:<tool-name>` to reference specific tools
```

## Template — Always-On Instructions

### copilot-instructions.md

```markdown
# Project-Wide Copilot Instructions

## Project Overview
[Brief project description, purpose, tech stack]

## Coding Standards
- Standard 1 — rationale
- Standard 2 — rationale

## Architecture Decisions
- Decision 1 — why this approach was chosen
- Decision 2 — constraints and tradeoffs

## Security Requirements
- Requirement 1
- Requirement 2

## Documentation Standards
- Where to document (README, JSDoc, etc.)
- What to document (public APIs, complex logic, etc.)
```

### AGENTS.md

```markdown
# Agent Instructions

These instructions apply to all AI agents working in this repository.

## Repository Structure
[Key directories and their purposes]

## Development Workflow
[How to build, test, and deploy]

## Conventions
[Coding conventions compatible across all AI agents]
```

## Configuration Settings

Ensure these settings are enabled for instructions to work:

| Setting | Purpose | Default |
|---|---|---|
| `chat.includeApplyingInstructions` | Enable `applyTo` pattern matching | `true` |
| `chat.includeReferencedInstructions` | Enable Markdown link references | `true` |
| `chat.useAgentsMdFile` | Enable `AGENTS.md` support | `true` |
| `chat.useClaudeMdFile` | Enable `CLAUDE.md` support | `true` |
| `chat.instructionsFilesLocations` | Custom instruction directories | `['.github/instructions']` |

## Instruction Priority

When multiple instruction sources exist (all provided to AI, conflicts resolved by priority):

1. **Personal instructions** (user-level) — highest priority
2. **Repository instructions** (`copilot-instructions.md` or `AGENTS.md`)
3. **Organization instructions** — lowest priority

## Field Summary Table

| Field | Type | Default | Required |
|---|---|---|---|
| `name` | `string` | file name | No |
| `description` | `string` | — | No |
| `applyTo` | `string` (glob) | — (manual only) | No |

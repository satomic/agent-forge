# Project-Wide Copilot Instructions

This workspace is a **Context Engineering Workflow Generator** — a self-referencing system that uses VSCode Copilot customization primitives (agents, prompts, instructions, skills) to help users design and create those same primitives.

## Workspace Structure

```
.github/
├── copilot-instructions.md          # This file — always-on project rules
├── agents/                          # Custom agent definitions (*.agent.md)
│   ├── copilot-architect.agent.md       # Orchestrator (only user-facing agent)
│   ├── artifact-builder.agent.md        # Worker: generates any artifact type
│   ├── workflow-designer.agent.md       # Worker: generates multi-agent workflows
│   └── customization-reviewer.agent.md  # Worker: validates all artifacts
├── prompts/                         # Reusable prompt files (*.prompt.md)
├── instructions/                    # File-based instruction rules (*.instructions.md)
└── skills/                          # Agent skills with SKILL.md + resources
    ├── vscode-customization/        # Full schema reference for all artifact types
    ├── subagent-patterns/           # Orchestration pattern templates
    ├── agent-template/              # Copyable .agent.md field reference (background)
    ├── instruction-template/        # Copyable .instructions.md field reference (background)
    ├── prompt-template/             # Copyable .prompt.md field reference (background)
    └── skill-template/              # Copyable SKILL.md field reference (background)

use-cases/                           # Generated output — one subfolder per use case
└── {topic-name}/                    # Auto-derived kebab-case name from user request
    ├── README.md                    # Artifact inventory + installation instructions
    ├── agents/                      # Generated agent definitions
    ├── prompts/                     # Generated prompt files
    ├── instructions/                # Generated instruction files
    └── skills/                      # Generated skill directories
```

## Architecture

- **One user-facing agent**: `@Copilot Architect` — interviews, designs, delegates
- **Two hidden workers**: `Artifact Builder` (agents, prompts, instructions, skills) and `Workflow Designer` (multi-agent orchestrations)
- **One hidden validator**: `Customization Reviewer` — schema compliance + cross-reference checks
- **Quality gates**: 4 instruction files auto-apply per artifact type via `applyTo` globs
- **Single source of truth**: `vscode-customization` skill holds the canonical schema for all artifact types

## File Naming Conventions

| Artifact       | Extension / File       | Location                        |
|----------------|------------------------|---------------------------------|
| Custom Agent   | `*.agent.md`           | `.github/agents/`               |
| Prompt File    | `*.prompt.md`          | `.github/prompts/`              |
| Instruction    | `*.instructions.md`    | `.github/instructions/`         |
| Skill          | `SKILL.md`             | `.github/skills/<skill-name>/`  |
| Always-on      | `copilot-instructions.md` | `.github/`                   |
| Generated Output | `use-cases/{topic}/` | `use-cases/`                   |

## Markdown Formatting Rules

- Use YAML frontmatter delimited by `---` for metadata headers
- Keep frontmatter fields in a consistent order: `name`, `description`, `argument-hint`, `tools`, `agents`, `model`, `user-invocable`, `disable-model-invocation`, `handoffs`, `target`
- Use Markdown headings (`#`, `##`, `###`) to structure body content
- Reference tools with `#tool:<tool-name>` syntax
- Reference workspace files with relative Markdown links: `[label]\(relative/path\)`
- Use fenced code blocks with language identifiers for examples

## Content Guidelines

- Write all content in English
- Keep instructions concise — prefer bullet points over paragraphs
- Include the reasoning behind rules so the AI makes better edge-case decisions
- Show preferred and avoided patterns with concrete code examples
- Focus on non-obvious rules that linters/formatters don't enforce
- When generating new artifacts, always include every available frontmatter field with inline documentation comments explaining each one

## Tool Reference Syntax

To reference agent tools in any `.md` file body, use:
- `#tool:<tool-name>` — e.g., `#tool:githubRepo`, `#tool:search`

## Variable Syntax (Prompt Files)

Available variables in `.prompt.md` files:
- `${workspaceFolder}` / `${workspaceFolderBasename}` — workspace path
- `${selection}` / `${selectedText}` — editor selection
- `${file}` / `${fileBasename}` / `${fileDirname}` / `${fileBasenameNoExtension}` — current file
- `${input:varName}` / `${input:varName:placeholder}` — user input variables

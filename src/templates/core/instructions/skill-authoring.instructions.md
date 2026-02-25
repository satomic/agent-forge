---
name: 'Skill Authoring Standards'
description: 'Conventions and rules for writing agent skill definitions (SKILL.md)'
applyTo: '**/SKILL.md'
---

# Agent Skill Authoring Standards

## What Are Agent Skills?

Agent Skills are folders of instructions, scripts, and resources that GitHub Copilot can load when relevant. Skills are an open standard (agentskills.io) that work across VS Code, GitHub Copilot CLI, and GitHub Copilot coding agent.

**Skills vs Instructions:**
- Skills: teach specialized capabilities and workflows; can include scripts, examples, resources; portable across tools; loaded on-demand
- Instructions: define coding standards and guidelines; VS Code-specific; always applied or glob-matched

## Directory Structure

```
.github/skills/
└── my-skill/                    # Directory name MUST match the `name` field
    ├── SKILL.md                 # Required — skill definition
    ├── scripts/                 # Optional — automation scripts
    │   └── setup.sh
    ├── examples/                # Optional — example files
    │   └── example-usage.ts
    └── resources/               # Optional — supporting docs, configs
        └── reference.md
```

## Frontmatter — All Available Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `name` | **Yes** | `string` | Unique identifier. Must be lowercase, hyphens for spaces. **Must match the parent directory name**. Max 64 characters. |
| `description` | **Yes** | `string` | What the skill does and when to use it. Be specific about capabilities AND use cases — this is how Copilot decides when to load the skill. Max 1024 characters. |
| `argument-hint` | No | `string` | Hint text shown in chat when the skill is invoked as a `/` slash command. E.g., `"[test file] [options]"`. |
| `user-invocable` | No | `boolean` | Whether the skill appears as a `/` slash command in chat (default: `true`). Set `false` to hide from menu while still allowing automatic loading. |
| `disable-model-invocation` | No | `boolean` | Whether to prevent the agent from automatically loading the skill based on relevance (default: `false`). Set `true` to require manual `/` invocation only. |

## Invocation Control Matrix

| `user-invocable` | `disable-model-invocation` | In `/` menu? | Auto-loaded? | Use case |
|---|---|---|---|---|
| `true` (default) | `false` (default) | Yes | Yes | General-purpose skills |
| `false` | `false` | No | Yes | Background knowledge the model loads when relevant |
| `true` | `true` | Yes | No | On-demand-only skills |
| `false` | `true` | No | No | Effectively disabled |

## Progressive Disclosure — How Skills Load

Skills use a 3-level loading system to minimize context consumption:

1. **Level 1 — Discovery**: Copilot reads `name` + `description` from frontmatter only (always available, lightweight)
2. **Level 2 — Instructions**: When the request matches the skill's description, Copilot loads the full `SKILL.md` body
3. **Level 3 — Resources**: Copilot accesses additional files (scripts, examples, docs) in the skill directory only as needed

This means you can install many skills without bloating context — only what's relevant loads.

## Body Content Rules

- Start with a clear statement of what the skill helps accomplish
- Describe when to use the skill (and when **not** to)
- Provide step-by-step procedures for the task
- Include examples of expected input and output
- Reference bundled files using relative paths: `[test template]\(./scripts/test-template.js\)`
- Use fenced code blocks with language identifiers for all code examples

## Naming Conventions

- Directory name: `kebab-case` (e.g., `webapp-testing`)
- `name` field: exact match of directory name (e.g., `webapp-testing`)
- `SKILL.md` is always uppercase

## Skill Locations

| Scope | Directories |
|---|---|
| Project (workspace) | `.github/skills/`, `.claude/skills/`, `.agents/skills/` |
| Personal (user) | `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/` |
| Extension-contributed | Registered via `chatSkills` in `package.json` |

Use `chat.agentSkillsLocations` setting to add custom skill directories.

## Anti-Patterns to Avoid

- Do NOT mismatch directory name and `name` field — the skill won't load
- Do NOT write vague descriptions — Copilot uses the description to decide relevance
- Do NOT put all instructions in a single giant skill — split by domain/task
- Do NOT skip examples — skills are most effective when they show concrete patterns
- Do NOT reference files outside the skill directory — skills should be self-contained and portable

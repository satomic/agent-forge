---
name: skill-template
description: >-
  Complete field reference and copyable template for creating agent skill
  definitions (SKILL.md). Covers every frontmatter field — name, description,
  argument-hint, user-invocable, disable-model-invocation — with directory
  structure, progressive disclosure levels, invocation control matrix, and
  skill location reference.
  USE FOR: creating SKILL.md files, skill frontmatter reference, skill
  directory structure, progressive disclosure, invocation control, skill
  locations, agent skills specification.
user-invocable: false
---

# Agent Skill Template — Complete Field Reference

Use this template as a starting point when creating new skills. Every available frontmatter field is shown with documentation.

## Template

Create a new directory `.github/skills/<skill-name>/` and add a `SKILL.md` file:

```markdown
---
# ============================================================================
# AGENT SKILL DEFINITION — SKILL.md
# ============================================================================
# Location: .github/skills/<skill-name>/SKILL.md (workspace)
#           or ~/.copilot/skills/<skill-name>/SKILL.md (user)
# Standard: https://agentskills.io/specification
# Docs: https://code.visualstudio.com/docs/copilot/customization/agent-skills
# ============================================================================

# name (string, REQUIRED)
# Unique identifier for the skill.
# MUST be lowercase with hyphens for spaces.
# MUST exactly match the parent directory name (case-sensitive).
# Maximum 64 characters.
name: my-skill-name

# description (string, REQUIRED)
# What the skill does AND when to use it.
# Be VERY specific — Copilot reads this to decide whether to load the skill.
# Include:
#   - What capabilities it provides
#   - What tasks/situations trigger it
#   - Keywords users might mention
# Maximum 1024 characters.
description: >-
  Detailed description of what this skill does and when to use it.
  Mention specific tasks, technologies, and use cases so Copilot
  can accurately match this skill to user requests.

# argument-hint (string, optional)
# Hint text shown in the chat input field when the skill is invoked
# as a '/' slash command. Guides users on what to provide.
# argument-hint: '[input type] [options]'

# user-invocable (boolean, optional, default: true)
# Whether the skill appears in the '/' slash command menu.
# Set to false to hide from the menu while still allowing
# automatic loading when the model detects relevance.
user-invocable: true

# disable-model-invocation (boolean, optional, default: false)
# Whether to prevent Copilot from automatically loading this skill
# based on relevance detection.
# Set to true to require manual '/' invocation only.
disable-model-invocation: false
---

# Skill Display Name

## Overview
What this skill helps you accomplish and why it exists.

## When to Use
- Specific use case 1
- Specific use case 2
- Specific use case 3

## When NOT to Use
- Anti-use case 1 — use [alternative] instead
- Anti-use case 2 — this is out of scope

## Instructions

### Step 1: Description
Detailed instructions for the first step.

### Step 2: Description
Detailed instructions for the second step.

## Examples

### Example 1: Basic Usage

**Input:**
```
User request example
```

**Expected Output:**
```language
// Generated code or response
output_example()
```

### Example 2: Advanced Usage

**Input:**
```
More complex user request
```

**Expected Output:**
```language
// More complex generated response
advanced_output_example()
```

## Resources

Reference bundled files using relative paths:
- Setup script: `./scripts/setup.sh` — automated environment setup
- Example config: `./examples/config.json` — sample configuration
- API reference: `./resources/api-reference.md` — detailed API docs
```

## Directory Structure

```
.github/skills/my-skill-name/        # Directory name = name field
├── SKILL.md                          # Required — skill definition
├── scripts/                          # Optional — automation scripts
│   ├── setup.sh                      # Environment setup
│   └── validate.sh                   # Validation checks
├── examples/                         # Optional — usage examples
│   ├── basic-example.ts              # Simple use case
│   └── advanced-example.ts           # Complex use case
└── resources/                        # Optional — reference documents
    ├── api-reference.md              # API documentation
    └── architecture.md               # Design decisions
```

## Progressive Disclosure Levels

Skills load in 3 stages to minimize context consumption:

| Level | What Loads | When | Impact |
|---|---|---|---|
| 1. Discovery | `name` + `description` only | Always (all skills) | ~100 tokens per skill |
| 2. Instructions | Full `SKILL.md` body | When request matches description | Variable |
| 3. Resources | Files in skill subdirectories | When explicitly referenced | On-demand |

**Design implication**: Put critical information in the SKILL.md body (Level 2). Put supplementary details in resource files (Level 3).

## Invocation Control Matrix

| `user-invocable` | `disable-model-invocation` | In `/` menu? | Auto-loads? | Best For |
|---|---|---|---|---|
| `true` (default) | `false` (default) | Yes | Yes | General-purpose skills |
| `false` | `false` | No | Yes | Background knowledge |
| `true` | `true` | Yes | No | On-demand tools |
| `false` | `true` | No | No | Effectively disabled |

## Skill Locations

| Scope | Directories |
|---|---|
| Project | `.github/skills/`, `.claude/skills/`, `.agents/skills/` |
| Personal | `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/` |
| Extensions | Via `chatSkills` in `package.json` |
| Custom | Configure via `chat.agentSkillsLocations` setting |

## Field Summary Table

| Field | Type | Default | Required |
|---|---|---|---|
| `name` | `string` | — | **Yes** |
| `description` | `string` | — | **Yes** |
| `argument-hint` | `string` | — | No |
| `user-invocable` | `boolean` | `true` | No |
| `disable-model-invocation` | `boolean` | `false` | No |

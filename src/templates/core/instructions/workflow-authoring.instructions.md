---
name: "Workflow Authoring"
description: "Standards for creating GitHub Agentic Workflow markdown files"
applyTo: "**/.github/workflows/*.md"
---

# Agentic Workflow Authoring Guidelines

## Workflow Structure

Agentic workflows are **markdown files** (not YAML) in `.github/workflows/`:

```yaml
---
on:
  issues:
    types: [opened, reopened]
permissions:
  contents: read
  issues: write
safe-outputs:
  add-comment:
  add-label:
engine: copilot
---

# Workflow Title

Natural language instructions for the AI agent...
```

## Required Frontmatter Fields

- `on:` — Trigger configuration (required)
- `permissions:` — GitHub token permissions (strongly recommended)

## Optional Frontmatter Fields

- `engine:` — AI engine (`copilot`, `claude`, `codex`)
- `safe-outputs:` — Controlled write operations back to GitHub
- `roles:` — Access control for slash commands

## Trigger Types

| Trigger | Events |
|---------|--------|
| `issues` | `opened`, `edited`, `labeled`, `reopened` |
| `pull_request` | `opened`, `synchronize`, `ready_for_review` |
| `schedule` | `cron: "0 9 * * 1-5"` |
| `slash_command` | `name: cmd`, `events: [issue_comment, pull_request_comment]` |
| `workflow_dispatch` | Manual trigger |

## Body (Natural Language Instructions)

- Write clear, specific instructions for the AI agent
- Include guardrails and boundaries
- Define what actions the agent should and should not take
- Reference context like issue content, PR diffs, or labels

## Anti-Patterns

- Never use `permissions: write-all` — always specify minimal permissions
- Never omit `safe-outputs:` for workflows that write to GitHub
- Never skip roles for ChatOps in public repositories
- Never write raw YAML workflow files — use markdown format with `gh aw compile`

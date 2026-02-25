---
name: workflow-template
description: "Starter templates for GitHub Agentic Workflows. USE FOR: creating workflows, issue triage, daily reports, ChatOps, scheduled automation, slash commands. DO NOT USE FOR: VS Code hooks, MCP servers, custom agents."
---

# Agentic Workflow Templates

## IssueOps — Auto-Triage New Issues

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

# Issue Triage

When a new issue is opened or reopened:

1. Read the issue title and body
2. Categorize by type: bug, feature, question, documentation
3. Assign priority: critical, high, medium, low
4. Add appropriate labels
5. If the description is unclear, add a comment asking for clarification
6. If a duplicate is found, link to the original issue

## Guardrails
- Do not close issues automatically
- Do not assign issues to specific people
- Only add labels that already exist in the repository
```

## DailyOps — Scheduled Activity Report

```yaml
---
on:
  schedule:
    - cron: "0 9 * * 1-5"
permissions:
  contents: read
  issues: write
  pull-requests: read
safe-outputs:
  create-issue:
    max: 1
engine: copilot
---

# Daily Activity Report

Generate a daily summary of repository activity and create an issue with the report.

1. Check commits from the last 24 hours
2. List opened and closed issues
3. List opened and merged pull requests
4. Highlight any failing CI checks
5. Create an issue titled "Daily Report — {date}" with the summary

## Format
Use markdown tables for structured data. Keep the report concise.
```

## ChatOps — Slash Command Handler

```yaml
---
on:
  slash_command:
    name: review
    events: [pull_request_comment]
permissions:
  contents: read
  pull-requests: write
safe-outputs:
  create-pull-request-review-comment:
    max: 10
  add-comment:
engine: copilot
---

# Code Review on Demand

When someone types `/review` in a PR comment, analyze the PR changes.

1. Read the PR diff
2. Check for security vulnerabilities
3. Check for performance issues
4. Check for code quality problems
5. Post specific review comments on relevant lines
6. Add a summary comment with overall assessment
```

## When to Use

- Automating repetitive repository maintenance tasks
- Building team collaboration tools with slash commands
- Generating scheduled reports and summaries
- Auto-triaging and organizing issues

## When NOT to Use

- For VS Code agent session automation — use hooks instead
- For coding standards enforcement — use instructions
- For interactive development tasks — use agents

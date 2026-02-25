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

Automatically triage new and reopened issues by analyzing their content and applying appropriate labels.

## Instructions

When a new issue is opened or reopened:

1. **Read** the issue title and body carefully
2. **Categorize** the issue type:
   - `bug` — Something isn't working as expected
   - `feature` — New functionality request
   - `question` — User needs help or clarification
   - `documentation` — Docs improvement or correction
   - `chore` — Maintenance, refactoring, or tooling
3. **Assess priority** based on impact and urgency:
   - `priority: critical` — System down, data loss, security vulnerability
   - `priority: high` — Major feature broken, no workaround
   - `priority: medium` — Feature broken but workaround exists
   - `priority: low` — Minor issue, cosmetic, or enhancement
4. **Add labels** for type and priority
5. **Check for duplicates** — Search existing issues for similar titles/descriptions. If a likely duplicate exists, add a comment linking to it with `Possible duplicate of #<number>`
6. **Request clarification** — If the issue description is vague or missing reproduction steps, add a comment asking for more details

## Guardrails

- Do NOT close issues automatically
- Do NOT assign issues to specific people
- Only add labels that already exist in the repository
- If unsure about categorization, default to `question` type and `priority: medium`
- Be polite and helpful in all comments

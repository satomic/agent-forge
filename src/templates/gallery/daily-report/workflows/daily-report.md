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

Generate a daily summary of repository activity and publish it as a GitHub issue.

## Instructions

Create a comprehensive daily report covering the last 24 hours:

1. **Commits** — List recent commits with author, message, and affected files count
2. **Pull Requests** — List opened, merged, and closed PRs with their status
3. **Issues** — List opened and closed issues with labels
4. **CI/CD** — Check for any failing workflow runs or checks
5. **Contributors** — Highlight active contributors in the period

## Report Format

Create an issue titled "📊 Daily Report — {YYYY-MM-DD}" with this structure:

```markdown
## Summary
- X commits by Y contributors
- Z pull requests (A opened, B merged, C closed)
- W issues (D opened, E closed)

## Commits
| Author | Message | Files |
|--------|---------|-------|
| ... | ... | ... |

## Pull Requests
| PR | Title | Status | Author |
|----|-------|--------|--------|
| ... | ... | ... | ... |

## Issues
| Issue | Title | Status | Labels |
|-------|-------|--------|--------|
| ... | ... | ... | ... |

## Action Items
- List any failing CI checks
- Highlight stale PRs (open > 7 days without review)
```

## Guardrails

- Create exactly 1 issue per run
- Do not modify any repository code or settings
- If no activity occurred, still create the report noting "No activity in the last 24 hours"
- Keep the report concise — summarize, don't exhaustively list

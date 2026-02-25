---
name: "refactoring-standards"
description: "Code quality standards that guide refactoring decisions"
applyTo: "**/*.{ts,js,tsx,jsx,py,go,java,rb,rs,cs}"
---

# Refactoring Standards

When refactoring code, follow these guidelines:

## Safety First

- Write or verify tests before refactoring
- Make one change at a time — no combined refactorings
- Preserve external behavior — callers shouldn't need to change
- If tests break, the refactoring was too aggressive — step back

## Code Quality Targets

- Functions: ≤40 lines, single responsibility
- Nesting: ≤3 levels deep — use early returns and extraction
- Parameters: ≤4 per function — use options objects for more
- Files: ≤300 lines — split when responsibilities diverge
- Duplication: extract when same logic appears 3+ times

## Naming

- Variables: describe content, not type (`userName` not `str1`)
- Functions: describe action (`calculateTotal` not `process`)
- Booleans: use `is/has/can/should` prefix
- Constants: UPPER_SNAKE for true constants, camelCase for config

## When NOT to Refactor

- In the middle of a feature — finish first, refactor second
- Without tests — write tests first
- Code that's about to be deleted
- Third-party code you don't own
- When the improvement is marginal and the risk is real

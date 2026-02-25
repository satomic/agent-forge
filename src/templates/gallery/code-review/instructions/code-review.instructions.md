---
name: "code-review-rules"
description: "Quality standards enforced during code reviews"
applyTo: "**/*.{ts,js,tsx,jsx,py,go,java,rb,rs,cs}"
---

# Code Review Standards

When reviewing or writing code, enforce these standards:

## Security

- Never hardcode secrets, API keys, or credentials — use environment variables
- Validate and sanitize all user input at system boundaries
- Use parameterized queries — never string-concatenate SQL
- Escape output in templates to prevent XSS
- Apply principle of least privilege for file/network access

## Error Handling

- Always handle errors explicitly — no empty catch blocks
- Return meaningful error messages without leaking internals
- Use proper HTTP status codes in API responses
- Log errors with context (what failed, relevant IDs, timestamp)

## Performance

- Avoid N+1 query patterns — use eager loading or batching
- Don't do synchronous I/O in hot paths
- Cache expensive computations when inputs are stable
- Set timeouts on external calls (HTTP, DB, file I/O)

## Patterns

- Functions should do one thing — if explaining requires "and", split it
- Prefer immutability — use `const`, `readonly`, frozen objects
- Name variables for what they represent, not their type
- Keep functions under 40 lines — extract helpers for complex logic

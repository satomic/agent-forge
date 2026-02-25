---
name: "testing-standards"
description: "Testing conventions and quality standards for test files"
applyTo: "**/*.{test,spec}.{ts,js,tsx,jsx,py}"
---

# Testing Standards

When writing or modifying test files, follow these conventions:

## Structure

- Group tests by feature or function using `describe` / test classes
- Use Arrange-Act-Assert pattern in every test
- Name tests as behavior descriptions: "should X when Y"
- Keep each test independent — no shared mutable state

## Quality

- One logical assertion per test — separate tests for separate behaviors
- Use realistic test data, not meaningless placeholders
- Clean up side effects in teardown (files, DB records, mocks)
- Prefer dependency injection over global mocks when possible

## Anti-Patterns to Avoid

- Testing implementation details (private methods, internal state)
- Flaky tests that depend on timing, network, or order
- Overly broad assertions (`toBeTruthy()` when exact value is known)
- Copy-paste test cases — use parameterized tests instead
- Ignoring error paths — every throw/reject needs a test

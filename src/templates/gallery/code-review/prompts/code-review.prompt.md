---
name: "code-review"
description: "Run a code review on the current file or selection"
agent: "Code Review Agent"
argument-hint: "Paste code or describe what to review"
---

Review the following code for security, quality, performance, and best practices.

${selection}

If no code is selected, review the current file: ${file}

Focus on:
1. Security vulnerabilities (injection, auth, secrets)
2. Code quality (error handling, patterns, readability)
3. Performance issues (queries, rendering, memory)
4. Best practice violations (naming, SOLID, DRY)

Organize findings by severity: Critical → Major → Minor → Info.

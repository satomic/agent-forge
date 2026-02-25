---
name: "refactoring"
description: "Analyze code for refactoring opportunities and get guided improvement suggestions"
agent: "Refactoring Coach"
argument-hint: "Select code or describe what to refactor"
---

Analyze the following code for refactoring opportunities:

${selection}

If no code is selected, analyze the current file: ${file}

For each opportunity found:
1. Name the code smell
2. Explain why it's a problem
3. Suggest a specific refactoring technique
4. Show before/after code examples
5. Estimate effort (small/medium/large)

Prioritize suggestions by impact on readability and maintainability.

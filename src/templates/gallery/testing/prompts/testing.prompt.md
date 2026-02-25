---
name: "testing"
description: "Generate tests for the current file or describe what to test"
agent: "Testing Agent"
argument-hint: "Describe what to test or select code"
---

Generate comprehensive tests for the following:

${selection}

If no code is selected, analyze the current file: ${file}

Follow these steps:
1. Identify all functions/methods and their contracts
2. Plan test cases: happy path, error cases, edge cases, boundary values
3. Write tests using the project's testing framework
4. Ensure tests are isolated and deterministic

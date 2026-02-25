---
name: "documentation"
description: "Generate documentation for the current project or file"
agent: "Documentation Agent"
argument-hint: "What to document (e.g., 'API endpoints', 'project README', 'this file')"
---

Generate documentation for: ${input:what:What to document}

Analyze the workspace to understand the project structure and conventions, then generate appropriate documentation.

If a specific file is selected, document that file's public API:
${file}

Follow these priorities:
1. Usage examples first
2. API reference second
3. Architecture/design decisions third
4. Keep it accurate — cross-reference against actual code

---
name: "onboarding"
description: "Ask questions about the codebase — get architecture overviews, pattern explanations, and code navigation help"
agent: "Onboarding Assistant"
argument-hint: "Ask anything about the codebase (e.g., 'How does auth work?', 'Where is the DB logic?')"
---

${input:question:What would you like to understand about this codebase?}

Analyze the workspace to answer this question. Follow these steps:

1. Search the codebase for relevant files and patterns
2. Read key files to understand the architecture
3. Explain clearly with file references and code examples
4. Offer to dive deeper into specific areas

Remember: the audience is a new team member. Use simple language and don't assume prior knowledge of this codebase.

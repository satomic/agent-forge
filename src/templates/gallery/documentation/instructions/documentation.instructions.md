---
name: "documentation-standards"
description: "Documentation quality standards for all documentation files"
applyTo: "**/*.md"
---

# Documentation Standards

When writing or editing documentation:

## Structure

- Start with a one-sentence summary — what is this and why does it exist
- Include a quick start or example within the first 20 lines
- Use heading hierarchy consistently (never skip levels)
- Keep paragraphs short — 3-4 sentences max

## Code Examples

- Every code example must be runnable (no pseudocode without marking it)
- Include language identifiers on all fenced code blocks
- Show expected output for non-obvious examples
- Use realistic variable names and data

## Accuracy

- Never document features that don't exist yet (unless marked as "planned")
- Cross-reference file paths against actual project structure
- Keep version-specific information marked with the version number
- Update docs when changing the code they describe

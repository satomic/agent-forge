---
name: 'validate-customizations'
description: 'Validate all Copilot customization artifacts for schema errors, broken cross-references, and best-practice violations'
argument-hint: 'optionally specify a file or directory to validate'
agent: agent
tools:
  - 'read'
  - 'search'
---

# Validate Copilot Customizations

Scan the workspace for all Copilot customization artifacts and validate them for correctness.

## What to Check

1. **Schema compliance** — verify all frontmatter fields are valid for each artifact type (agents, prompts, instructions, skills)
2. **Cross-reference integrity** — ensure all agent names in `agents` lists, `handoffs`, and prompt `agent` fields reference existing files
3. **Best-practice violations** — flag coding standards in agent bodies, missing `description` fields, incorrect `user-invocable` spelling, unrecognized tool names
4. **Naming consistency** — file names match `name` fields, skill directories match skill names

## Scope

${input:scope:Leave blank to scan everything, or enter a specific file/directory path}

## Expected Output

A structured validation report with:
- Summary (files scanned, issues found)
- Errors table (must fix)
- Warnings table (should fix)
- Passed checks list

For the complete schema to validate against, load the `vscode-customization` skill.

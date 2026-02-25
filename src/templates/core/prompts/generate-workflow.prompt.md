---
name: "generate-workflow"
description: "Generate an agentic workflow for GitHub Actions AI automation"
agent: "copilot-architect"
tools:
  - read
  - edit
  - search
---

# Generate Agentic Workflow

${input:purpose:Describe the workflow (e.g., "triage new issues automatically", "daily activity report", "code review on /review command")}

## Task

Generate a GitHub Agentic Workflow markdown file for the described purpose.

## Output

Create: `.github/workflows/{name}.md`

## Requirements

- Choose the appropriate trigger type (issues, schedule, slash_command, etc.)
- Set minimal permissions — only what the workflow needs
- Configure safe-outputs to limit write operations
- Write clear natural language instructions in the body
- Include guardrails and boundaries
- Use `engine: copilot` unless specified otherwise

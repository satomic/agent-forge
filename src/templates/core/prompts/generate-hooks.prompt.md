---
name: "generate-hooks"
description: "Generate agent hook configurations for lifecycle automation"
agent: "copilot-architect"
tools:
  - read
  - edit
  - search
---

# Generate Hooks

${input:purpose:Describe what you want to automate (e.g., "auto-format code after edits", "block dangerous terminal commands", "log all tool usage")}

## Task

Generate VS Code agent hook configurations for the described purpose.

## Output

Create these files:
1. `.github/hooks/{name}.json` — Hook event configuration
2. `.github/hooks/scripts/{name}-*.sh` — Companion shell scripts

## Requirements

- Choose the most appropriate hook events for the purpose
- Create companion scripts that handle JSON stdin/stdout properly
- Include timeout values for any scripts that might take time
- Validate and sanitize all input in scripts
- Follow security best practices (no hardcoded secrets, no eval on input)

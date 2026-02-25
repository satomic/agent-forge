---
name: hook-template
description: "Starter templates for VS Code agent hooks. USE FOR: creating hooks, hook examples, lifecycle automation, PostToolUse, PreToolUse, SessionStart. DO NOT USE FOR: GitHub Actions workflows, MCP servers, custom agents."
---

# Hook Templates

## PostToolUse — Auto-Format After Edits

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "npx prettier --write \"$TOOL_INPUT_FILE_PATH\"",
        "timeout": 15
      }
    ]
  }
}
```

## PreToolUse — Block Dangerous Commands

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": "./.github/hooks/scripts/block-dangerous.sh",
        "timeout": 10
      }
    ]
  }
}
```

**Companion script** (`.github/hooks/scripts/block-dangerous.sh`):
```bash
#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ "$TOOL_NAME" = "runTerminalCommand" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  if echo "$COMMAND" | grep -qE '(rm -rf /|DROP TABLE|DELETE FROM .* WHERE 1)'; then
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Destructive command blocked by security policy"}}'
    exit 0
  fi
fi
exit 0
```

## SessionStart — Inject Project Context

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "./.github/hooks/scripts/inject-context.sh"
      }
    ]
  }
}
```

## Stop — Generate Session Report

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "./.github/hooks/scripts/session-report.sh",
        "timeout": 30
      }
    ]
  }
}
```

## When to Use

- Enforce security policies that must always apply regardless of agent instructions
- Automate formatting, linting, or validation after every file edit
- Create audit trails for compliance requirements
- Inject project-specific context at session start

## When NOT to Use

- For one-time tasks — use prompt files instead
- For coding guidelines — use instruction files instead
- For complex logic — hooks should be simple and fast (< 30s)

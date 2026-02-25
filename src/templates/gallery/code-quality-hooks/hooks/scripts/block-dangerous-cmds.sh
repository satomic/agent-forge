#!/bin/bash
# PreToolUse hook: Block dangerous terminal commands
# Denies execution of destructive commands like rm -rf /, DROP TABLE, etc.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [ "$TOOL_NAME" = "runTerminalCommand" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

  # Check for dangerous patterns
  if echo "$COMMAND" | grep -qiE '(rm\s+-rf\s+/[^a-z]|DROP\s+TABLE|DROP\s+DATABASE|DELETE\s+FROM\s+\S+\s+WHERE\s+1|truncate\s+table|format\s+c:|del\s+/[sf]\s+)'; then
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Destructive command blocked by code-quality security policy. This command could cause data loss."}}'
    exit 0
  fi

  # Warn on sudo usage
  if echo "$COMMAND" | grep -qE '^\s*sudo\s+'; then
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"This command uses sudo. Please confirm you want to run with elevated permissions."}}'
    exit 0
  fi
fi

exit 0

#!/bin/bash
# Session audit hook: Logs agent session events for compliance.
# Appends structured log entries to .github/hooks/audit.log

INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hookEventName // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // "unknown"')
TIMESTAMP=$(echo "$INPUT" | jq -r '.timestamp // empty')

if [ -z "$TIMESTAMP" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
fi

LOG_DIR=".github/hooks"
LOG_FILE="$LOG_DIR/audit.log"
mkdir -p "$LOG_DIR"

case "$EVENT" in
  "SessionStart")
    echo "[${TIMESTAMP}] SESSION_START session=${SESSION_ID}" >> "$LOG_FILE"
    ;;
  "Stop")
    STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
    if [ "$STOP_ACTIVE" = "true" ]; then
      exit 0
    fi
    echo "[${TIMESTAMP}] SESSION_END session=${SESSION_ID}" >> "$LOG_FILE"
    ;;
  "PreToolUse")
    TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
    echo "[${TIMESTAMP}] TOOL_USE session=${SESSION_ID} tool=${TOOL_NAME}" >> "$LOG_FILE"
    ;;
esac

exit 0

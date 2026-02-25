#!/bin/bash
# PostToolUse hook: Auto-format files after edits
# Runs prettier on any file modified by the editFiles tool.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [ "$TOOL_NAME" = "editFiles" ] || [ "$TOOL_NAME" = "createFile" ]; then
  # Extract the file path from tool input
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.files[0] // empty')

  if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
    # Run prettier if available
    if command -v npx &> /dev/null; then
      npx prettier --write "$FILE_PATH" 2>/dev/null
      echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"File was auto-formatted with prettier.\"}}"
      exit 0
    fi
  fi
fi

exit 0

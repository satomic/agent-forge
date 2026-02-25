---
name: "Hook Authoring"
description: "Standards for creating VS Code agent hook configurations and companion scripts"
applyTo: "**/.github/hooks/**"
---

# Hook Authoring Guidelines

## Hook Configuration Files (`.github/hooks/*.json`)

### Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "type": "command",
        "command": "./scripts/hook-script.sh",
        "timeout": 30
      }
    ]
  }
}
```

### Valid Event Names

- `SessionStart` — New agent session begins
- `UserPromptSubmit` — User submits a prompt
- `PreToolUse` — Before tool invocation (can block/approve)
- `PostToolUse` — After tool completes (can inject context)
- `PreCompact` — Before context compaction
- `SubagentStart` — Subagent spawns
- `SubagentStop` — Subagent completes
- `Stop` — Agent session ends (can prevent stopping)

### Required Fields

- `type` must always be `"command"`
- `command` must be a valid shell command or script path
- Use relative paths from the repository root

## Companion Scripts

- Store scripts in `.github/hooks/scripts/`
- Scripts receive JSON on stdin and output JSON on stdout
- Exit code 0 = success, 2 = blocking error, other = warning
- Always validate input from stdin before processing
- Use `jq` or proper JSON parsing — never eval untrusted input

## Anti-Patterns

- Never hardcode secrets in hook scripts — use environment variables
- Never omit `timeout` for network-calling hooks — default is 30s
- Never skip the `stop_hook_active` check in Stop hooks — prevents infinite loops
- Never use `eval` on stdin input — prevents injection attacks

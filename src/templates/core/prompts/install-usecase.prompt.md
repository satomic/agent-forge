---
name: "install-usecase"
description: "Install a generated use case from use-cases/ into .github/ for active use"
agent: "agent"
argument-hint: "Name of the use case to install (e.g., 'api-rate-limiter')"
---

# Install Use Case

Install the generated use case **${input:name:Use case name from use-cases/ directory}** into the active `.github/` directory.

## Steps

1. Check that `use-cases/${input:name}/` exists
2. Copy the following files into `.github/`:
   - `agents/*.agent.md` → `.github/agents/`
   - `prompts/*.prompt.md` → `.github/prompts/`
   - `instructions/*.instructions.md` → `.github/instructions/`
   - `skills/*/SKILL.md` → `.github/skills/`
3. Verify no naming conflicts with existing files
4. Report what was installed

If there are naming conflicts, rename the new files with a prefix and notify the user.

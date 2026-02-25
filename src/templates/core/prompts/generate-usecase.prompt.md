---
name: "generate-usecase"
description: "Generate a new custom use case — creates a complete set of agent, prompt, instruction, and skill files"
agent: "Copilot Architect"
argument-hint: "Describe the use case you want to create (e.g., 'security vulnerability scanner for Python')"
---

# Generate Custom Use Case

Generate a complete set of GitHub Copilot customization files for the following use case:

**${input:description:Describe the use case you want to create}**

## Instructions

1. **Analyze** the description to understand the use case domain
2. **Design** the right combination of artifacts:
   - An **agent** with focused responsibilities and clear process
   - A **prompt** as the user-facing entry point (slash command)
   - An **instruction** with quality rules auto-applied to relevant files
   - A **skill** with domain knowledge the agent can reference
3. **Generate** all 4 files plus a README in `use-cases/{topic-name}/`
4. **Validate** the generated files for schema compliance

Follow the existing AGENT-FORGE artifact patterns — check `.github/skills/` for templates and `.github/instructions/` for quality gates.

The generated use case should be self-contained and installable by copying into `.github/`.

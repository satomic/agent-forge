---
name: 'scaffold-all'
description: 'Generate a complete set of customization files (agent + prompt + instruction + skill) for a given topic or role'
argument-hint: 'topic or role name (e.g., "security reviewer", "API scaffolder")'
agent: Copilot Architect
tools:
  - 'agent'
  - 'read'
  - 'edit'
  - 'search'
---

# Scaffold Complete Customization Set

Generate a **complete set** of VSCode Copilot customization artifacts for the given topic/role. Create ALL of the following:

## Artifacts to Generate

All artifacts are saved under `use-cases/${input:topic:topic-name}/` — a folder structure that mirrors `.github/` for easy copying.

1. **Instruction file** (`use-cases/${input:topic}/instructions/${input:topic}.instructions.md`)
   - Coding standards and conventions specific to this topic
   - Appropriate `applyTo` glob pattern

2. **Skill directory** (`use-cases/${input:topic}/skills/${input:topic}/SKILL.md`)
   - Domain knowledge and reference material
   - Optional example files

3. **Custom agent** (`use-cases/${input:topic}/agents/${input:topic}.agent.md`)
   - Specialized AI persona for this topic
   - References the instruction file and skill
   - Appropriate tool selection

4. **Prompt file** (`use-cases/${input:topic}/prompts/${input:topic}.prompt.md`)
   - Quick `/` command entry point
   - References the custom agent
   - Uses input variables for flexibility

5. **README** (`use-cases/${input:topic}/README.md`)
   - Summarizes all generated artifacts with descriptions
   - Installation instructions: "Copy the contents of this folder into your project's `.github/` directory"

## Requirements

- All artifacts must cross-reference each other appropriately (Markdown links for instructions, agent references, skill loading)
- All frontmatter fields must be populated with inline documentation
- Follow the conventions defined in `.github/instructions/`
- The generated system should be immediately usable after creation

## Topic/Role

${input:topic:Enter the topic or role name (e.g., "security-reviewer", "api-scaffolder")}

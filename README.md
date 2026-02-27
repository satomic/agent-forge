<p align="center">
  <a href="https://github.com/jiratouchmhp/agent-forge">
    <img src="assets/logo-banner.svg" alt="AGENT-FORGE — Context Engineering Toolkit for GitHub Copilot" width="800"/>
  </a>
</p>

<p align="center">
  <strong>Context Engineering Toolkit for GitHub Copilot.</strong><br/>
  Generate agents, prompts, instructions, skills, hooks, MCP servers, and agentic workflows — powered by a multi-agent AI pipeline.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agent-forge-copilot/cli"><img src="https://img.shields.io/npm/v/@agent-forge-copilot/cli?color=orange" alt="npm version"/></a>
  <a href="https://github.com/jiratouchmhp/agent-forge/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jiratouchmhp/agent-forge" alt="license"/></a>
</p>

---

## What is AGENT-FORGE?

AGENT-FORGE is a Context Engineering Toolkit that sets up GitHub Copilot for your project using a multi-agent AI orchestration system. Instead of manually authoring `.github/` customization files, you describe what you need and AGENT-FORGE plans, generates, validates, and auto-fixes everything through a pipeline of specialized writer agents.

- **Multi-agent AI generation** — a planner decomposes your project into domains, then 7 specialized writer agents generate tailored artifacts in parallel
- **Greenfield & brownfield** — works with new projects (from a description) or existing codebases (scans your code first)
- **Smart tech stack detection** — identifies frameworks, libraries, and patterns from your project files
- **Post-generation validation** — checks YAML frontmatter, tool names, glob patterns, and content quality with auto-fix

---

## Quick Start

```bash
npx @agent-forge-copilot/cli init
```

That's it. The CLI walks you through everything interactively.

> **Want to install globally?** Run `npm install -g @agent-forge-copilot/cli`, then use `forge init` instead.

### What happens when you run it

The CLI guides you through four steps:

**1. What's your starting point?**

```
? How would you like to start?
❯ New project        — describe what to build, AI generates Copilot files
  Existing project   — scans your code, generates files that fit your stack
  Gallery            — pick from 11 pre-built templates
```

**2. What do you want to generate?**

```
? What would you like to generate?
❯ Auto-detect     — scans your project, generates everything (recommended)
  Custom          — describe your use case, AI creates tailored files
  Pick & choose   — select specific artifact types
  MCP servers     — add tool servers to .vscode/mcp.json
  Hooks           — add lifecycle automation (format, lint, security)
  Workflows       — create GitHub Actions with AI automation
```

**3. Describe your use case**

```
? Describe what you want to automate:
> API rate limiter with per-tenant quotas
```

**4. Pick your speed**

```
? Generation speed:
❯ Standard  — single session, ~2 PRU (slower)
  Turbo     — parallel sessions, ~N PRU (fastest)
```

Done. Your files are generated, validated, and ready in `.github/`.

### What gets created

```
.github/
├── agents/          # AI personas — define what Copilot can do
├── prompts/         # Slash commands — shortcuts you type in chat
├── instructions/    # Rules — automatically applied to matching files
├── skills/          # Knowledge packs — domain info agents can reference
├── hooks/           # Automation — scripts triggered by agent events
├── workflows/       # GitHub Actions with AI automation
└── copilot-instructions.md   # Project-wide Copilot config
.vscode/
└── mcp.json         # External tool servers (if selected)
```

---

## Gallery: Pre-Built Templates

Instead of generating from scratch, you can pick from **11 ready-to-use templates** during `forge init`:

**Agent Bundles** (each includes an agent + prompt + instructions + skill):
- **Code Review** — reviews PRs for quality, security, and best practices
- **Testing** — TDD pipeline, writes tests, identifies coverage gaps
- **Documentation** — auto-generates docs from code structure
- **Deployment** — pre-deploy validation for config, env vars, dependencies
- **Onboarding** — helps new devs understand the codebase
- **Refactoring** — identifies code smells, guides safe improvements

**Hooks:**
- **Code Quality** — auto-format code after edits, block dangerous commands
- **Session Logging** — audit trail for compliance

**Workflows:**
- **Issue Triage** — auto-label, prioritize, and assign issues with AI
- **Daily Report** — scheduled summary of repository activity

**MCP Config:**
- **Dev Tools** — starter config with GitHub and Playwright tool servers

Install specific templates without the interactive flow:

```bash
forge init --mode gallery --use-cases code-review,testing
```

---

## Common Tasks

### Add code review to an existing project

```bash
forge init --mode gallery --use-cases code-review
```

Installs 4 files: a code review agent, a prompt, instructions, and a skill.

### Generate custom agents with AI

```bash
forge generate "Security vulnerability scanner"
```

Describe what you need and AGENT-FORGE plans the agent decomposition, generates all artifacts via 7 specialized writer agents, validates the output, and auto-fixes any issues.

### Generate with turbo mode

```bash
forge generate "API rate limiter" --speed turbo
```

Turbo mode runs all writer agents in parallel for faster generation (uses more PRUs).

### Generate only specific artifact types

```bash
forge generate "CI/CD automation" --mode hooks
forge generate "Dev tooling" --mode mcp-server
forge generate "Testing tools" --mode on-demand --types agent,hook
```

### Check your setup

```bash
forge check
```

Verifies that Node.js, VS Code, Git, GitHub CLI, Copilot CLI, and Docker are available.

### See what's installed

```bash
forge list
```

Shows which Copilot customization files exist in your project and which gallery templates are available.

### Validate your config files

```bash
forge validate
```

Checks your `.github/` customization files for schema errors and quality issues. Add `--fix` to auto-fix problems using AI.

---

## Prerequisites

**Required:**
- **Node.js 18+**
- **VS Code** with the GitHub Copilot extension (and `chat.agent.enabled: true` in settings)
- **[GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)** — powers the multi-agent generation pipeline (`npm install -g @github/copilot`)

**Optional:**
- **Git** — for version control
- **GitHub CLI** (`gh`) — needed for agentic workflows
- **Docker** — needed by some MCP servers

Run `forge check` to verify everything in one step.

---

## How It Works

AGENT-FORGE uses a **plan-then-execute** architecture powered by GitHub Copilot CLI. Depending on your starting point, it runs one of two pipelines:

### Greenfield (new projects)

You provide a description. A planner agent analyzes it, extracts the tech stack, decomposes it into domains (frontend, backend, AI, etc.), and writes a `forge-plan.json`. An orchestrator then delegates to 7 specialized writer agents.

### Brownfield (existing projects)

A planner agent scans your actual codebase — `package.json`, source files, directory structure, existing `.github/` config — and creates a plan aligned to your real patterns. Writers are instructed to read your source files and codify existing conventions, not generate generic templates.

### Generation pipeline

```
forge init / generate
        │
        ▼
   ┌─────────┐     Analyzes description or scans codebase
   │ Planner  │──▶  Extracts tech stack, decomposes domains
   └────┬────┘     Outputs forge-plan.json
        │
        ▼
   ┌──────────────┐
   │ Orchestrator  │──▶  Reads plan, delegates to writers
   └──────┬───────┘
          │
          ├──▶ Agent Writer       → *.agent.md
          ├──▶ Instruction Writer → *.instructions.md
          ├──▶ Skill Writer       → SKILL.md
          ├──▶ Prompt Writer      → *.prompt.md
          ├──▶ Hook Writer        → hooks/*.json + scripts
          ├──▶ MCP Writer         → .vscode/mcp.json
          └──▶ Workflow Writer    → workflows/*.md
                                        │
                                        ▼
                                  Validate & Auto-fix
                                        │
                                        ▼
                                  Install to .github/
```

### Speed modes

| Mode | How it works | Cost |
|------|-------------|------|
| **Standard** | Single Copilot CLI session runs all writers sequentially | ~2 PRU |
| **Turbo** | Parallel Copilot CLI sessions, one per writer agent | ~N+2 PRU |

### Smart merging

When generating into a project that already has `.github/` files, AGENT-FORGE detects files it previously generated (via `<!-- Generated by AGENT-FORGE -->` markers) and only overwrites those. User-created files are preserved. Use `--force` to override.

---

## CLI Reference

| Command | What it does |
|---------|-------------|
| `forge init` | Interactive setup wizard |
| `forge generate <description>` | Generate Copilot files from a description |
| `forge list` | Show installed and available use cases |
| `forge validate [scope]` | Check config files for errors |
| `forge check` | Verify prerequisites |

<details>
<summary><strong>forge init — all options</strong></summary>

| Flag | Description |
|------|-------------|
| `--mode <mode>` | Skip mode prompt — `new`, `existing`, or `gallery` |
| `--description <text>` | Use case description (skip prompt) |
| `--model <model>` | AI model to use (skip prompt) |
| `--generation-mode <mode>` | `discovery`, `full`, `on-demand`, `mcp-server`, `hooks`, `agentic-workflow` |
| `--types <types>` | Comma-separated artifact types for on-demand mode (e.g., `agent,hook,mcp-server`) |
| `--speed <speed>` | `standard` (single session, ~2 PRU) or `turbo` (parallel, faster) |
| `--use-cases <ids>` | Comma-separated gallery IDs (skip prompt) |
| `--force` | Overwrite existing files |

```bash
# Fully interactive
forge init

# Install gallery templates non-interactively
forge init --mode gallery --use-cases code-review,testing

# Add to existing project with a description
forge init --mode existing --description "CI/CD pipeline guardian"

# New project with a specific model and turbo speed
forge init --mode new --description "API rate limiter" --model claude-sonnet-4.6 --speed turbo

# Generate only hooks for an existing project
forge init --mode existing --generation-mode hooks

# Pick specific artifact types
forge init --mode new --generation-mode on-demand --types agent,hook,mcp-server
```

</details>

<details>
<summary><strong>forge generate — all options</strong></summary>

| Flag | Description |
|------|-------------|
| `--model <model>` | AI model to use (skip prompt) |
| `--mode <mode>` | `discovery`, `full`, `on-demand`, `mcp-server`, `hooks`, `agentic-workflow` |
| `--types <types>` | Comma-separated artifact types for on-demand mode |
| `--speed <speed>` | `standard` (single session, ~2 PRU) or `turbo` (parallel, faster) |

```bash
forge generate "API rate limiter with per-tenant limits"
forge generate "Security vulnerability scanner" --model claude-opus-4.6
forge generate "CI/CD automation" --mode hooks
forge generate "Dev tooling" --mode mcp-server
forge generate "Issue management" --mode agentic-workflow
forge generate "Testing tools" --mode on-demand --types agent,hook,mcp-server
forge generate "Full-stack app" --speed turbo
```

</details>

<details>
<summary><strong>forge validate — all options</strong></summary>

| Flag | Description |
|------|-------------|
| `--fix` | Auto-fix issues using AI (GitHub Copilot CLI) |
| `--no-fix` | Skip the interactive fix prompt |
| `--model <model>` | Model to use for AI-powered fixes |

```bash
forge validate                    # Validate all .github/ files
forge validate agents             # Validate only agents
forge validate --fix              # Validate and auto-fix issues
forge validate --fix --model claude-opus-4.6  # Fix with a specific model
```

</details>

<details>
<summary><strong>Model selection</strong></summary>

When using AI generation, you can choose a model interactively or pass `--model`:

| Value | Description | Premium |
|-------|-------------|---------|
| `claude-sonnet-4.6` | Fastest — best speed/quality tradeoff **(default)** | 1x |
| `claude-sonnet-4.5` | Fast — higher quality reasoning | 1x |
| `gpt-4.1` | Fast — efficient code generation | 1x |
| `gpt-5.2-codex` | Balanced — strong code generation | 1x |
| `gemini-3-pro-preview` | Strong reasoning — large context window | 2x |
| `claude-opus-4.6` | Highest quality — deep reasoning | 5x |

</details>

<details>
<summary><strong>Artifact types reference</strong></summary>

| Type | File Pattern | Purpose |
|------|-------------|---------|
| Agent | `*.agent.md` | AI persona with tools, responsibilities, and process |
| Prompt | `*.prompt.md` | User-facing slash command that routes to an agent |
| Instruction | `*.instructions.md` | Quality rules auto-applied to matching files |
| Skill | `SKILL.md` | Domain knowledge loaded on-demand by agents |
| Hook | `.github/hooks/*.json` | Lifecycle automation — scripts triggered on agent events |
| MCP Server | `.vscode/mcp.json` | External tool servers for AI-powered development |
| Agentic Workflow | `.github/workflows/*.md` | GitHub Actions with AI automation |

</details>

---

## Contributing

```bash
git clone https://github.com/jiratouchmhp/agent-forge.git
cd agent-forge
npm install
npm run build
node dist/index.js init --help
```

<details>
<summary><strong>Project structure</strong></summary>

```
src/
├── index.ts                # CLI entry point (commander)
├── types.ts                # Shared TypeScript types
├── commands/               # CLI command handlers
│   ├── init.ts             # forge init — interactive wizard
│   ├── generate.ts         # forge generate — direct AI generation
│   ├── list.ts             # forge list — show installed & gallery
│   ├── validate.ts         # forge validate — quality checks
│   └── check.ts            # forge check — prerequisites
├── lib/                    # Core libraries
│   ├── copilot-cli.ts      # Copilot CLI orchestration & parallel execution
│   ├── detector.ts         # Workspace tech stack detection
│   ├── domain-registry.ts  # Domain pattern matching & decomposition
│   ├── gallery.ts          # Built-in template registry (11 templates)
│   ├── merger.ts           # Smart merge for existing .github/
│   ├── prompt-builder.ts   # Prompt construction with reference examples
│   ├── scaffold.ts         # Workspace initialization & file installation
│   └── validator.ts        # YAML validation, tool name checks & auto-fix
├── cli/                    # Multi-agent orchestration templates
│   ├── copilot-instructions.md
│   ├── forge-greenfield-planner.agent.md
│   ├── forge-greenfield-orchestrator.agent.md
│   ├── forge-brownfield-planner.agent.md
│   ├── forge-brownfield-orchestrator.agent.md
│   ├── forge-agent-writer.agent.md
│   ├── forge-instruction-writer.agent.md
│   ├── forge-skill-writer.agent.md
│   ├── forge-prompt-writer.agent.md
│   ├── forge-hook-writer.agent.md
│   ├── forge-mcp-writer.agent.md
│   └── forge-workflow-writer.agent.md
└── template/               # Gallery template files
    ├── Agentic-Work-flow/
    ├── Hooks/
    ├── MCP/
    └── VSCode/
```

</details>

## License

MIT

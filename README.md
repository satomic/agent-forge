<p align="center">
  <a href="https://github.com/jiratouchmhp/agent-forge">
    <img src="assets/logo-banner.svg" alt="AGENT-FORGE — Context Engineering Toolkit for GitHub Copilot" width="800"/>
  </a>
</p>

<p align="center">
  <strong>Set up GitHub Copilot for your project in one command.</strong><br/>
  Generate agents, prompts, instructions, skills, hooks, MCP servers, and workflows — interactively.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agent-forge-copilot/cli"><img src="https://img.shields.io/npm/v/@agent-forge-copilot/cli?color=orange" alt="npm version"/></a>
  <a href="https://github.com/jiratouchmhp/agent-forge/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jiratouchmhp/agent-forge" alt="license"/></a>
</p>

---

## What is AGENT-FORGE?

AGENT-FORGE is a CLI tool that helps you configure GitHub Copilot for your project. Instead of manually creating `.github/` customization files, you run one command and the CLI handles everything:

- **Pick from 11 ready-to-use templates** — code review, testing, documentation, deployment, and more
- **Generate custom agents with AI** — describe what you need, and AGENT-FORGE creates tailored Copilot files
- **Auto-detect your tech stack** — scans your project and generates configurations that match your setup
- **Validate your config** — checks that your Copilot customization files are correct

---

## Quick Start

```bash
npx @agent-forge-copilot/cli init
```

That's it. The CLI walks you through everything interactively.

> **Want to install globally?** Run `npm install -g @agent-forge-copilot/cli`, then use `forge init` instead.

### What happens when you run it

The CLI asks you three things:

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

**3. Describe your use case** (for AI generation)

```
? Describe what you want to automate:
> API rate limiter with per-tenant quotas
```

Done. Your files are generated in `.github/`.

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

Describe what you need and AGENT-FORGE creates tailored Copilot files. If the [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) is installed, it uses a multi-agent orchestration pipeline (9 specialized writer agents) to produce high-quality output. Without it, you get solid static templates.

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

Checks your `.github/` customization files for schema errors and quality issues.

---

## Prerequisites

**Required:**
- **Node.js 18+**
- **VS Code** with the GitHub Copilot extension (and `chat.agent.enabled: true` in settings)

**Recommended:**
- **GitHub Copilot CLI** — enables AI-powered generation instead of static templates (`npm install -g @github/copilot`)
- **Git** — for version control

**Optional:**
- **GitHub CLI** (`gh`) — needed for agentic workflows
- **Docker** — needed by some MCP servers

Run `forge check` to verify everything in one step.

---

## How It Works

AGENT-FORGE has two generation paths:

**With GitHub Copilot CLI installed** — the CLI creates a temporary workspace, launches a multi-agent orchestration system (planner → orchestrator → 9 specialized writer agents), and generates AI-tailored artifacts based on your description. The results are validated, auto-fixed, and copied into your project.

**Without Copilot CLI** (or with `--static`) — the CLI generates files from built-in TypeScript templates. Same artifact types, but generic content instead of AI-tailored output.

```
forge init / generate
        │
        ├── Copilot CLI found? ──▶ AI Generation
        │                          • Plans what to create
        │                          • 9 writer agents generate files
        │                          • Auto-validates & fixes
        │
        └── No Copilot CLI ─────▶ Static Generation
                                   • Built-in templates
                                   • Direct file generation
```

---

## CLI Reference

| Command | What it does |
|---------|-------------|
| `forge init` | Interactive setup wizard |
| `forge generate <description>` | Generate Copilot files from a description |
| `forge list` | Show installed and available use cases |
| `forge validate` | Check config files for errors |
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
| `--use-cases <ids>` | Comma-separated gallery IDs (skip prompt) |
| `--force` | Overwrite existing files |

```bash
# Fully interactive
forge init

# Install gallery templates non-interactively
forge init --mode gallery --use-cases code-review,testing

# Add to existing project with a description
forge init --mode existing --description "CI/CD pipeline guardian"

# New project with a specific model
forge init --mode new --description "API rate limiter" --model claude-sonnet-4.6

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
| `--static` | Force static template generation (skip Copilot CLI) |

```bash
forge generate "API rate limiter with per-tenant limits"
forge generate "Security vulnerability scanner" --model claude-opus-4.6
forge generate "Database migration validator" --static
forge generate "CI/CD automation" --mode hooks
forge generate "Dev tooling" --mode mcp-server
forge generate "Issue management" --mode agentic-workflow
forge generate "Testing tools" --mode on-demand --types agent,hook,mcp-server
```

</details>

<details>
<summary><strong>Model selection</strong></summary>

When using AI generation, you can choose a model interactively or pass `--model`:

| Value | Description |
|-------|-------------|
| `claude-sonnet-4.6` | Fastest — best speed/quality tradeoff **(default)** |
| `claude-sonnet-4.5` | Fast — higher quality reasoning |
| `gpt-5.2-codex` | Balanced — strong code generation |
| `claude-opus-4.6` | Slowest — highest quality output |

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
├── index.ts              # CLI entry point (commander)
├── commands/             # CLI command handlers
│   ├── init.ts           # forge init
│   ├── generate.ts       # forge generate
│   ├── list.ts           # forge list
│   ├── validate.ts       # forge validate
│   └── check.ts          # forge check
├── lib/                  # Core libraries
│   ├── scaffold.ts       # Template rendering & file generation
│   ├── gallery.ts        # Built-in use case registry (11 use cases)
│   ├── copilot-cli.ts    # Copilot CLI integration & multi-agent orchestration
│   ├── merger.ts         # Smart merge for existing .github/
│   ├── detector.ts       # Workspace tech stack detection
│   └── validator.ts      # YAML schema validation
├── templates/
│   ├── cli/              # Multi-agent orchestration templates (9 writer agents)
│   └── gallery/          # Pre-built use case templates (11 use cases)
└── types.ts              # Shared TypeScript types
```

</details>

## License

MIT

<p align="center">
  <a href="https://github.com/jiratouchmhp/agent-forge">
    <img src="assets/logo-banner.svg" alt="AGENT-FORGE — Context Engineering Toolkit for GitHub Copilot" width="800"/>
  </a>
</p>

<p align="center">
  Generate, manage, and validate GitHub Copilot customization files — agents, prompts, instructions, skills, hooks, MCP servers, and agentic workflows — with an interactive CLI and built-in use case gallery.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agent-forge-copilot/cli"><img src="https://img.shields.io/npm/v/@agent-forge-copilot/cli?color=orange" alt="npm version"/></a>
  <a href="https://github.com/jiratouchmhp/agent-forge/blob/main/LICENSE"><img src="https://img.shields.io/github/license/jiratouchmhp/agent-forge" alt="license"/></a>
</p>

<p align="center">
  <strong>One command to set up. Copilot to extend.</strong>
</p>

## Get Started

### Install & Initialize

```bash
# One-shot (no install needed)
npx @agent-forge-copilot/cli init

# Or install globally
npm install -g @agent-forge-copilot/cli
forge init
```

### What Happens when you run `forge init`:

- **New project** — prompts for a description of what to automate, then generates custom Copilot artifacts using AI.
- **Existing project** — scans your workspace (detects tech stack, project type, existing `.github/` files), then generates tailored customizations.
- **Gallery** — pick from **11 pre-built use case templates**:

```
? Pick use cases to install: (space to select)
◉ Code Review Agent — reviews PRs for quality & security
◯ Testing Workflow — TDD agent pipeline
◉ Documentation Generator — auto-generates docs from code
◯ Deployment Guardian — pre-deploy validation
◯ Onboarding Assistant — helps new devs understand codebase
◯ Refactoring Coach — suggests and validates refactors
◯ Code Quality Hooks — auto-format & block dangerous commands
◯ Session Logging Hooks — audit trail for compliance
◯ Issue Triage Workflow — auto-label & assign issues with AI
◯ Daily Activity Report — scheduled repository summary
◯ Dev Tools MCP Servers — GitHub & Playwright tool servers

✓ Code Review Agent (4 files)
✓ Documentation Generator (4 files)

✓ AGENT-FORGE initialized!
```

After init, AGENT-FORGE also prompts you to select a **generation mode** — choosing what types of artifacts to create:

| Mode | Description |
|------|-------------|
| **Auto-detect** | Scans your project and generates everything automatically *(recommended for existing projects)* |
| **Custom** | Describe your use case — generates agents + instructions + prompts + skills *(recommended for new projects)* |
| **Pick & choose** | Select which artifact types to generate individually |
| **MCP servers** | Add tool servers to `.vscode/mcp.json` |
| **Hooks** | Add lifecycle automation (format, lint, security) |
| **Workflows** | Create GitHub Actions with AI automation |

> **AI vs. Static generation:** If the [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) (`copilot`) is installed, `init` and `generate` use it with multi-agent orchestration to produce AI-generated artifacts tailored to your description. Without it, AGENT-FORGE falls back to pre-built static templates.

### Open Copilot & Go

```
@Copilot Architect I need a code review workflow for my Python Django project
```

The Copilot Architect will analyze your workspace, interview you about your needs, and design the right artifact mix — then hand off creation to specialized worker agents.

## CLI Reference

| Command | Description |
|---------|-------------|
| `forge init` | Interactive setup — 3 modes: new project, existing project, or gallery |
| `forge generate <description>` | Generate customization files directly into `.github/` |
| `forge list` | Show installed and available use cases |
| `forge validate [scope]` | Validate customization files for schema and quality |
| `forge check` | Verify prerequisites (Node.js, VS Code, Git, GitHub CLI, Copilot CLI, Docker) |

### Init Options

| Flag | Description |
|------|-------------|
| `--mode <mode>` | Skip mode prompt — `new`, `existing`, or `gallery` |
| `--description <text>` | Use case description (skip prompt) |
| `--model <model>` | AI model to use (skip prompt) |
| `--generation-mode <mode>` | Generation mode — `discovery`, `full`, `on-demand`, `mcp-server`, `hooks`, `agentic-workflow` |
| `--types <types>` | Comma-separated artifact types for on-demand mode (e.g., `agent,hook,mcp-server`) |
| `--use-cases <ids>` | Comma-separated gallery IDs (skip prompt) |
| `--force` | Overwrite existing files |

```bash
forge init                                        # Fully interactive
forge init --mode gallery --use-cases code-review,testing  # Non-interactive gallery clone
forge init --mode existing --description "CI/CD pipeline guardian"  # Add to current project
forge init --mode new --description "API rate limiter" --model claude-sonnet-4.6
forge init --mode existing --generation-mode hooks  # Generate only hooks for current project
forge init --mode new --generation-mode on-demand --types agent,hook,mcp-server
```

### Generate Options

| Flag | Description |
|------|-------------|
| `--model <model>` | AI model to use (skip prompt) |
| `--mode <mode>` | Generation mode — `discovery`, `full`, `on-demand`, `mcp-server`, `hooks`, `agentic-workflow` |
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

### Model Selection

When using AI generation, you can choose a model interactively or pass `--model`:

| Value | Description |
|-------|-------------|
| `claude-sonnet-4.6` | Fastest — best speed/quality tradeoff **(default)** |
| `claude-sonnet-4.5` | Fast — higher quality reasoning |
| `gpt-5.2-codex` | Balanced — strong code generation |
| `claude-opus-4.6` | Slowest — highest quality output |

## What Gets Installed

### Core (always installed)

```
.github/
├── copilot-instructions.md               # Always-on project rules
├── agents/
│   ├── copilot-architect.agent.md        # Orchestrator (user-facing)
│   ├── artifact-builder.agent.md         # Worker: generates artifacts
│   ├── workflow-designer.agent.md        # Worker: multi-agent workflows
│   └── customization-reviewer.agent.md   # Worker: validates everything
├── prompts/
│   ├── design-workflow.prompt.md         # /design-workflow
│   ├── scaffold-all.prompt.md            # /scaffold-all
│   ├── generate-usecase.prompt.md        # /generate-usecase
│   ├── generate-hooks.prompt.md          # /generate-hooks
│   ├── generate-mcp.prompt.md            # /generate-mcp
│   ├── generate-workflow.prompt.md       # /generate-workflow
│   ├── install-usecase.prompt.md         # /install-usecase
│   ├── list-customizations.prompt.md     # /list-customizations
│   └── validate-customizations.prompt.md # /validate-customizations
├── instructions/                         # Auto-applied quality gates
│   ├── agent-authoring.instructions.md
│   ├── prompt-authoring.instructions.md
│   ├── instruction-authoring.instructions.md
│   ├── skill-authoring.instructions.md
│   ├── hook-authoring.instructions.md
│   ├── mcp-authoring.instructions.md
│   └── workflow-authoring.instructions.md
└── skills/                               # On-demand knowledge packs
    ├── vscode-customization/SKILL.md     # Schema reference
    ├── subagent-patterns/SKILL.md        # Orchestration patterns
    ├── agent-template/SKILL.md           # Agent field reference
    ├── instruction-template/SKILL.md     # Instruction field reference
    ├── prompt-template/SKILL.md          # Prompt field reference
    ├── skill-template/SKILL.md           # Skill field reference
    ├── hook-template/SKILL.md            # Hook lifecycle reference
    ├── mcp-template/SKILL.md             # MCP server config reference
    └── workflow-template/SKILL.md        # Agentic workflow reference
```

### Gallery Use Cases (pick during init)

| Use Case | Type | Description |
|----------|------|-------------|
| **Code Review** | Agent bundle | Reviews PRs for code quality, security, performance, and best practices |
| **Testing** | Agent bundle | TDD pipeline — writes tests, identifies coverage gaps, ensures quality |
| **Documentation** | Agent bundle | Auto-generates docs from code structure, comments, and conventions |
| **Deployment** | Agent bundle | Pre-deploy validation — config, env vars, dependencies, readiness |
| **Onboarding** | Agent bundle | Helps new devs understand the codebase — architecture, patterns, conventions |
| **Refactoring** | Agent bundle | Identifies code smells and guides safe, incremental improvements |
| **Code Quality Hooks** | Hooks | Auto-format code after edits and block dangerous terminal commands |
| **Session Logging** | Hooks | Audit trail — log session start/stop and tool usage for compliance |
| **Issue Triage** | Workflow | Auto-label, prioritize, and assign new issues using AI |
| **Daily Report** | Workflow | Scheduled daily summary of repository activity as an issue |
| **Dev Tools MCP** | MCP config | Starter MCP server config with GitHub and Playwright servers |

Agent bundles install 4 files each: an agent, a prompt (slash command), an instruction (quality rules), and a skill (domain knowledge).

## Copilot Integration

Once installed, you get these slash commands in Copilot Chat:

| Command | Description |
|---------|-------------|
| `/design-workflow` | Guided design session — describe your goal and get a tailored artifact plan |
| `/generate-usecase` | Create a custom use case with full agent + prompt + instruction + skill |
| `/generate-hooks` | Generate lifecycle hooks (format, lint, security) |
| `/generate-mcp` | Generate MCP server configurations |
| `/generate-workflow` | Generate agentic workflows (GitHub Actions + AI) |
| `/scaffold-all` | Generate all artifact types for any topic |
| `/install-usecase` | Copy a generated use case from `use-cases/` into `.github/` |
| `/list-customizations` | Scan workspace and inventory all customization files |
| `/validate-customizations` | Check artifacts for schema errors and best-practice violations |

Plus any slash commands from your installed gallery use cases (`/code-review`, `/testing`, `/documentation`, etc.).

## How It Works

### Architecture

AGENT-FORGE uses a **coordinator-worker** architecture with a strict **3-phase pipeline**:

```
Phase 1: PLAN                    Phase 2: BUILD (parallel)         Phase 3: VALIDATE
┌──────────────────┐     ┌─────────────────┐ ┌─────────────────┐  ┌─────────────────┐
│ Copilot Architect│     │Artifact Builder  │ │Workflow Designer│  │  Customization  │
│   (coordinator)  │────▶│  (standalone     │ │  (multi-agent   │─▶│   Reviewer      │
│                  │     │   files)         │ │   systems)      │  │                 │
│ • Interview user │     │ • agents         │ │ • coordinator   │  │ • Schema check  │
│ • Scan workspace │     │ • prompts        │ │ • workers       │  │ • Cross-refs    │
│ • Recommend plan │     │ • instructions   │ │ • handoffs      │  │ • Best practices│
│ • Get approval   │     │ • skills         │ │ • patterns      │  │                 │
└──────────────────┘     └─────────────────┘ └─────────────────┘  └─────────────────┘
                                                                          │
                                                                   ✅ PASS → Done
                                                                   ❌ FAIL → Retry
```

When using the Copilot CLI, AGENT-FORGE launches a **multi-agent orchestration system** with specialized writer agents:

| Agent | Role |
|-------|------|
| `forge-orchestrator` | Coordinates the entire generation pipeline |
| `forge-generator` | Single-pass artifact generation |
| `forge-agent-writer` | Writes `.agent.md` files |
| `forge-prompt-writer` | Writes `.prompt.md` files |
| `forge-instruction-writer` | Writes `.instructions.md` files |
| `forge-skill-writer` | Writes `SKILL.md` files |
| `forge-hook-writer` | Writes hook configurations and scripts |
| `forge-mcp-writer` | Writes MCP server configurations |
| `forge-workflow-writer` | Writes agentic workflow definitions |

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Context isolation** | Subagents run in isolated windows — no shared state |
| **Coordinator never creates files** | Only plans and delegates |
| **Mandatory validation** | Every build must pass the quality gate |
| **Retry loop** | Errors trigger re-build, not manual fixes |
| **Parallel by default** | Both Phase 2 subagents run simultaneously |

### Artifact Types

| Type | File Pattern | Purpose |
|------|-------------|---------|
| Agent | `*.agent.md` | AI persona with tools, responsibilities, and process |
| Prompt | `*.prompt.md` | User-facing slash command that routes to an agent |
| Instruction | `*.instructions.md` | Quality rules auto-applied to matching files |
| Skill | `SKILL.md` | Domain knowledge loaded on-demand by agents |
| Hook | `.github/hooks/*.json` | Lifecycle automation — scripts triggered on agent events |
| MCP Server | `.vscode/mcp.json` | External tool servers for AI-powered development |
| Agentic Workflow | `.github/workflows/*.md` | GitHub Actions with AI automation (IssueOps, ChatOps, etc.) |

## Generating Custom Use Cases

### From the CLI

```bash
forge generate "API rate limiter with per-tenant limits"
```

With the Copilot CLI installed, this launches the multi-agent orchestration system to generate AI-tailored artifacts directly into `.github/`.

Without the Copilot CLI (or with `--static`), it generates pre-built template files instead.

### From Copilot Chat

```
/generate-usecase security vulnerability scanner for Python
```

The Copilot Architect designs and creates a tailored set of artifacts using the Plan → Build → Validate pipeline.

### Installing a Generated Use Case

```bash
# Copy into .github/ manually
cp -r use-cases/api-rate-limiter/* .github/

# Or use the Copilot command
/install-usecase api-rate-limiter
```

## Prerequisites

| Tool | Required | Notes |
|------|----------|-------|
| **Node.js** 18+ | Yes | Runtime |
| **VS Code** (or Insiders) | Yes | With GitHub Copilot extension |
| **GitHub Copilot** | Yes | Subscription with Copilot Chat enabled |
| **Agent mode** | Yes | `chat.agent.enabled: true` in VS Code settings |
| **Git** | Recommended | For version control |
| **GitHub Copilot CLI** | Recommended | Enables AI-powered multi-agent generation (`npm install -g @github/copilot`) |
| **GitHub CLI** (`gh`) | Optional | For agentic workflows and GitHub integration |
| **Docker** | Optional | Required by some MCP servers |

Run `forge check` to verify your setup.

## Contributing

### Development

```bash
git clone https://github.com/jiratouchmhp/agent-forge.git
cd agent-forge
npm install
npm run build
node dist/index.js init --help
```

### Project Structure

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
│   ├── cli/              # Multi-agent orchestration templates (9 agents)
│   ├── core/             # Always-installed Copilot files
│   └── gallery/          # Pre-built use case templates
└── types.ts              # Shared TypeScript types
```

## License

MIT

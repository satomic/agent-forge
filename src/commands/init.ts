import { select, checkbox, input } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs-extra";
import {
  installGalleryUseCase,
  prepareGenerationWorkspace,
  installGeneratedArtifacts,
  cleanupGenerationWorkspace,
  readPlanFile,
  prepareWorkspaceForPlan,
  deriveProjectName,
} from "../lib/scaffold.js";
import { getGallery } from "../lib/gallery.js";
import { detectWorkspace } from "../lib/detector.js";
import {
  isCopilotCliInstalled,
  launchCopilotCli,
  launchCopilotCliParallel,
  selectModel,
  getModelMultiplier,
  WRITER_LABELS,
  formatDuration,
} from "../lib/copilot-cli.js";
import {
  buildPlanningPrompt,
  buildOrchestrationPromptFromPlan,
  buildWriterPrompts,
  buildCopilotInstructionsPrompt,
} from "../lib/prompt-builder.js";
import { postGenerationValidateAndFix } from "../lib/validator.js";
import type { InitOptions, InitMode, AnalyzeStrategy, GenerationMode, SpeedStrategy, WorkspaceInfo } from "../types.js";

// ── Side-by-side AGENT-FORGE block art (6 rows) ───────────────────────
const BANNER_ROWS = [
  "   █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███████╗ ██████╗  ██████╗  ██████╗ ███████╗",
  "  ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝",
  "  ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ",
  "  ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ",
  "  ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗",
  "  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝",
];
const BANNER_COLORS = ["#FF8C00", "#FF7B00", "#FF6A00", "#FF5900", "#FF4800", "#FF3700"];
const TAGLINE = "  AI-Native Context Kit for GitHub Copilot-Driven Development";

/** Static logo for non-TTY / piped output */
export const LOGO = "\n" + BANNER_ROWS.map((r, i) => chalk.hex(BANNER_COLORS[i])(r)).join("\n") + "\n" + chalk.dim(TAGLINE) + "\n\n";

/** Pixel-reveal animation — characters appear at random positions until the banner materializes */
export async function animateLogo(): Promise<void> {
  // Fallback: if not a TTY, just print static
  if (!process.stdout.isTTY) {
    console.log(LOGO);
    return;
  }

  const rows = BANNER_ROWS.length;
  const cols = Math.max(...BANNER_ROWS.map((r) => r.length));
  const clearEol = "\x1b[K";
  const hideCursor = "\x1b[?25l";
  const showCursor = "\x1b[?25h";

  // Build 2D grid starting as all spaces
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(" "));

  // Collect positions of non-space characters to animate
  const positions: { r: number; c: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BANNER_ROWS[r].length; c++) {
      if (BANNER_ROWS[r][c] !== " ") {
        positions.push({ r, c });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Reserve vertical space (top margin + banner rows + tagline + bottom margin)
  const totalLines = rows + 3;
  process.stdout.write(hideCursor + "\n".repeat(totalLines));

  // Build a single frame string and write it atomically (no flicker)
  const render = () => {
    let frame = `\x1b[${totalLines}A`; // cursor up to top of reserved space
    frame += clearEol + "\n"; // top margin
    for (let r = 0; r < rows; r++) {
      frame += chalk.hex(BANNER_COLORS[r])(grid[r].join("")) + clearEol + "\n";
    }
    frame += chalk.dim(TAGLINE) + clearEol + "\n";
    frame += clearEol + "\n"; // bottom margin
    process.stdout.write(frame);
  };

  // Reveal in ~15 steps over ~1 second
  const steps = 15;
  const batchSize = Math.ceil(positions.length / steps);
  const frameDelay = 65;

  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);
    for (const { r, c } of batch) {
      grid[r][c] = BANNER_ROWS[r][c];
    }
    render();
    await new Promise((resolve) => setTimeout(resolve, frameDelay));
  }

  // Final complete render
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BANNER_ROWS[r].length; c++) {
      grid[r][c] = BANNER_ROWS[r][c];
    }
  }
  render();
  process.stdout.write(showCursor);
}

// ── UI helpers ─────────────────────────────────────────────────────────

const ACCENT = "#FF8C00";
const ACCENT2 = "#FF6A00";

/** Print a section header with consistent styling */
function sectionHeader(label: string, width = 58): void {
  const line = "─".repeat(Math.max(0, width - label.length - 5));
  console.log();
  console.log(chalk.hex(ACCENT).bold(`  ── ${label} ${line}`));
  console.log();
}

/** Print a key-value detail line inside a section */
function detail(key: string, value: string): void {
  console.log(chalk.dim(`  │ ${key.padEnd(10)} ${value}`));
}

// ═══════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════

export async function initCommand(
  options: InitOptions,
): Promise<void> {
  await animateLogo();

  const mode: InitMode = options.mode ?? await select({
    message: "What would you like to do?",
    choices: [
      {
        value: "create" as InitMode,
        name: `${chalk.hex(ACCENT).bold("Create")}      ${chalk.dim("— Design a new Copilot workspace from a description")}`,
      },
      {
        value: "analyze" as InitMode,
        name: `${chalk.hex(ACCENT2).bold("Analyze")}     ${chalk.dim("— Scan an existing project and generate configurations")}`,
      },
      {
        value: "templates" as InitMode,
        name: `${chalk.cyan.bold("Templates")}   ${chalk.dim("— Install pre-built configurations from the catalog")}`,
      },
    ],
  });

  switch (mode) {
    case "create":
      await handleCreate(options);
      break;
    case "analyze":
      await handleAnalyze(process.cwd(), options);
      break;
    case "templates":
      await handleTemplates(process.cwd(), options);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PATH 1: CREATE
// ═══════════════════════════════════════════════════════════════════════

async function handleCreate(options: InitOptions): Promise<void> {
  sectionHeader("Create");

  const description = options.description ?? await input({
    message: "Describe your use case:",
    validate: (v) => v.trim() ? true : "Please enter a use case description",
  });

  const folderName = deriveProjectName(description);
  const targetDir = path.resolve(folderName);

  if (await fs.pathExists(targetDir)) {
    console.log(chalk.yellow(`\n  Directory "${folderName}" already exists. New files will be added.`));
  } else {
    await fs.ensureDir(targetDir);
    console.log(chalk.dim(`\n  Created ${folderName}/`));
  }

  await runGeneration(targetDir, description, "full", options, undefined, "greenfield");

  console.log();
  console.log(chalk.bold("  Get started:"));
  console.log(`    ${chalk.cyan(`cd ${folderName}`)}`);
  console.log(`    Open Copilot Chat: ${chalk.dim("⌘⇧I / Ctrl+Shift+I")}`);
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
//  PATH 2: ANALYZE
// ═══════════════════════════════════════════════════════════════════════

async function handleAnalyze(
  targetDir: string,
  options: InitOptions,
): Promise<void> {
  sectionHeader("Analyze");

  // Always scan first
  const spinner = ora("Scanning workspace...").start();
  const workspace = await detectWorkspace(targetDir);
  spinner.succeed("Workspace scanned");

  // Boxed project summary
  printProjectSummary(workspace);

  // Strategy selection
  const strategy: AnalyzeStrategy = options.analyzeStrategy ?? await select<AnalyzeStrategy>({
    message: "How would you like to proceed?",
    choices: [
      {
        value: "auto" as AnalyzeStrategy,
        name: `${chalk.green("Auto-generate")}  ${chalk.dim("— Generate everything based on scan results")} ${chalk.green("(recommended)")}`,
      },
      {
        value: "guided" as AnalyzeStrategy,
        name: `${chalk.white("Guided")}         ${chalk.dim("— Add custom requirements on top of scan results")}`,
      },
    ],
    default: "auto",
  });

  let description: string;
  let generationMode: GenerationMode;

  if (strategy === "auto") {
    // Auto-derive description from workspace — no user prompt
    description = buildDiscoveryDescription(workspace);
    generationMode = "discovery";
    console.log(chalk.dim(`\n  Auto-detected: ${description}`));
  } else {
    // Guided — prompt for additional requirements
    const requirements = options.description ?? await input({
      message: "Describe additional requirements:",
      validate: (v) => v.trim() ? true : "Please enter additional requirements",
    });

    const techDesc = workspace.techStack.length > 0
      ? ` This is a ${workspace.projectType ?? "software"} project using ${workspace.techStack.join(", ")}.`
      : "";
    description = requirements + techDesc;
    generationMode = "full";
  }

  await runGeneration(targetDir, description, generationMode, options, workspace, "brownfield");
  printNextSteps();
}

/** Render workspace scan results in a boxed summary */
function printProjectSummary(workspace: WorkspaceInfo): void {
  const items: Array<[string, string]> = [];

  if (workspace.techStack.length > 0) {
    items.push(["Stack", workspace.techStack.join(", ")]);
  }
  if (workspace.projectType) {
    items.push(["Type", workspace.projectType]);
  }

  // Existing customizations
  const counts: string[] = [];
  if (workspace.existingAgents.length > 0) counts.push(`${workspace.existingAgents.length} agents`);
  if (workspace.existingPrompts.length > 0) counts.push(`${workspace.existingPrompts.length} prompts`);
  if (workspace.existingInstructions.length > 0) counts.push(`${workspace.existingInstructions.length} instructions`);
  if (workspace.existingSkills.length > 0) counts.push(`${workspace.existingSkills.length} skills`);
  if (workspace.existingHooks.length > 0) counts.push(`${workspace.existingHooks.length} hooks`);
  if (workspace.existingWorkflows.length > 0) counts.push(`${workspace.existingWorkflows.length} workflows`);

  if (counts.length > 0) {
    items.push(["Existing", counts.join(" · ")]);
  }

  if (items.length === 0) {
    console.log(chalk.dim("  No project files detected.\n"));
    return;
  }

  // Compute box width
  const maxValueLen = Math.max(...items.map(([k, v]) => k.length + v.length + 4));
  const boxWidth = Math.max(maxValueLen + 6, 48);

  console.log();
  console.log(chalk.hex(ACCENT)(`  ┌─ Project Summary ${"─".repeat(Math.max(0, boxWidth - 20))}┐`));
  for (const [key, val] of items) {
    const content = `  ${chalk.bold(key + ":")}  ${val}`;
    // We need to measure the raw (no-ANSI) length for padding
    const rawLen = `  ${key}:  ${val}`.length;
    const pad = Math.max(0, boxWidth - rawLen);
    console.log(chalk.hex(ACCENT)("  │") + content + " ".repeat(pad) + chalk.hex(ACCENT)("│"));
  }
  console.log(chalk.hex(ACCENT)(`  └${"─".repeat(boxWidth + 1)}┘`));
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════
//  PATH 3: TEMPLATES
// ═══════════════════════════════════════════════════════════════════════

async function handleTemplates(
  targetDir: string,
  options: InitOptions,
): Promise<void> {
  sectionHeader("Templates");

  const gallery = getGallery();
  let selectedIds: string[];

  if (options.useCases) {
    selectedIds = options.useCases;
  } else {
    selectedIds = await checkbox({
      message: "Select configurations to install:",
      choices: gallery.map((entry) => ({
        value: entry.id,
        name: `${chalk.white(entry.name.padEnd(28))} ${chalk.dim("— " + entry.description)}`,
        checked: false,
      })),
    });
  }

  if (selectedIds.length === 0) {
    console.log(chalk.yellow("  No templates selected."));
    return;
  }

  console.log();
  let installed = 0;
  for (const id of selectedIds) {
    const entry = gallery.find((g) => g.id === id);
    const ucSpinner = ora(`Installing ${entry?.name ?? id}...`).start();
    try {
      const result = await installGalleryUseCase(targetDir, id, { force: options.force });
      ucSpinner.succeed(`${entry?.name ?? id} ${chalk.dim(`(${result.copied.length} files)`)}`);
      installed++;
    } catch {
      ucSpinner.fail(`Failed to install ${id}`);
    }
  }

  console.log();
  if (installed > 0) {
    console.log(`  ${chalk.green.bold("✓")} ${chalk.bold(String(installed))} template${installed !== 1 ? "s" : ""} installed successfully`);
  }
  printNextSteps();
}

// ═══════════════════════════════════════════════════════════════════════
//  SHARED GENERATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════

async function runGeneration(
  targetDir: string,
  description: string,
  generationMode: GenerationMode,
  options: InitOptions,
  workspace?: WorkspaceInfo,
  pipeline: "greenfield" | "brownfield" = "greenfield",
): Promise<void> {
  // Copilot CLI is required
  if (!isCopilotCliInstalled()) {
    console.log(chalk.red("  ✗ GitHub Copilot CLI is required for generation."));
    console.log();
    console.log(chalk.bold("  Install Copilot CLI:"));
    console.log(chalk.cyan("    npm install -g @github/copilot"));
    console.log();
    console.log(chalk.dim("  Then re-run: forge init"));
    console.log();
    console.log(chalk.dim("  Templates work without Copilot CLI — run: forge init --mode templates"));
    return;
  }

  // Model selection
  const model = options.model ?? await selectModel();

  // Speed selection (ask early so user makes all decisions upfront)
  const multiplier = getModelMultiplier(model);
  const speed: SpeedStrategy = options.speed ?? await select<SpeedStrategy>({
    message: "Generation speed:",
    choices: [
      {
        value: "standard" as SpeedStrategy,
        name: `${chalk.white("Standard")}  ${chalk.dim(`— Sequential generation, ~${2 * multiplier} PRU`)}`,
      },
      {
        value: "turbo" as SpeedStrategy,
        name: `${chalk.hex("#FFD700")("Turbo")}     ${chalk.dim("— Parallel generation, faster")} ${chalk.hex("#FFD700")("⚡")}`,
      },
    ],
    default: "standard",
  });

  // Prepare workspace
  const spinner = ora("Preparing workspace...").start();
  const { tempDir, slug, title, domains } = await prepareGenerationWorkspace(description, generationMode, pipeline, pipeline === "brownfield" ? targetDir : undefined);
  spinner.succeed("Workspace ready");

  const pipelineLabel = pipeline === "brownfield" ? "Analyze" : "Create";
  const plannerAgent = pipeline === "brownfield" ? "forge-brownfield-planner" : "forge-greenfield-planner";
  const orchestratorAgent = pipeline === "brownfield" ? "forge-brownfield-orchestrator" : "forge-greenfield-orchestrator";

  // ── Phase 1: Planning ──────────────────────────────────────────────
  sectionHeader("Phase 1 · Planning");
  detail("Pipeline", pipelineLabel);
  detail("Model", model);
  detail("Speed", speed === "turbo" ? "Turbo ⚡" : "Standard");
  if (domains.length > 1) {
    detail("Domains", domains.map((d) => d.title).join(", "));
  }
  console.log();

  const planPrompt = buildPlanningPrompt(generationMode, slug, title, description, domains, workspace);
  const planExitCode = await launchCopilotCli(tempDir, planPrompt, {
    model,
    agent: plannerAgent,
    maxContinues: 15,
    plan: true,
  });

  if (planExitCode !== 0) {
    console.log(chalk.yellow("\n  ⚠  Planner exited with warnings."));
  }

  const planSpinner = ora("Reading plan...").start();
  const plan = await readPlanFile(tempDir);
  planSpinner.succeed(`Plan ready — ${plan.agents.length} agent(s): ${plan.agents.map((a) => a.name).join(", ")}`);

  await prepareWorkspaceForPlan(tempDir, plan);

  const totalPru = (speed === "turbo" ? plan.agents.length + 2 : 2) * multiplier;

  // ── Phase 2: Generating ────────────────────────────────────────────
  const speedLabel = speed === "turbo" ? "Turbo ⚡" : "Standard";
  sectionHeader(`Phase 2 · Generating (${speedLabel})`);

  let exitCode: number;
  const phase2Start = Date.now();
  let writerDurationMs = 0;
  let instrDurationMs = 0;

  if (speed === "turbo") {
    const writerTasks = buildWriterPrompts(plan, generationMode);
    detail("Writers", `${writerTasks.length} parallel sessions`);
    detail("Estimate", `~${(writerTasks.length + 1) * multiplier} PRU`);
    console.log();

    for (const task of writerTasks) {
      const label = WRITER_LABELS[task.agent] ?? task.agent;
      console.log(chalk.dim(`    ◦ ${label}`));
    }
    console.log();

    const result = await launchCopilotCliParallel(tempDir, writerTasks, { model }, (wr) => {
      const label = (WRITER_LABELS[wr.agent] ?? wr.agent).padEnd(22);
      const duration = chalk.dim(formatDuration(wr.durationMs));
      if (wr.exitCode === 0) {
        console.log(`    ${chalk.green("✔")} ${label} ${duration}`);
      } else {
        console.log(`    ${chalk.red("✘")} ${label} ${duration}`);
      }
    });
    writerDurationMs = result.totalDurationMs;

    console.log();
    const instrStart = Date.now();
    const instrSpinner = ora("  Creating copilot-instructions.md...").start();
    const instrPrompt = buildCopilotInstructionsPrompt(plan);
    const instrCode = await launchCopilotCli(tempDir, instrPrompt, {
      model,
      agent: orchestratorAgent,
      maxContinues: 5,
      quiet: true,
    });
    instrDurationMs = Date.now() - instrStart;
    if (instrCode === 0) {
      instrSpinner.succeed(`  copilot-instructions.md ${chalk.dim(formatDuration(instrDurationMs))}`);
    } else {
      instrSpinner.warn(`  copilot-instructions.md (with warnings) ${chalk.dim(formatDuration(instrDurationMs))}`);
    }

    exitCode = result.failed > 0 ? 1 : 0;
  } else {
    detail("Session", "single orchestrator");
    detail("Estimate", `~${2 * multiplier} PRU`);
    console.log();

    const orchPrompt = buildOrchestrationPromptFromPlan(plan, generationMode);
    exitCode = await launchCopilotCli(tempDir, orchPrompt, { model, agent: orchestratorAgent });
  }

  const phase2Duration = Date.now() - phase2Start;

  const installed = await installGeneratedArtifacts(tempDir, targetDir, plan.slug);
  cleanupGenerationWorkspace(tempDir).catch(() => {});

  // ── Phase 3: Validation ────────────────────────────────────────────
  sectionHeader("Phase 3 · Validation");
  const fixSpinner = ora("  Checking artifacts...").start();
  const report = await postGenerationValidateAndFix(targetDir);
  if (report.errors.length === 0 && report.warnings.length === 0) {
    fixSpinner.succeed(`  ${report.passed.length} files passed — all checks clean`);
  } else if (report.errors.length === 0) {
    fixSpinner.succeed(`  ${report.passed.length} files passed, ${report.warnings.length} warning(s)`);
    for (const w of report.warnings) {
      const fileName = path.basename(w.file);
      console.log(chalk.dim(`    ⚠ ${fileName}: ${w.message}`));
    }
  } else {
    fixSpinner.warn(`  ${report.errors.length} error(s) remain after auto-fix`);
    for (const e of report.errors) {
      const fileName = path.basename(e.file);
      console.log(chalk.red(`    ✗ ${fileName}: ${e.message}`));
    }
    for (const w of report.warnings) {
      const fileName = path.basename(w.file);
      console.log(chalk.dim(`    ⚠ ${fileName}: ${w.message}`));
    }
  }

  // ── Results ────────────────────────────────────────────────────────
  sectionHeader("Results");

  if (exitCode === 0) {
    const durationStr = formatDuration(phase2Duration);
    console.log(`  ${chalk.green.bold("✓")} Generation complete`);
    console.log();

    const boxWidth = 45;
    console.log(chalk.dim(`  ┌${"─".repeat(boxWidth)}┐`));
    console.log(chalk.dim("  │") + `  Files:     ${chalk.bold(String(installed.length))}`.padEnd(boxWidth) + chalk.dim("│"));
    console.log(chalk.dim("  │") + `  Duration:  ${chalk.bold(durationStr)}${speed === "turbo" ? chalk.dim(` (writers ${formatDuration(writerDurationMs)})`) : ""}`.padEnd(boxWidth) + chalk.dim("│"));
    console.log(chalk.dim("  │") + `  Cost:      ${chalk.bold(`~${totalPru} PRU`)}`.padEnd(boxWidth) + chalk.dim("│"));
    console.log(chalk.dim("  │") + `  Model:     ${chalk.bold(model)}`.padEnd(boxWidth) + chalk.dim("│"));
    console.log(chalk.dim("  │") + `  Speed:     ${chalk.bold(speed === "turbo" ? "Turbo (parallel)" : "Standard")}`.padEnd(boxWidth) + chalk.dim("│"));
    console.log(chalk.dim(`  └${"─".repeat(boxWidth)}┘`));

    printGeneratedFiles(plan.slug, installed);
  } else {
    console.log(chalk.yellow("  ⚠  Generation finished with warnings. Review the generated files."));
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════

function buildDiscoveryDescription(workspace: WorkspaceInfo): string {
  const parts: string[] = [];

  if (workspace.projectType) {
    parts.push(`${workspace.projectType} project`);
  } else {
    parts.push("software project");
  }

  if (workspace.techStack.length > 0) {
    parts.push(`using ${workspace.techStack.join(", ")}`);
  }

  const existing: string[] = [];
  if (workspace.existingAgents.length > 0) existing.push(`${workspace.existingAgents.length} agents`);
  if (workspace.existingInstructions.length > 0) existing.push(`${workspace.existingInstructions.length} instructions`);
  if (workspace.existingPrompts.length > 0) existing.push(`${workspace.existingPrompts.length} prompts`);
  if (workspace.existingSkills.length > 0) existing.push(`${workspace.existingSkills.length} skills`);

  let desc = `Copilot readiness for ${parts.join(" ")}`;

  if (existing.length > 0) {
    desc += `. Already has: ${existing.join(", ")}. Generate complementary customizations that don't duplicate existing ones`;
  } else {
    desc += `. Generate comprehensive development assistance customizations`;
  }

  return desc;
}

function printGeneratedFiles(_slug: string, files: string[]): void {
  const githubFiles = files.filter((f) => !f.startsWith(".vscode/"));
  const vscodeFiles = files.filter((f) => f.startsWith(".vscode/"));

  if (githubFiles.length > 0) {
    const groups = new Map<string, string[]>();
    for (const f of githubFiles) {
      const parts = f.split("/");
      const dir = parts.length > 1 ? parts[0] : "";
      const name = parts.length > 1 ? parts.slice(1).join("/") : f;
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir)!.push(name);
    }

    console.log();
    console.log(chalk.bold("  .github/"));
    const dirs = [...groups.keys()];
    for (let d = 0; d < dirs.length; d++) {
      const dir = dirs[d];
      const dirFiles = groups.get(dir)!;
      const isLastDir = d === dirs.length - 1;
      const dirPrefix = isLastDir ? "└── " : "├── ";
      const childIndent = isLastDir ? "    " : "│   ";

      if (dir) {
        console.log(`    ${dirPrefix}${chalk.bold(dir + "/")}`);
        for (let i = 0; i < dirFiles.length; i++) {
          const filePrefix = i === dirFiles.length - 1 ? "└── " : "├── ";
          console.log(`    ${childIndent}${filePrefix}${dirFiles[i]}`);
        }
      } else {
        for (let i = 0; i < dirFiles.length; i++) {
          const filePrefix = (isLastDir && i === dirFiles.length - 1) ? "└── " : "├── ";
          console.log(`    ${filePrefix}${dirFiles[i]}`);
        }
      }
    }
  }

  if (vscodeFiles.length > 0) {
    console.log();
    console.log(chalk.bold("  .vscode/"));
    for (let i = 0; i < vscodeFiles.length; i++) {
      const name = vscodeFiles[i].replace(".vscode/", "");
      const prefix = i === vscodeFiles.length - 1 ? "└── " : "├── ";
      console.log(`    ${prefix}${name}`);
    }
  }
}

function printNextSteps(): void {
  console.log();
  console.log(chalk.bold("  Next steps:"));
  console.log(`    1. Open Copilot Chat: ${chalk.dim("⌘⇧I / Ctrl+Shift+I")}`);
  console.log(`    2. Try your new agent or prompt`);
  console.log();
}

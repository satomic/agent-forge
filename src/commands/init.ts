import { select, checkbox, input, Separator } from "@inquirer/prompts";
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
import type { InitOptions, InitMode, GenerationMode, ArtifactType, SpeedStrategy, WorkspaceInfo } from "../types.js";

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

export async function initCommand(
  options: InitOptions,
): Promise<void> {
  await animateLogo();

  // 1. Mode selection
  const mode: InitMode = options.mode ?? await select({
    message: "How would you like to start?",
    choices: [
      { value: "new" as InitMode, name: `New project ${chalk.dim("— create a new folder with Copilot customizations")}` },
      { value: "existing" as InitMode, name: `Existing project ${chalk.dim("— add Copilot customizations to this project")}` },
      { value: "gallery" as InitMode, name: `Gallery ${chalk.dim("— install pre-built templates from the AGENT-FORGE gallery")}` },
    ],
  });

  // 2. Execute the selected mode
  switch (mode) {
    case "new":
      await handleNewProject(options);
      break;
    case "existing":
      await handleExisting(process.cwd(), options);
      break;
    case "gallery":
      await handleGallery(process.cwd(), options);
      break;
  }
}

// ─── Mode: New project ───

async function handleNewProject(
  options: InitOptions,
): Promise<void> {
  const description = options.description ?? await input({
    message: "Describe your project:",
    validate: (v) => v.trim() ? true : "Please enter a project description",
  });

  // Generation mode selection
  const { generationMode, selectedTypes } = await selectGenerationMode(options, "new");

  // Derive a short folder name from the description
  const folderName = deriveProjectName(description);

  const targetDir = path.resolve(folderName);
  if (await fs.pathExists(targetDir)) {
    console.log(chalk.yellow(`  Directory "${folderName}" already exists. New files will be added.`));
  } else {
    await fs.ensureDir(targetDir);
    console.log(chalk.dim(`  Created ${folderName}/`));
  }

  await runGeneration(targetDir, description, { ...options, generationMode, selectedTypes }, undefined, "greenfield");

  console.log();
  console.log(chalk.bold("  To get started:"));
  console.log(`    ${chalk.cyan(`cd ${folderName}`)}`);
  console.log(`    Open Copilot Chat: ${chalk.dim("⌘⇧I / Ctrl+Shift+I")}`);
  console.log();
}

// ─── Mode: From gallery ───

async function handleGallery(
  targetDir: string,
  options: InitOptions,
): Promise<void> {
  const gallery = getGallery();
  let selectedIds: string[];

  if (options.useCases) {
    selectedIds = options.useCases;
  } else {
    selectedIds = await checkbox({
      message: "Pick use cases to install (space to select, enter to confirm):",
      choices: gallery.map((entry) => ({
        value: entry.id,
        name: `${entry.name} ${chalk.dim("— " + entry.description)}`,
        checked: false,
      })),
    });
  }

  if (selectedIds.length === 0) {
    console.log(chalk.yellow("  No use cases selected."));
    return;
  }

  console.log();
  for (const id of selectedIds) {
    const entry = gallery.find((g) => g.id === id);
    const ucSpinner = ora(`Installing ${entry?.name ?? id}...`).start();
    try {
      const result = await installGalleryUseCase(targetDir, id, { force: options.force });
      ucSpinner.succeed(`${entry?.name ?? id} (${result.copied.length} files)`);
    } catch {
      ucSpinner.fail(`Failed to install ${id}`);
    }
  }

  console.log();
  console.log(chalk.green.bold("✓ Installed!"));
  printNextSteps();
}

// ─── Mode: Existing project ───

async function handleExisting(
  targetDir: string,
  options: InitOptions,
): Promise<void> {
  const spinner = ora("Scanning workspace...").start();
  const workspace = await detectWorkspace(targetDir);
  spinner.succeed("Workspace scanned");

  if (workspace.techStack.length > 0) {
    console.log(chalk.dim(`  Tech stack: ${workspace.techStack.join(", ")}`));
  }
  if (workspace.projectType) {
    console.log(chalk.dim(`  Project type: ${workspace.projectType}`));
  }
  if (workspace.hasGitHub) {
    const counts = [
      workspace.existingAgents.length && `${workspace.existingAgents.length} agents`,
      workspace.existingPrompts.length && `${workspace.existingPrompts.length} prompts`,
      workspace.existingInstructions.length && `${workspace.existingInstructions.length} instructions`,
      workspace.existingSkills.length && `${workspace.existingSkills.length} skills`,
      workspace.existingHooks.length && `${workspace.existingHooks.length} hooks`,
      workspace.existingWorkflows.length && `${workspace.existingWorkflows.length} workflows`,
    ].filter(Boolean).join(", ");
    if (counts) {
      console.log(chalk.dim(`  Existing customizations: ${counts} (will not be modified)`));
    }
  }
  console.log();

  // Generation mode selection
  const { generationMode, selectedTypes } = await selectGenerationMode(options, "existing");

  let description: string;

  if (generationMode === "discovery") {
    // Auto-derive description from workspace analysis — no user prompt needed
    description = buildDiscoveryDescription(workspace);
    console.log(chalk.dim(`  Auto-detected: ${description}`));
  } else {
    description = options.description ?? await input({
      message: "Describe what you want to automate for this project:",
      validate: (v) => v.trim() ? true : "Please enter a description",
    });

    // Enhanced description with codebase context
    const techDesc = workspace.techStack.length > 0
      ? ` This is a ${workspace.projectType ?? "software"} project using ${workspace.techStack.join(", ")}.`
      : "";
    description = description + techDesc;
  }

  await runGeneration(targetDir, description, { ...options, generationMode, selectedTypes }, workspace, "brownfield");
  printNextSteps();
}

// ─── Generation mode selection ───

async function selectGenerationMode(
  options: InitOptions,
  context: "new" | "existing" = "new",
): Promise<{ generationMode: GenerationMode; selectedTypes?: ArtifactType[] }> {
  if (options.generationMode) {
    return { generationMode: options.generationMode, selectedTypes: options.selectedTypes };
  }

  const recommended = chalk.green(" (recommended)");

  const generationMode = await select<GenerationMode>({
    message: "What would you like to generate?",
    choices: [
      { value: "discovery" as GenerationMode, name: `Auto-detect${context === "existing" ? recommended : ""} ${chalk.dim("— scan your project and generate everything automatically")}` },
      { value: "full" as GenerationMode, name: `Custom${context === "new" ? recommended : ""}      ${chalk.dim("— describe your use case, generate agents + instructions + prompts + skills")}` },
      { value: "on-demand" as GenerationMode, name: `Pick & choose  ${chalk.dim("— select which artifact types to generate")}` },
      new Separator(),
      { value: "mcp-server" as GenerationMode, name: `MCP servers     ${chalk.dim("— add tool servers to .vscode/mcp.json")}` },
      { value: "hooks" as GenerationMode, name: `Hooks           ${chalk.dim("— add lifecycle automation (pre-commit, format, lint)")}` },
      { value: "agentic-workflow" as GenerationMode, name: `Workflows       ${chalk.dim("— create GitHub Actions with AI automation")}` },
    ],
    default: context === "existing" ? "discovery" : "full",
  });

  let selectedTypes: ArtifactType[] | undefined;

  if (generationMode === "on-demand") {
    selectedTypes = await checkbox<ArtifactType>({
      message: "Select artifact types to generate:",
      choices: [
        { value: "agent" as ArtifactType, name: `Agents          ${chalk.dim("— custom AI personas")}`, checked: true },
        { value: "instruction" as ArtifactType, name: `Instructions    ${chalk.dim("— coding standards & rules")}`, checked: true },
        { value: "prompt" as ArtifactType, name: `Prompts         ${chalk.dim("— reusable task templates")}`, checked: true },
        { value: "skill" as ArtifactType, name: `Skills          ${chalk.dim("— domain knowledge packs")}`, checked: true },
        new Separator(),
        { value: "hook" as ArtifactType, name: `Hooks           ${chalk.dim("— lifecycle automation scripts")}` },
        { value: "mcp-server" as ArtifactType, name: `MCP servers     ${chalk.dim("— external tool integrations")}` },
        { value: "agentic-workflow" as ArtifactType, name: `Workflows       ${chalk.dim("— GitHub Actions AI automation")}` },
      ],
    });

    if (selectedTypes.length === 0) {
      console.log(chalk.yellow("  No types selected. Using full context mode."));
      return { generationMode: "full" };
    }
  }

  return { generationMode, selectedTypes };
}

// ─── Shared generation logic ───

async function runGeneration(
  targetDir: string,
  description: string,
  options: InitOptions,
  workspace?: WorkspaceInfo,
  pipeline: "greenfield" | "brownfield" = "greenfield",
): Promise<void> {
  const mode = options.generationMode ?? "full";

  // Copilot CLI is required
  if (!isCopilotCliInstalled()) {
    console.log(chalk.red("  ✗ GitHub Copilot CLI is required for generation."));
    console.log();
    console.log(chalk.bold("  Install Copilot CLI:"));
    console.log(chalk.cyan("    npm install -g @github/copilot"));
    console.log();
    console.log(chalk.dim("  Then re-run: forge init"));
    console.log();
    console.log(chalk.dim("  Gallery mode works without Copilot CLI — run: forge init --mode gallery"));
    return;
  }

  const model = options.model ?? await selectModel();

  const spinner = ora("Preparing workspace...").start();
  const { tempDir, slug, title, domains } = await prepareGenerationWorkspace(description, mode, pipeline);
  spinner.succeed("Workspace ready");

  const pipelineLabel = pipeline === "brownfield" ? "brownfield" : "greenfield";
  const plannerAgent = pipeline === "brownfield" ? "forge-brownfield-planner" : "forge-greenfield-planner";
  const orchestratorAgent = pipeline === "brownfield" ? "forge-brownfield-orchestrator" : "forge-greenfield-orchestrator";

  // Phase 1: Planning
  console.log();
  console.log(chalk.hex("#FF8C00").bold(`  ── Phase 1: Planning (${pipelineLabel}) ` + "─".repeat(Math.max(0, 30 - pipelineLabel.length))));
  console.log(chalk.dim(`  │ Model: ${model}`));
  console.log(chalk.dim(`  │ Mode: ${mode}`));
  if (domains.length > 1) {
    console.log(chalk.dim(`  │ Domains: ${domains.map((d) => d.title).join(", ")}`));
  }
  console.log();

  const planPrompt = buildPlanningPrompt(mode, slug, title, description, domains, workspace, options.selectedTypes);
  const planExitCode = await launchCopilotCli(tempDir, planPrompt, {
    model,
    agent: plannerAgent,
    maxContinues: 15,
    plan: true,
  });

  if (planExitCode !== 0) {
    console.log(chalk.yellow("\n  ⚠  Planner exited with warnings."));
  }

  // Read the plan
  const planSpinner = ora("Reading plan...").start();
  const plan = await readPlanFile(tempDir);
  planSpinner.succeed(`Plan ready — ${plan.agents.length} agent(s): ${plan.agents.map((a) => a.name).join(", ")}`);

  // Prepare workspace directories for Phase 2
  await prepareWorkspaceForPlan(tempDir, plan);

  // Speed selection
  const speed: SpeedStrategy = options.speed ?? await select<SpeedStrategy>({
    message: "Generation speed:",
    choices: [
      { value: "standard" as SpeedStrategy, name: `Standard  ${chalk.dim(`— single session, ~2 PRU (slower)`)}` },
      { value: "turbo" as SpeedStrategy, name: `Turbo     ${chalk.dim(`— parallel sessions, ~${plan.agents.length + 2} PRU (fastest)`)}` },
    ],
    default: "standard",
  });

  const totalPru = speed === "turbo" ? plan.agents.length + 2 : 2;

  // Phase 2: Generate artifacts
  console.log();
  const speedLabel = speed === "turbo" ? "⚡ Turbo" : "Standard";
  console.log(chalk.hex("#FF8C00").bold(`  ── Phase 2: Generating (${speedLabel}) ` + "─".repeat(Math.max(0, 28 - speedLabel.length))));

  let exitCode: number;
  const phase2Start = Date.now();

  if (speed === "turbo") {
    // Turbo: spawn parallel Copilot CLI processes per writer agent
    const writerTasks = buildWriterPrompts(plan, mode);
    console.log(chalk.dim(`  │ ${writerTasks.length} parallel sessions → ~${writerTasks.length + 1} PRU`));
    console.log();

    // Show pending writers
    for (const task of writerTasks) {
      const label = WRITER_LABELS[task.agent] ?? task.agent;
      console.log(chalk.dim(`    ◦ ${label}`));
    }
    console.log();

    // Run in parallel with progress callback
    const result = await launchCopilotCliParallel(tempDir, writerTasks, { model }, (wr) => {
      const label = (WRITER_LABELS[wr.agent] ?? wr.agent).padEnd(22);
      const duration = chalk.dim(formatDuration(wr.durationMs));
      if (wr.exitCode === 0) {
        console.log(`    ${chalk.green("✔")} ${label} ${duration}`);
      } else {
        console.log(`    ${chalk.red("✘")} ${label} ${duration}`);
      }
    });

    // Create copilot-instructions.md after all writers complete
    console.log();
    const instrSpinner = ora("  Creating copilot-instructions.md...").start();
    const instrPrompt = buildCopilotInstructionsPrompt(plan);
    const instrCode = await launchCopilotCli(tempDir, instrPrompt, {
      model,
      agent: orchestratorAgent,
      maxContinues: 5,
      quiet: true,
    });
    if (instrCode === 0) {
      instrSpinner.succeed("  copilot-instructions.md");
    } else {
      instrSpinner.warn("  copilot-instructions.md (with warnings)");
    }

    exitCode = result.failed > 0 ? 1 : 0;
  } else {
    // Standard: single orchestrator process with sequential sub-agent delegation
    console.log(chalk.dim("  │ Single orchestrator session → ~2 PRU"));
    console.log();

    const orchPrompt = buildOrchestrationPromptFromPlan(plan, mode);
    exitCode = await launchCopilotCli(tempDir, orchPrompt, { model, agent: orchestratorAgent });
  }

  const phase2Duration = Date.now() - phase2Start;

  const installed = await installGeneratedArtifacts(tempDir, targetDir, plan.slug);
  cleanupGenerationWorkspace(tempDir).catch(() => {});

  // Phase 3: Validation
  console.log();
  console.log(chalk.hex("#FF8C00").bold("  ── Phase 3: Validation ─────────────────────────"));
  const fixSpinner2 = ora("  Checking artifacts...").start();
  const report = await postGenerationValidateAndFix(targetDir);
  if (report.errors.length === 0) {
    fixSpinner2.succeed(`  ${report.passed.length} files passed${report.warnings.length > 0 ? `, ${report.warnings.length} warning(s)` : ""}`);
  } else {
    fixSpinner2.warn(`  ${report.errors.length} error(s) remain after auto-fix`);
  }

  // Results
  console.log();
  console.log(chalk.hex("#FF8C00").bold("  ── Results ─────────────────────────────────────"));

  if (exitCode === 0) {
    const durationStr = formatDuration(phase2Duration);
    console.log();
    console.log(`  ${chalk.green.bold("✓")} Generated ${chalk.bold(String(installed.length))} files in ${chalk.bold(durationStr)} ${chalk.dim(`(~${totalPru} PRU)`)}`);
    printGeneratedFiles(plan.slug, installed);
  } else {
    console.log();
    console.log(chalk.yellow("  ⚠  Generation finished with warnings. Review the generated files."));
  }
}

// ─── Discovery helpers ───

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

// ─── Helpers ───

function printGeneratedFiles(_slug: string, files: string[]): void {
  const githubFiles = files.filter((f) => !f.startsWith(".vscode/"));
  const vscodeFiles = files.filter((f) => f.startsWith(".vscode/"));

  if (githubFiles.length > 0) {
    console.log();
    console.log(chalk.bold("  .github/"));
    for (let i = 0; i < githubFiles.length; i++) {
      const prefix = i === githubFiles.length - 1 ? "└──" : "├──";
      console.log(`    ${prefix} ${githubFiles[i]}`);
    }
  }

  if (vscodeFiles.length > 0) {
    console.log();
    console.log(chalk.bold("  .vscode/"));
    for (let i = 0; i < vscodeFiles.length; i++) {
      const name = vscodeFiles[i].replace(".vscode/", "");
      const prefix = i === vscodeFiles.length - 1 ? "└──" : "├──";
      console.log(`    ${prefix} ${name}`);
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

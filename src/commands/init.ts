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
  generateUseCaseStatic,
  generateHooksStatic,
  generateMcpConfigStatic,
  generateWorkflowStatic,
  deriveProjectName,
} from "../lib/scaffold.js";
import { getGallery } from "../lib/gallery.js";
import { detectWorkspace } from "../lib/detector.js";
import {
  isCopilotCliInstalled,
  launchCopilotCli,
  buildPlanningPrompt,
  buildOrchestrationPromptFromPlan,
  selectModel,
} from "../lib/copilot-cli.js";
import { postGenerationValidateAndFix } from "../lib/validator.js";
import type { InitOptions, InitMode, GenerationMode, ArtifactType, WorkspaceInfo } from "../types.js";

export const LOGO = `
${chalk.hex("#FF8C00")("   █████╗  ██████╗ ███████╗███╗   ██╗████████╗")}
${chalk.hex("#FF7B00")("  ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝")}
${chalk.hex("#FF6A00")("  ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ")}
${chalk.hex("#FF5900")("  ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ")}
${chalk.hex("#FF4800")("  ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ")}
${chalk.hex("#FF3700")("  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ")}
${chalk.hex("#FF6B00")("  ███████╗ ██████╗  ██████╗  ██████╗ ███████╗")}
${chalk.hex("#FF5500")("  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝")}
${chalk.hex("#FF4400")("  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ")}
${chalk.hex("#FF3300")("  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ")}
${chalk.hex("#FF2200")("  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗")}
${chalk.hex("#FF1100")("  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝")}
${chalk.dim("  Context Engineering Toolkit for GitHub Copilot")}
`;

export async function initCommand(
  options: InitOptions,
): Promise<void> {
  console.log(LOGO);
  console.log();

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

  await runGeneration(targetDir, description, { ...options, generationMode, selectedTypes });

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

  await runGeneration(targetDir, description, { ...options, generationMode, selectedTypes }, workspace);
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
): Promise<void> {
  const mode = options.generationMode ?? "full";

  if (!isCopilotCliInstalled()) {
    const spinner = ora("Generating (static templates)...").start();
    const allFiles: string[] = [];

    // Static fallback dispatches based on mode
    switch (mode) {
      case "discovery":
      case "full": {
        const { files } = await generateUseCaseStatic(targetDir, description, { model: options.model });
        allFiles.push(...files);
        break;
      }
      case "hooks": {
        const { files } = await generateHooksStatic(targetDir, description);
        allFiles.push(...files);
        break;
      }
      case "mcp-server": {
        const { files } = await generateMcpConfigStatic(targetDir, description);
        allFiles.push(...files);
        break;
      }
      case "agentic-workflow": {
        const { files } = await generateWorkflowStatic(targetDir, description);
        allFiles.push(...files);
        break;
      }
      case "on-demand": {
        const types = options.selectedTypes ?? ["agent", "instruction", "prompt", "skill"];
        if (types.some((t) => ["agent", "instruction", "prompt", "skill"].includes(t))) {
          const { files } = await generateUseCaseStatic(targetDir, description, { model: options.model });
          allFiles.push(...files);
        }
        if (types.includes("hook")) {
          const { files } = await generateHooksStatic(targetDir, description);
          allFiles.push(...files);
        }
        if (types.includes("mcp-server")) {
          const { files } = await generateMcpConfigStatic(targetDir, description);
          allFiles.push(...files);
        }
        if (types.includes("agentic-workflow")) {
          const { files } = await generateWorkflowStatic(targetDir, description);
          allFiles.push(...files);
        }
        break;
      }
    }

    const slug = deriveProjectName(description);
    spinner.succeed("Generated!");

    // Auto-fix and validate
    const fixSpinner = ora("Validating & fixing artifacts...").start();
    const report = await postGenerationValidateAndFix(targetDir);
    if (report.errors.length === 0) {
      fixSpinner.succeed(`Validated — ${report.passed.length} files passed${report.warnings.length > 0 ? `, ${report.warnings.length} warning(s)` : ""}`);
    } else {
      fixSpinner.warn(`${report.errors.length} error(s) remain after auto-fix`);
    }

    printGeneratedFiles(slug, allFiles);
    printNoCopilotWarning();
    return;
  }

  const model = options.model ?? await selectModel();

  const spinner = ora("Preparing workspace...").start();
  const { tempDir, slug, title, domains } = await prepareGenerationWorkspace(description, mode);
  spinner.succeed("Workspace ready");

  // Phase 1: Planning
  console.log();
  console.log(chalk.bold("  Phase 1: Planning..."));
  console.log(chalk.dim(`  Model: ${model}`));
  console.log(chalk.dim(`  Mode: ${mode}`));
  if (domains.length > 1) {
    console.log(chalk.dim(`  Domains: ${domains.map((d) => d.title).join(", ")}`));
  }
  console.log();

  const planPrompt = buildPlanningPrompt(mode, slug, title, description, domains, workspace, options.selectedTypes);
  const planExitCode = await launchCopilotCli(tempDir, planPrompt, { model, agent: "forge-planner" });

  if (planExitCode !== 0) {
    console.log(chalk.yellow("\n  ⚠  Planner exited with warnings."));
  }

  // Read the plan
  const planSpinner = ora("Reading plan...").start();
  const plan = await readPlanFile(tempDir);
  planSpinner.succeed(`Plan ready — ${plan.agents.length} agent(s): ${plan.agents.map((a) => a.name).join(", ")}`);

  // Prepare workspace directories for Phase 2 (skill subdirs, etc.)
  await prepareWorkspaceForPlan(tempDir, plan);

  // Phase 2: Orchestrated generation from plan
  console.log();
  console.log(chalk.bold("  Phase 2: Generating artifacts..."));
  console.log(chalk.dim("  Multi-agent orchestration — parallel sub-agent execution"));
  console.log();

  const orchPrompt = buildOrchestrationPromptFromPlan(plan, mode);
  const exitCode = await launchCopilotCli(tempDir, orchPrompt, { model, agent: "forge-orchestrator" });

  const installed = await installGeneratedArtifacts(tempDir, targetDir, plan.slug);
  // Fire-and-forget cleanup — don't block the success message
  cleanupGenerationWorkspace(tempDir).catch(() => {});

  // Phase 3: Auto-fix and validate AI-generated artifacts
  const fixSpinner2 = ora("Validating & fixing artifacts...").start();
  const report = await postGenerationValidateAndFix(targetDir);
  if (report.errors.length === 0) {
    fixSpinner2.succeed(`Validated — ${report.passed.length} files passed${report.warnings.length > 0 ? `, ${report.warnings.length} warning(s)` : ""}`);
  } else {
    fixSpinner2.warn(`${report.errors.length} error(s) remain after auto-fix`);
  }

  if (exitCode === 0) {
    console.log();
    console.log(chalk.green.bold("✓ Generated!"));
    printGeneratedFiles(plan.slug, installed);
  } else {
    console.log();
    console.log(chalk.yellow("⚠  Generation finished with warnings. Review the generated files."));
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

function printNoCopilotWarning(): void {
  console.log();
  console.log(chalk.yellow("  ⚠  GitHub Copilot CLI not found — used static templates."));
  console.log(chalk.dim("    Install for AI-powered generation:"));
  console.log(chalk.cyan("      npm install -g @github/copilot"));
  console.log(chalk.dim("    Then re-run:"));
  console.log(chalk.cyan("      forge init"));
  console.log();
}

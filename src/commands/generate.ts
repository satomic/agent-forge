import chalk from "chalk";
import ora from "ora";
import { select } from "@inquirer/prompts";
import {
  prepareGenerationWorkspace,
  installGeneratedArtifacts,
  cleanupGenerationWorkspace,
  readPlanFile,
  prepareWorkspaceForPlan,
} from "../lib/scaffold.js";
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
import { animateLogo } from "./init.js";
import { postGenerationValidateAndFix } from "../lib/validator.js";
import path from "path";
import type { GenerateOptions, SpeedStrategy } from "../types.js";

export async function generateCommand(
  description: string,
  options: GenerateOptions,
): Promise<void> {
  if (!description.trim()) {
    console.log(chalk.red("Error: Please provide a use case description."));
    console.log(chalk.dim('Example: forge generate "API rate limiter with per-tenant limits"'));
    process.exit(1);
  }

  await animateLogo();
  console.log(chalk.bold("  Use case: ") + chalk.cyan(description));
  if (options.mode) {
    console.log(chalk.bold("  Mode: ") + chalk.cyan(options.mode));
  }
  console.log();

  // Copilot CLI is required — no static fallback
  if (!isCopilotCliInstalled()) {
    console.log(chalk.red("  ✗ GitHub Copilot CLI is required for generation."));
    console.log();
    console.log(chalk.bold("  Install Copilot CLI:"));
    console.log(chalk.cyan("    npm install -g @github/copilot"));
    console.log();
    console.log(chalk.dim("  Then re-run:"));
    console.log(chalk.cyan(`    forge generate "${description}"`));
    process.exit(1);
  }

  const targetDir = process.cwd();
  const mode = options.mode ?? "full";

  console.log(chalk.dim("  Copilot CLI detected — using plan-then-execute pipeline."));
  console.log();

  const model = options.model ?? await selectModel();

  const spinner = ora("Preparing workspace...").start();

  try {
    const { tempDir, slug, title, domains } = await prepareGenerationWorkspace(description, mode, "greenfield");
    spinner.succeed("Workspace ready");

    // Phase 1: Planning (greenfield — from description only)
    console.log();
    console.log(chalk.hex("#FF8C00").bold("  ── Phase 1: Planning (greenfield) ────────────"));
    console.log(chalk.dim(`  │ Model: ${model}`));
    console.log(chalk.dim(`  │ Mode: ${mode}`));
    if (domains.length > 1) {
      console.log(chalk.dim(`  │ Domains: ${domains.map((d) => d.title).join(", ")}`));
    }
    console.log();

    const planPrompt = buildPlanningPrompt(mode, slug, title, description, domains, undefined, options.types);
    const planExitCode = await launchCopilotCli(tempDir, planPrompt, {
      model,
      agent: "forge-greenfield-planner",
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
        agent: "forge-greenfield-orchestrator",
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
      exitCode = await launchCopilotCli(tempDir, orchPrompt, { model, agent: "forge-greenfield-orchestrator" });
    }

    const phase2Duration = Date.now() - phase2Start;

    // Copy generated artifacts
    const installed = await installGeneratedArtifacts(tempDir, targetDir, plan.slug);
    cleanupGenerationWorkspace(tempDir).catch(() => {});

    // Phase 3: Validation
    console.log();
    console.log(chalk.hex("#FF8C00").bold("  ── Phase 3: Validation ─────────────────────────"));
    const fixSpinner = ora("  Checking artifacts...").start();
    const report = await postGenerationValidateAndFix(targetDir);
    if (report.errors.length === 0) {
      fixSpinner.succeed(`  ${report.passed.length} files passed${report.warnings.length > 0 ? `, ${report.warnings.length} warning(s)` : ""}`);
    } else {
      fixSpinner.warn(`  ${report.errors.length} error(s) remain after auto-fix`);
      for (const err of report.errors) {
        console.log(chalk.red(`    ✗ ${path.basename(err.file)}: ${err.message}`));
      }
    }

    // Results
    console.log();
    console.log(chalk.hex("#FF8C00").bold("  ── Results ─────────────────────────────────────"));

    if (exitCode === 0) {
      const durationStr = formatDuration(phase2Duration);
      console.log();
      console.log(`  ${chalk.green.bold("✓")} Generated ${chalk.bold(String(installed.length))} files in ${chalk.bold(durationStr)} ${chalk.dim(`(~${totalPru} PRU)`)}`);
      printGeneratedFiles(plan.slug, installed);
      console.log();
      console.log(chalk.bold("  Next steps:"));
      console.log(`    1. Open Copilot Chat: ${chalk.dim("⌘⇧I / Ctrl+Shift+I")}`);
      console.log(`    2. Select agent: ${chalk.cyan(`@${plan.agents[0]?.title || plan.title}`)}`);
      if (plan.prompt?.slug) {
        console.log(`    3. Or use slash command: ${chalk.cyan(`/${plan.prompt.slug}`)}`);
      }
      if (plan.agents.length > 1) {
        console.log();
        console.log(chalk.bold("  Available agents:"));
        for (const agent of plan.agents) {
          console.log(`    ${chalk.cyan(`@${agent.title}`)} — ${agent.role}`);
        }
        console.log(chalk.dim("    Handoff buttons let you transition between agents."));
      }
      console.log();
      console.log(chalk.dim("  Tip: Run 'forge validate' to verify all files pass VS Code spec checks."));
      console.log();
    } else {
      console.log();
      console.log(chalk.yellow("⚠  Generation finished with warnings. Review the generated files."));
    }
  } catch (error) {
    spinner.fail("Failed to generate");
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

function printGeneratedFiles(_slug: string, files: string[]): void {
  const githubFiles = files.filter((f) => !f.startsWith(".vscode/"));
  const vscodeFiles = files.filter((f) => f.startsWith(".vscode/"));

  if (githubFiles.length > 0) {
    console.log();
    console.log(chalk.bold("  .github/"));
    for (let i = 0; i < githubFiles.length; i++) {
      const prefix = i === githubFiles.length - 1 && vscodeFiles.length === 0 ? "└──" : "├──";
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

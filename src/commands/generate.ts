import chalk from "chalk";
import ora from "ora";
import {
  prepareGenerationWorkspace,
  installGeneratedArtifacts,
  cleanupGenerationWorkspace,
  readPlanFile,
  prepareWorkspaceForPlan,
  generateUseCaseStatic,
  generateHooksStatic,
  generateMcpConfigStatic,
  generateWorkflowStatic,
} from "../lib/scaffold.js";
import {
  isCopilotCliInstalled,
  launchCopilotCli,
  buildPlanningPrompt,
  buildOrchestrationPromptFromPlan,
  selectModel,
} from "../lib/copilot-cli.js";
import { LOGO } from "./init.js";
import { postGenerationValidateAndFix } from "../lib/validator.js";
import path from "path";
import type { GenerateOptions } from "../types.js";

export async function generateCommand(
  description: string,
  options: GenerateOptions,
): Promise<void> {
  if (!description.trim()) {
    console.log(chalk.red("Error: Please provide a use case description."));
    console.log(chalk.dim('Example: forge generate "API rate limiter with per-tenant limits"'));
    process.exit(1);
  }

  console.log(LOGO);
  console.log();
  console.log(chalk.bold("  Use case: ") + chalk.cyan(description));
  if (options.mode) {
    console.log(chalk.bold("  Mode: ") + chalk.cyan(options.mode));
  }
  console.log();

  const targetDir = process.cwd();
  const mode = options.mode ?? "full";
  const useStatic = options.static || !isCopilotCliInstalled();

  // Static template fallback
  if (useStatic) {
    const spinner = ora("Generating (static templates)...").start();

    try {
      const allFiles: string[] = [];

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
          const types = options.types ?? ["agent", "instruction", "prompt", "skill"];
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

      spinner.succeed("Generated!");

      // Auto-fix and validate before showing results
      const fixSpinner = ora("Validating & fixing artifacts...").start();
      const report = await postGenerationValidateAndFix(targetDir);
      if (report.errors.length === 0) {
        fixSpinner.succeed(`Validated — ${report.passed.length} files passed${report.warnings.length > 0 ? `, ${report.warnings.length} warning(s)` : ""}`);
      } else {
        fixSpinner.warn(`${report.errors.length} error(s) remain after auto-fix`);
        for (const err of report.errors) {
          console.log(chalk.red(`    ✗ ${path.basename(err.file)}: ${err.message}`));
        }
      }

      const { deriveProjectName } = await import("../lib/scaffold.js");
      printGeneratedFiles(deriveProjectName(description), allFiles);

      if (!options.static && !isCopilotCliInstalled()) {
        console.log();
        console.log(chalk.yellow("  ⚠  GitHub Copilot CLI not found — used static templates."));
        console.log(chalk.dim("    Install for AI-powered generation:"));
        console.log(chalk.cyan("      npm install -g @github/copilot"));
      }
    } catch (error) {
      spinner.fail("Failed to generate");
      console.error(chalk.red(String(error)));
      process.exit(1);
    }
    return;
  }

  // Copilot CLI multi-agent generation (plan-then-execute pipeline)
  if (!options.model) {
    console.log(chalk.dim("  Copilot CLI detected — using plan-then-execute pipeline."));
    console.log();
  }

  const model = options.model ?? await selectModel();

  const spinner = ora("Preparing workspace...").start();

  try {
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

    const planPrompt = buildPlanningPrompt(mode, slug, title, description, domains, undefined, options.types);
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

    // Copy generated artifacts
    const installed = await installGeneratedArtifacts(tempDir, targetDir, plan.slug);
    // Fire-and-forget cleanup
    cleanupGenerationWorkspace(tempDir).catch(() => {});

    // Phase 3: Auto-fix and validate AI-generated artifacts
    const fixSpinner = ora("Validating & fixing artifacts...").start();
    const report = await postGenerationValidateAndFix(targetDir);
    if (report.errors.length === 0) {
      fixSpinner.succeed(`Validated — ${report.passed.length} files passed${report.warnings.length > 0 ? `, ${report.warnings.length} warning(s)` : ""}`);
    } else {
      fixSpinner.warn(`${report.errors.length} error(s) remain after auto-fix`);
      for (const err of report.errors) {
        console.log(chalk.red(`    ✗ ${path.basename(err.file)}: ${err.message}`));
      }
    }

    if (exitCode === 0) {
      console.log();
      console.log(chalk.green.bold("✓ Generated!"));
      printGeneratedFiles(plan.slug, installed);
      console.log();
      console.log(chalk.bold("  Next steps:"));
      console.log(`    1. Open Copilot Chat: ${chalk.dim("⌘⇧I / Ctrl+Shift+I")}`);
      console.log(`    2. Try: ${chalk.cyan(`@${plan.title}`)}`);
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

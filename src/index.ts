import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { generateCommand } from "./commands/generate.js";
import { listCommand } from "./commands/list.js";
import { validateCommand } from "./commands/validate.js";
import { checkCommand } from "./commands/check.js";
import type { InitMode, GenerationMode, ArtifactType } from "./types.js";

const program = new Command();

program
  .name("forge")
  .description(
    "Context Engineering Toolkit — generate GitHub Copilot customization files (agents, prompts, instructions, skills, hooks, MCP servers, agentic workflows)",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize AGENT-FORGE — generate, install from gallery, or analyze existing project")
  .option("--force", "Force overwrite of existing files", false)
  .option("--mode <mode>", "Wizard mode (new, existing, gallery)")
  .option("--description <text>", "Use case description (skip prompt)")
  .option("--model <model>", "Model to use for AI generation")
  .option("--generation-mode <mode>", "Generation mode (discovery, full, on-demand, mcp-server, hooks, agentic-workflow)")
  .option("--types <types>", "Comma-separated artifact types for on-demand mode (e.g., agent,hook,mcp-server)")
  .option(
    "--use-cases <ids>",
    "Comma-separated gallery use case IDs (e.g., code-review,testing)",
  )
  .action(async (opts) => {
    await initCommand({
      force: opts.force,
      mode: opts.mode as InitMode | undefined,
      description: opts.description,
      model: opts.model,
      generationMode: opts.generationMode as GenerationMode | undefined,
      selectedTypes: opts.types?.split(",").map((s: string) => s.trim()) as ArtifactType[] | undefined,
      useCases: opts.useCases?.split(",").map((s: string) => s.trim()),
    });
  });

program
  .command("generate <description>")
  .description("Generate customization files directly into .github/ (power-user shortcut)")
  .option("--static", "Force static template generation (skip Copilot CLI)", false)
  .option("--model <model>", "Model to use for AI generation")
  .option("--mode <mode>", "Generation mode (discovery, full, on-demand, mcp-server, hooks, agentic-workflow)")
  .option("--types <types>", "Comma-separated artifact types for on-demand mode")
  .action(async (description: string, opts) => {
    await generateCommand(description, {
      static: opts.static,
      model: opts.model,
      mode: opts.mode as GenerationMode | undefined,
      types: opts.types?.split(",").map((s: string) => s.trim()) as ArtifactType[] | undefined,
    });
  });

program
  .command("list")
  .description("List installed and available use cases")
  .action(async () => {
    await listCommand();
  });

program
  .command("validate [scope]")
  .description("Validate all customization files for schema and quality")
  .action(async (scope?: string) => {
    await validateCommand(scope);
  });

program
  .command("check")
  .description("Check that prerequisites are installed")
  .action(async () => {
    await checkCommand();
  });

program.parse();

/**
 * Scaffold — workspace management for Copilot CLI generation.
 *
 * Handles: temp workspace setup, artifact installation, plan parsing, gallery install.
 * All domain detection/naming logic lives in domain-registry.ts.
 * All prompt construction lives in prompt-builder.ts.
 * Static template generation has been removed — Copilot CLI is required.
 */
import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { mergeIntoExisting } from "./merger.js";
import { decomposeDomains, deriveProjectName, slugToTitle } from "./domain-registry.js";
import type { GenerationMode, GenerationPlan } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-export domain utilities for backward compatibility
export { decomposeDomains, deriveProjectName, slugToTitle } from "./domain-registry.js";

/**
 * Resolve the templates directory.
 * In dev: src/templates/
 * In dist: dist/templates/
 */
function getTemplatesDir(): string {
  const candidates = [
    path.resolve(__dirname, "templates"),              // dist/templates (bundled)
    path.resolve(__dirname, "..", "templates"),        // one level up
    path.resolve(__dirname, "..", "src", "templates"), // dev mode
  ];
  for (const candidate of candidates) {
    if (fs.pathExistsSync(candidate)) return candidate;
  }
  throw new Error(
    `Templates directory not found. Searched:\n${candidates.map((c) => `  - ${c}`).join("\n")}\n__dirname: ${__dirname}`,
  );
}

/**
 * Resolve the CLI templates directory.
 * In dev: src/cli/
 * In dist: dist/cli/
 */
function getCliDir(): string {
  const candidates = [
    path.resolve(__dirname, "cli"),              // dist/cli (bundled)
    path.resolve(__dirname, "..", "cli"),        // one level up
    path.resolve(__dirname, "..", "src", "cli"), // dev mode
  ];
  for (const candidate of candidates) {
    if (fs.pathExistsSync(candidate)) return candidate;
  }
  throw new Error(
    `CLI templates directory not found. Searched:\n${candidates.map((c) => `  - ${c}`).join("\n")}\n__dirname: ${__dirname}`,
  );
}

/**
 * Install a gallery use case into the target directory.
 * Files go into .github/ for immediate use.
 */
export async function installGalleryUseCase(
  targetDir: string,
  useCaseId: string,
  options: { force?: boolean } = {},
): Promise<{ copied: string[]; skipped: string[]; merged: string[] }> {
  const templatesDir = getTemplatesDir();
  const galleryDir = path.join(templatesDir, "gallery", useCaseId);

  if (!(await fs.pathExists(galleryDir))) {
    throw new Error(`Gallery use case not found: ${useCaseId}`);
  }

  const result = { copied: [] as string[], skipped: [] as string[], merged: [] as string[] };

  // Handle .vscode/ files (MCP configs) — goes to targetDir/.vscode/
  const vscodeDir = path.join(galleryDir, ".vscode");
  if (await fs.pathExists(vscodeDir)) {
    const targetVscodeDir = path.join(targetDir, ".vscode");
    const vscodeResult = await mergeIntoExisting(vscodeDir, targetVscodeDir, { force: options.force });
    result.copied.push(...vscodeResult.copied);
    result.skipped.push(...vscodeResult.skipped);
    result.merged.push(...vscodeResult.merged);
  }

  // Handle .github/ files (everything else) — copy non-.vscode dirs
  const entries = await fs.readdir(galleryDir, { withFileTypes: true });
  const githubDirs = entries.filter((e) => e.isDirectory() && e.name !== ".vscode");

  if (githubDirs.length > 0) {
    const githubDir = path.join(targetDir, ".github");
    for (const entry of githubDirs) {
      const srcDir = path.join(galleryDir, entry.name);
      const destDir = path.join(githubDir, entry.name);
      const subResult = await mergeIntoExisting(srcDir, destDir, { force: options.force });
      result.copied.push(...subResult.copied);
      result.skipped.push(...subResult.skipped);
      result.merged.push(...subResult.merged);
    }
  }

  return result;
}

/**
 * Prepare a temporary workspace for Copilot CLI generation.
 * Creates a temp dir with the orchestrator agent, all sub-agent templates,
 * and lean workspace instructions. Returns temp dir path, slug, and detected domains.
 */
export type Pipeline = "greenfield" | "brownfield";

export async function prepareGenerationWorkspace(
  description: string,
  mode: GenerationMode = "full",
  pipeline: Pipeline = "greenfield",
) {
  const slug = deriveProjectName(description);
  const title = slugToTitle(slug);
  const domains = decomposeDomains(description);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-"));

  const cliDir = getCliDir();
  const githubDir = path.join(tempDir, ".github");

  // Create output directories based on mode
  const dirPromises: Promise<void>[] = [
    fs.ensureDir(path.join(githubDir, "agents")),
  ];

  if (mode === "full" || mode === "on-demand" || mode === "discovery") {
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "prompts")),
      fs.ensureDir(path.join(githubDir, "instructions")),
      fs.ensureDir(path.join(githubDir, "skills")),
    );
  }
  if (mode === "hooks" || mode === "on-demand") {
    dirPromises.push(fs.ensureDir(path.join(githubDir, "hooks", "scripts")));
  }
  if (mode === "mcp-server" || mode === "on-demand") {
    dirPromises.push(fs.ensureDir(path.join(tempDir, ".vscode")));
  }
  if (mode === "agentic-workflow" || mode === "on-demand") {
    dirPromises.push(fs.ensureDir(path.join(githubDir, "workflows")));
  }

  // Pipeline-specific templates
  const plannerAgent = pipeline === "brownfield"
    ? "forge-brownfield-planner.agent.md"
    : "forge-greenfield-planner.agent.md";
  const orchestratorAgent = pipeline === "brownfield"
    ? "forge-brownfield-orchestrator.agent.md"
    : "forge-greenfield-orchestrator.agent.md";

  const cliTemplates = [
    plannerAgent,
    orchestratorAgent,
    // Shared writers (used by both pipelines)
    "forge-agent-writer.agent.md",
    "forge-instruction-writer.agent.md",
    "forge-prompt-writer.agent.md",
    "forge-skill-writer.agent.md",
    "forge-hook-writer.agent.md",
    "forge-mcp-writer.agent.md",
    "forge-workflow-writer.agent.md",
  ];

  const copyPromises = cliTemplates.map((file) =>
    fs.copy(
      path.join(cliDir, file),
      path.join(githubDir, "agents", file),
    ),
  );

  await Promise.all([...dirPromises, ...copyPromises]);

  return { tempDir, slug, title, domains, pipeline };
}

/**
 * Copy generated artifacts from temp dir into targetDir/.github/ (and .vscode/).
 * Filters out internal forge-* agent files from being copied to the user project.
 */
export async function installGeneratedArtifacts(
  tempDir: string,
  targetDir: string,
  slug: string,
): Promise<string[]> {
  const githubDir = path.join(targetDir, ".github");
  const installed: string[] = [];

  const searchRoots = [
    path.join(tempDir, ".github"),
    tempDir,
    path.join(tempDir, slug),
  ];

  const artifactDirs = ["agents", "prompts", "instructions", "skills", "hooks", "workflows"];

  const internalFiles = new Set([
    "forge-greenfield-planner.agent.md",
    "forge-greenfield-orchestrator.agent.md",
    "forge-brownfield-planner.agent.md",
    "forge-brownfield-orchestrator.agent.md",
    "forge-agent-writer.agent.md",
    "forge-instruction-writer.agent.md",
    "forge-prompt-writer.agent.md",
    "forge-skill-writer.agent.md",
    "forge-hook-writer.agent.md",
    "forge-mcp-writer.agent.md",
    "forge-workflow-writer.agent.md",
    "forge-plan.json",
  ]);

  const copyResults = await Promise.all(
    artifactDirs.map(async (dir) => {
      const files: string[] = [];
      for (const root of searchRoots) {
        const srcDir = path.join(root, dir);
        if (await fs.pathExists(srcDir)) {
          const found = await listAllFiles(srcDir, "");
          const filtered = found.filter((f) => !internalFiles.has(path.basename(f)));
          if (filtered.length > 0) {
            const destDir = path.join(githubDir, dir);
            await fs.ensureDir(destDir);
            for (const f of filtered) {
              const destPath = path.join(destDir, f);
              await fs.ensureDir(path.dirname(destPath));
              await fs.copy(path.join(srcDir, f), destPath, { overwrite: false });
            }
            files.push(...filtered.map((f) => `${dir}/${f}`));
            break;
          }
        }
      }
      return files;
    }),
  );

  for (const files of copyResults) {
    installed.push(...files);
  }

  // Handle .vscode/mcp.json separately
  for (const root of searchRoots) {
    const mcpSrc = path.join(root, ".vscode", "mcp.json");
    if (await fs.pathExists(mcpSrc)) {
      const mcpDest = path.join(targetDir, ".vscode", "mcp.json");
      await fs.ensureDir(path.dirname(mcpDest));
      await fs.copy(mcpSrc, mcpDest, { overwrite: false });
      installed.push(".vscode/mcp.json");
      break;
    }
  }

  // Handle .github/copilot-instructions.md
  for (const root of searchRoots) {
    const srcFile = path.join(root, "copilot-instructions.md");
    if (await fs.pathExists(srcFile)) {
      const content = await fs.readFile(srcFile, "utf-8");
      if (!content.includes("AGENT-FORGE Generation Workspace")) {
        const destFile = path.join(githubDir, "copilot-instructions.md");
        await fs.copy(srcFile, destFile, { overwrite: false });
        installed.push("copilot-instructions.md");
        break;
      }
    }
  }

  return installed;
}

/**
 * Remove the entire temp directory after generation.
 */
export async function cleanupGenerationWorkspace(tempDir: string): Promise<void> {
  const normalizedTemp = path.resolve(tempDir);
  const normalizedTmpdir = path.resolve(os.tmpdir());
  if (normalizedTemp.startsWith(normalizedTmpdir) && await fs.pathExists(normalizedTemp)) {
    await fs.remove(normalizedTemp);
  }
}

/**
 * Prepare the workspace directories for Phase 2 based on the plan.
 * Pre-creates skill subdirectories and any other paths that the
 * Copilot CLI's create_file tool cannot create on its own.
 */
export async function prepareWorkspaceForPlan(
  tempDir: string,
  plan: GenerationPlan,
): Promise<void> {
  const githubDir = path.join(tempDir, ".github");
  const dirPromises: Promise<void>[] = [];

  for (const agent of plan.agents) {
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "skills", agent.name)),
    );
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "instructions")),
    );
  }

  dirPromises.push(fs.ensureDir(path.join(githubDir, "prompts")));

  if (plan.hooks) {
    dirPromises.push(fs.ensureDir(path.join(githubDir, "hooks", "scripts")));
  }
  if (plan.mcp) {
    dirPromises.push(fs.ensureDir(path.join(tempDir, ".vscode")));
  }
  if (plan.workflow) {
    dirPromises.push(fs.ensureDir(path.join(githubDir, "workflows")));
  }

  await Promise.all(dirPromises);
}

/**
 * Read and parse the forge-plan.json written by the forge-planner agent.
 * Searches multiple candidate locations within the temp workspace.
 * Validates required fields and returns a typed GenerationPlan.
 */
export async function readPlanFile(tempDir: string): Promise<GenerationPlan> {
  const candidates = [
    path.join(tempDir, "forge-plan.json"),
    path.join(tempDir, ".github", "forge-plan.json"),
    path.join(tempDir, ".github", "agents", "forge-plan.json"),
  ];

  let raw: string | null = null;
  let foundPath: string | null = null;

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      raw = await fs.readFile(candidate, "utf-8");
      foundPath = candidate;
      break;
    }
  }

  if (!raw || !foundPath) {
    throw new Error(
      `forge-plan.json not found. The planner agent did not produce a plan.\n` +
      `Searched:\n${candidates.map((c) => `  - ${c}`).join("\n")}`,
    );
  }

  let plan: GenerationPlan;
  try {
    plan = JSON.parse(raw) as GenerationPlan;
  } catch (err) {
    throw new Error(
      `forge-plan.json is not valid JSON.\n` +
      `Path: ${foundPath}\n` +
      `Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Validate required fields
  if (!plan.slug || typeof plan.slug !== "string") {
    throw new Error("forge-plan.json missing required field: slug");
  }
  if (!plan.title || typeof plan.title !== "string") {
    throw new Error("forge-plan.json missing required field: title");
  }
  if (!plan.description || typeof plan.description !== "string") {
    throw new Error("forge-plan.json missing required field: description");
  }
  if (!Array.isArray(plan.agents) || plan.agents.length === 0) {
    throw new Error("forge-plan.json must include at least one agent");
  }

  for (const agent of plan.agents) {
    if (!agent.name || !agent.title || !agent.role || !agent.category) {
      throw new Error(
        `forge-plan.json agent "${agent.name || "(unnamed)"}" is missing required fields (name, title, role, category)`,
      );
    }
    if (!Array.isArray(agent.responsibilities) || agent.responsibilities.length === 0) {
      throw new Error(
        `forge-plan.json agent "${agent.name}" must have at least one responsibility`,
      );
    }
    if (!agent.instruction) {
      agent.instruction = { description: `Coding standards for ${agent.title}` };
    }
    if (!agent.skill) {
      agent.skill = { description: `${agent.title} domain knowledge. USE FOR: ${agent.techStack.join(", ") || agent.category}. DO NOT USE FOR: unrelated domains.` };
    }
  }

  return plan;
}

// ─── Utilities ───

async function listAllFiles(dir: string, prefix: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listAllFiles(path.join(dir, entry.name), rel)));
    } else {
      result.push(rel);
    }
  }
  return result;
}

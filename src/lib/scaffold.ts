import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { mergeIntoExisting } from "./merger.js";
import type { Domain, GenerationMode, GenerationPlan } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Copy each subdirectory independently
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
export async function prepareGenerationWorkspace(
  description: string,
  mode: GenerationMode = "full",
): Promise<{ tempDir: string; slug: string; title: string; domains: Domain[] }> {
  const slug = deriveProjectName(description);
  const title = slugToTitle(slug);
  const domains = decomposeDomains(description);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-"));

  const templatesDir = getTemplatesDir();
  const cliDir = path.join(templatesDir, "cli");
  const githubDir = path.join(tempDir, ".github");

  // Determine which directories to create based on mode
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
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "hooks", "scripts")),
    );
  }
  if (mode === "mcp-server" || mode === "on-demand") {
    dirPromises.push(
      fs.ensureDir(path.join(tempDir, ".vscode")),
    );
  }
  if (mode === "agentic-workflow" || mode === "on-demand") {
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "workflows")),
    );
  }

  // Copy CLI templates: orchestrator + all sub-agents + instructions
  const cliTemplates = [
    "forge-orchestrator.agent.md",
    "forge-planner.agent.md",
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

  // Also keep the legacy generator for backward compat
  copyPromises.push(
    fs.copy(
      path.join(cliDir, "forge-generator.agent.md"),
      path.join(githubDir, "agents", "forge-generator.agent.md"),
    ),
    fs.copy(
      path.join(cliDir, "copilot-instructions.md"),
      path.join(githubDir, "copilot-instructions.md"),
    ),
  );

  await Promise.all([...dirPromises, ...copyPromises]);

  return { tempDir, slug, title, domains };
}

/**
 * Copy generated artifacts from temp dir into targetDir/.github/ (and .vscode/).
 * Handles agents, prompts, instructions, skills, hooks, workflows, and MCP configs.
 * Filters out internal forge-* agent files from being copied to the user project.
 */
export async function installGeneratedArtifacts(
  tempDir: string,
  targetDir: string,
  slug: string,
): Promise<string[]> {
  const githubDir = path.join(targetDir, ".github");
  const installed: string[] = [];

  // The CLI generator may place files at:
  //   tempDir/.github/  (forge agents write here)
  //   tempDir/          (root-level)
  //   tempDir/{slug}/   (slug subdirectory)
  const searchRoots = [
    path.join(tempDir, ".github"),
    tempDir,
    path.join(tempDir, slug),
  ];

  const artifactDirs = ["agents", "prompts", "instructions", "skills", "hooks", "workflows"];

  // Internal files to exclude from installation
  const internalFiles = new Set([
    "forge-orchestrator.agent.md",
    "forge-planner.agent.md",
    "forge-generator.agent.md",
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

  // Handle .github/copilot-instructions.md (generated project-level, not the internal template)
  for (const root of searchRoots) {
    const srcFile = path.join(root, "copilot-instructions.md");
    if (await fs.pathExists(srcFile)) {
      // Only copy if it's a generated file (contains project-specific content)
      // not the internal workspace template (which contains "AGENT-FORGE Generation Workspace")
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
  if (tempDir.includes(os.tmpdir()) && await fs.pathExists(tempDir)) {
    await fs.remove(tempDir);
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
    // Create skill subdirectory: .github/skills/{name}/
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "skills", agent.name)),
    );
    // Ensure instruction directory exists
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "instructions")),
    );
  }

  // Ensure prompt directory exists
  dirPromises.push(
    fs.ensureDir(path.join(githubDir, "prompts")),
  );

  // Optional: hooks
  if (plan.hooks) {
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "hooks", "scripts")),
    );
  }

  // Optional: mcp
  if (plan.mcp) {
    dirPromises.push(
      fs.ensureDir(path.join(tempDir, ".vscode")),
    );
  }

  // Optional: workflow
  if (plan.workflow) {
    dirPromises.push(
      fs.ensureDir(path.join(githubDir, "workflows")),
    );
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
    // Validate per-agent instruction and skill (allow graceful fallback if missing)
    if (!agent.instruction) {
      agent.instruction = { description: `Coding standards for ${agent.title}` };
    }
    if (!agent.skill) {
      agent.skill = { description: `${agent.title} domain knowledge. USE FOR: ${agent.techStack.join(", ") || agent.category}. DO NOT USE FOR: unrelated domains.` };
    }
  }

  return plan;
}

/**
 * Generate a new use case using static templates (fallback).
 * Detects multiple domains (frontend/backend/AI) and generates:
 *   - One agent per domain (named after primary tech, e.g. reactjs, fastapi)
 *   - Per-domain instruction aligned to each agent
 *   - Per-domain skill aligned to each agent
 *   - Shared prompt routing to all agents
 *   - copilot-instructions.md — always generated (project-level)
 *
 * When Copilot CLI is available, uses AI to derive project name and agent names.
 * Falls back to heuristic naming (business domain + primary framework) when CLI is absent.
 */
export async function generateUseCaseStatic(
  targetDir: string,
  description: string,
  options?: { model?: string },
): Promise<{ slug: string; files: string[] }> {
  const domains = decomposeDomains(description);

  // Resolve naming: AI-powered (Copilot CLI) or heuristic fallback
  const { slug, title: titleCase, resolvedDomains } = await resolveDomainNames(
    targetDir, description, domains, options?.model,
  );

  const githubDir = path.join(targetDir, ".github");

  // Create all output directories in parallel
  const dirPromises: Promise<void>[] = [
    fs.ensureDir(path.join(githubDir, "agents")),
    fs.ensureDir(path.join(githubDir, "prompts")),
    fs.ensureDir(path.join(githubDir, "instructions")),
  ];
  for (const rd of resolvedDomains) {
    dirPromises.push(fs.ensureDir(path.join(githubDir, "skills", rd.agentName)));
  }
  await Promise.all(dirPromises);

  const files: string[] = [];
  const writePromises: Promise<void>[] = [];

  // Generate one agent per detected domain (named after primary tech)
  for (const rd of resolvedDomains) {
    writePromises.push(
      fs.writeFile(
        path.join(githubDir, "agents", `${rd.agentName}.agent.md`),
        generateAgentContent(rd.agentName, rd.agentTitle, description, rd),
      ),
    );
    files.push(`agents/${rd.agentName}.agent.md`);
  }

  // Generate shared prompt (routes to all agents)
  writePromises.push(
    fs.writeFile(
      path.join(githubDir, "prompts", `${slug}.prompt.md`),
      generatePromptContent(slug, titleCase, description, resolvedDomains),
    ),
  );
  files.push(`prompts/${slug}.prompt.md`);

  // Generate copilot-instructions.md (project-level, always)
  writePromises.push(
    fs.writeFile(
      path.join(githubDir, "copilot-instructions.md"),
      generateCopilotInstructionsContent(slug, titleCase, description, resolvedDomains),
    ),
  );
  files.push("copilot-instructions.md");

  // Per-domain instructions — each aligned to its agent
  for (const rd of resolvedDomains) {
    writePromises.push(
      fs.writeFile(
        path.join(githubDir, "instructions", `${rd.agentName}.instructions.md`),
        generateInstructionContent(rd.agentName, rd.agentTitle, description, [rd]),
      ),
    );
    files.push(`instructions/${rd.agentName}.instructions.md`);
  }

  // Per-domain skills — each aligned to its agent
  for (const rd of resolvedDomains) {
    writePromises.push(
      fs.writeFile(
        path.join(githubDir, "skills", rd.agentName, "SKILL.md"),
        generateSkillContent(rd.agentName, rd.agentTitle, description, [rd]),
      ),
    );
    files.push(`skills/${rd.agentName}/SKILL.md`);
  }

  await Promise.all(writePromises);
  return { slug, files };
}

/**
 * Generate hook configuration using static templates (fallback).
 */
export async function generateHooksStatic(
  targetDir: string,
  description: string,
): Promise<{ slug: string; files: string[] }> {
  const slug = deriveProjectName(description);
  const githubDir = path.join(targetDir, ".github");
  const hooksDir = path.join(githubDir, "hooks");
  const scriptsDir = path.join(hooksDir, "scripts");

  await Promise.all([
    fs.ensureDir(hooksDir),
    fs.ensureDir(scriptsDir),
  ]);

  const files: string[] = [];

  // Generate a hook config with common events
  const hookConfig = {
    hooks: {
      PostToolUse: [
        {
          type: "command" as const,
          command: `./.github/hooks/scripts/${slug}-post-tool.sh`,
          timeout: 15,
        },
      ],
      PreToolUse: [
        {
          type: "command" as const,
          command: `./.github/hooks/scripts/${slug}-pre-tool.sh`,
          timeout: 10,
        },
      ],
    },
  };

  await fs.writeFile(
    path.join(hooksDir, `${slug}.json`),
    JSON.stringify(hookConfig, null, 2),
  );
  files.push(`hooks/${slug}.json`);

  // Generate companion scripts
  const postToolScript = `#!/bin/bash
# PostToolUse hook for: ${description}
# Runs after any tool completes successfully.
# Input: JSON on stdin with tool_name, tool_input, tool_response
# Output: JSON on stdout (optional)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Example: run formatter after file edits
if [ "$TOOL_NAME" = "editFiles" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Files were formatted after edit."}}'
fi

exit 0
`;

  const preToolScript = `#!/bin/bash
# PreToolUse hook for: ${description}
# Runs before any tool is invoked.
# Input: JSON on stdin with tool_name, tool_input
# Output: JSON on stdout with permissionDecision

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Example: block dangerous operations
# Uncomment to enable:
# if [ "$TOOL_NAME" = "runTerminalCommand" ]; then
#   COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
#   if echo "$COMMAND" | grep -qE '(rm -rf|DROP TABLE|DELETE FROM)'; then
#     echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Destructive command blocked by policy"}}'
#     exit 0
#   fi
# fi

exit 0
`;

  await Promise.all([
    fs.writeFile(path.join(scriptsDir, `${slug}-post-tool.sh`), postToolScript, { mode: 0o755 }),
    fs.writeFile(path.join(scriptsDir, `${slug}-pre-tool.sh`), preToolScript, { mode: 0o755 }),
  ]);
  files.push(`hooks/scripts/${slug}-post-tool.sh`);
  files.push(`hooks/scripts/${slug}-pre-tool.sh`);

  return { slug, files };
}

/**
 * Generate MCP server configuration using static templates (fallback).
 */
export async function generateMcpConfigStatic(
  targetDir: string,
  description: string,
): Promise<{ slug: string; files: string[] }> {
  const slug = deriveProjectName(description);
  const vscodeDir = path.join(targetDir, ".vscode");
  await fs.ensureDir(vscodeDir);

  const mcpConfig = {
    servers: {
      github: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp",
      },
      playwright: {
        command: "npx",
        args: ["-y", "@microsoft/mcp-server-playwright"],
      },
    },
  };

  const mcpPath = path.join(vscodeDir, "mcp.json");
  if (!(await fs.pathExists(mcpPath))) {
    await fs.writeFile(mcpPath, JSON.stringify(mcpConfig, null, 2));
  }

  return { slug, files: [".vscode/mcp.json"] };
}

/**
 * Generate agentic workflow using static templates (fallback).
 */
export async function generateWorkflowStatic(
  targetDir: string,
  description: string,
): Promise<{ slug: string; files: string[] }> {
  const slug = deriveProjectName(description);
  const title = slugToTitle(slug);
  const githubDir = path.join(targetDir, ".github");
  const workflowsDir = path.join(githubDir, "workflows");
  await fs.ensureDir(workflowsDir);

  const workflowContent = `---
on:
  issues:
    types: [opened, reopened]
permissions:
  contents: read
  issues: write
safe-outputs:
  add-comment:
  add-label:
engine: copilot
---

# ${title}

${description}

## Instructions

When triggered by a new or reopened issue:

1. Read the issue title and body carefully
2. Analyze the content to understand the request
3. Take appropriate action based on the issue type
4. Add a comment summarizing what was done

## Guardrails

- Do not modify repository code directly
- Only add labels and comments
- Be concise and helpful in responses
- If unsure about the intent, ask clarifying questions in a comment
`;

  const filePath = path.join(workflowsDir, `${slug}.md`);
  await fs.writeFile(filePath, workflowContent);

  return { slug, files: [`workflows/${slug}.md`] };
}

// --- Domain detection ---

const DOMAIN_PATTERNS: Array<{
  category: Domain["category"];
  slug: string;
  title: string;
  keywords: RegExp;
  techExtractor: RegExp;
  applyToGlob: string;
}> = [
  {
    category: "frontend",
    slug: "frontend",
    title: "Frontend",
    keywords: /\b(react(?:js)?|vue(?:\.?js)?|angular|svelte|next\.?js|nuxt|frontend|front[- ]end|tailwind(?:css)?|css[- ]?modules|ui|ux|web ?app|solidjs|astro|remix|vite)\b/i,
    techExtractor: /\b(react(?:js)?|vue(?:\.?js)?|angular|svelte|next\.?js|nuxt|tailwind(?:css)?|sass|scss|css[- ]?modules|shadcn|radix|chakra|material[- ]?ui|vite|remix|astro)\b/gi,
    applyToGlob: "**/*.{ts,tsx,js,jsx,css,scss}",
  },
  {
    category: "backend",
    slug: "backend",
    title: "Backend",
    keywords: /\b(express|fastify|nest\.?js|koa|hapi|django|flask|fastapi|rails|spring|backend|back[- ]end|api|server|rest|graphql|node\.?js|nodejs|dotnet|\.net|gin|echo|fiber|laravel|php)\b/i,
    techExtractor: /\b(express|fastify|nest\.?js|koa|hapi|django|flask|fastapi|rails|spring(?:boot)?|node\.?js|nodejs|dotnet|\.net|gin|echo|fiber|laravel|php|prisma|drizzle|sequelize|typeorm|mongoose|graphql|rest|grpc)\b/gi,
    applyToGlob: "**/*.{ts,js,py,java,go,rb,php}",
  },
  {
    category: "ai",
    slug: "ai",
    title: "AI",
    keywords: /\b(ai|ml|machine[- ]?learning|langchain|llm|openai|anthropic|gpt|claude|llama|hugging[- ]?face|transformer|rag|vector|embedding|agent|crew\.?ai|autogen|semantic[- ]?kernel|lang[- ]?graph)\b/i,
    techExtractor: /\b(langchain|openai|anthropic|llama|hugging[- ]?face|tensorflow|pytorch|scikit[- ]?learn|transformers|crew\.?ai|autogen|semantic[- ]?kernel|lang[- ]?graph|pinecone|chroma|weaviate|qdrant|faiss|rag)\b/gi,
    applyToGlob: "**/*.{py,ts,js,ipynb}",
  },
];

/**
 * Decompose a description into detected domains.
 * Returns at least one domain ("general" fallback).
 */
export function decomposeDomains(description: string): Domain[] {
  const domains: Domain[] = [];

  for (const pattern of DOMAIN_PATTERNS) {
    if (pattern.keywords.test(description)) {
      const matches = description.match(pattern.techExtractor) ?? [];
      const techStack = [...new Set(matches.map((m) => m.toLowerCase()))];
      domains.push({
        slug: pattern.slug,
        title: pattern.title,
        category: pattern.category,
        techStack,
        applyToGlob: pattern.applyToGlob,
      });
    }
  }

  if (domains.length === 0) {
    domains.push({
      slug: "general",
      title: slugToTitle(deriveProjectName(description)),
      category: "general",
      techStack: [],
      applyToGlob: "**/*",
    });
  }

  return domains;
}

// --- Template generators ---

/** Domain-specific agent templates keyed by category */
const DOMAIN_AGENT_TEMPLATES: Record<Domain["category"], (slug: string, title: string, description: string, domain: Domain) => string> = {
  frontend: (slug, title, description, domain) => {
    const tech = domain.techStack.length > 0 ? domain.techStack.join(", ") : "React, TailwindCSS";
    return `---
# Generated by AGENT-FORGE
name: "${title}"
description: "Frontend development agent for ${tech}. ${description}"
tools:
  - read
  - edit
  - search
disable-model-invocation: false
---

# ${title}

You are the **${title}** agent — a frontend specialist for this project using **${tech}**.

## Responsibilities

- Build and modify UI components with proper component architecture
- Implement responsive layouts and styling patterns
- Manage client-side state, routing, and data fetching
- Ensure accessibility (WCAG 2.1 AA) and performance best practices
- Write component tests and handle error boundaries

## Technical Standards

- Use functional components with hooks (no class components)
- Apply utility-first CSS classes; avoid inline styles
- Extract reusable components when a pattern appears 2+ times
- Co-locate component files: \`Component.tsx\`, \`Component.test.tsx\`
- Use TypeScript strict mode; no \`any\` types in component props

## Process

1. **Understand** — Read existing components and identify patterns in use
2. **Plan** — Propose the component tree and state management approach
3. **Build** — Create/modify components following project conventions
4. **Verify** — Check for type errors, accessibility, and responsiveness
`;
  },

  backend: (slug, title, description, domain) => {
    const tech = domain.techStack.length > 0 ? domain.techStack.join(", ") : "Node.js, Express";
    return `---
# Generated by AGENT-FORGE
name: "${title}"
description: "Backend development agent for ${tech}. ${description}"
tools:
  - read
  - edit
  - search
disable-model-invocation: false
---

# ${title}

You are the **${title}** agent — a backend specialist for this project using **${tech}**.

## Responsibilities

- Design and implement API endpoints with proper routing
- Build service layers with business logic separated from controllers
- Configure middleware chains (auth, validation, error handling, logging)
- Manage database models, migrations, and query optimization
- Implement input validation and sanitization at API boundaries

## Technical Standards

- Follow controller → service → repository layered architecture
- Validate all external input with schema validation (Zod, Joi, or Pydantic)
- Return consistent error response format: \`{ error, message, statusCode }\`
- Use environment variables for configuration; never hardcode secrets
- Write integration tests for API endpoints; unit tests for services

## Process

1. **Understand** — Read existing routes, middleware, and service patterns
2. **Design** — Propose endpoint signatures, request/response schemas
3. **Build** — Implement following the existing layered architecture
4. **Verify** — Check error handling, input validation, and edge cases
`;
  },

  ai: (slug, title, description, domain) => {
    const tech = domain.techStack.length > 0 ? domain.techStack.join(", ") : "Python, LangChain";
    return `---
# Generated by AGENT-FORGE
name: "${title}"
description: "AI/ML development agent for ${tech}. ${description}"
tools:
  - read
  - edit
  - search
disable-model-invocation: false
---

# ${title}

You are the **${title}** agent — an AI/ML specialist for this project using **${tech}**.

## Responsibilities

- Design and implement LLM chains, agents, and RAG pipelines
- Build AI-powered API endpoints with streaming support
- Manage prompt templates, system prompts, and few-shot examples
- Implement retry logic, rate limiting, and fallback strategies for AI calls
- Handle AI response parsing, validation, and error recovery

## Technical Standards

- Use async/await for all AI API calls; support SSE streaming responses
- Sanitize user input before passing to LLM prompts (prevent injection)
- Implement token counting and context window management
- Store prompt templates as separate files, not inline strings
- Add structured logging for AI calls: model, tokens, latency, status

## Process

1. **Understand** — Read existing AI integration patterns and prompt templates
2. **Design** — Propose chain architecture, model selection, and data flow
3. **Build** — Implement chains/agents with proper error handling and streaming
4. **Verify** — Test with edge cases: empty input, max tokens, rate limits
`;
  },

  general: (slug, title, description, _domain) => {
    return `---
# Generated by AGENT-FORGE
name: "${title}"
description: "${description}"
tools:
  - read
  - edit
  - search
disable-model-invocation: false
---

# ${title}

You are the **${title}** agent. ${description}.

## Responsibilities

- Analyze the workspace to understand the current state
- Apply domain expertise related to: ${title.toLowerCase()}
- Provide actionable recommendations
- Generate or modify files as needed

## Process

1. **Understand** — Read relevant files and understand the context
2. **Analyze** — Apply your expertise to identify opportunities
3. **Act** — Make changes or provide recommendations
4. **Report** — Summarize what was done and suggest next steps
`;
  },
};

function generateAgentContent(
  slug: string,
  title: string,
  description: string,
  domain: Domain,
): string {
  return DOMAIN_AGENT_TEMPLATES[domain.category](slug, title, description, domain);
}

function generatePromptContent(
  slug: string,
  title: string,
  description: string,
  domains: ResolvedDomain[] | Domain[],
): string {
  const effectiveDomains = domains.map((d) => ({
    ...d,
    agentName: "agentName" in d ? (d as ResolvedDomain).agentName : slug,
    agentTitle: "agentTitle" in d ? (d as ResolvedDomain).agentTitle : d.title,
  }));
  const agentRefs = effectiveDomains.length > 1
    ? effectiveDomains.map((d) => `- **@${d.agentTitle}** — ${d.category} tasks (${d.techStack.join(", ") || d.category})`).join("\n")
    : `Use the **@${effectiveDomains[0].agentTitle}** agent for all tasks.`;

  return `---
# Generated by AGENT-FORGE
name: "${slug}"
description: "${description}"
---

# ${title}

\${input:task:Describe the feature or task you want to build}

## Available Agents

${agentRefs}

## Workflow

1. Analyze the task requirements and identify which layers are affected
2. Route to the appropriate specialized agent(s)
3. Implement changes following project conventions
4. Verify integration between layers if multiple agents were involved
`;
}

function generateInstructionContent(
  slug: string,
  title: string,
  description: string,
  domains: Domain[],
): string {
  const applyTo = domains.length === 1
    ? domains[0].applyToGlob
    : mergeGlobs(domains.map((d) => d.applyToGlob));

  const domainSections = domains.map((domain) => {
    switch (domain.category) {
      case "frontend":
        return `## Frontend Standards (${domain.techStack.join(", ") || "UI"})

- Use functional components with hooks; no class components
- Apply utility-first CSS classes; extract repeated patterns into components
- Keep components small and focused; one component per file
- Use TypeScript strict mode; define explicit prop interfaces
- Handle loading, error, and empty states in every data-fetching component
- Ensure accessibility: semantic HTML, ARIA labels, keyboard navigation`;
      case "backend":
        return `## Backend Standards (${domain.techStack.join(", ") || "API"})

- Follow controller → service → repository layered architecture
- Validate all external input at API boundaries with schema validation
- Return consistent error format: \`{ error, message, statusCode }\`
- Use environment variables for config; never hardcode secrets or credentials
- Implement proper HTTP status codes (201 for creation, 404 for missing, etc.)
- Add request logging middleware and structured error handling`;
      case "ai":
        return `## AI/ML Standards (${domain.techStack.join(", ") || "AI"})

- Use async/await for all AI API calls with timeout and retry logic
- Sanitize user input before injecting into prompt templates
- Implement streaming (SSE) for long-running AI responses
- Store prompt templates in separate files, not inline strings
- Add structured logging: model, token count, latency, status
- Handle rate limits gracefully with exponential backoff`;
      default:
        return `## General Standards

- Follow the project's existing conventions and patterns
- Ensure all changes are tested and verified
- Document significant decisions and trade-offs`;
    }
  }).join("\n\n");

  return `---
# Generated by AGENT-FORGE
name: "${slug}"
description: "Coding standards for ${title.toLowerCase()} — auto-applied to matching files"
applyTo: "${applyTo}"
---

# ${title} — Coding Guidelines

${domainSections}

## Quality Checks

- Verify changes don't break existing functionality
- Check edge cases and error handling at system boundaries
- Ensure consistency with the rest of the codebase
`;
}

function generateSkillContent(
  slug: string,
  title: string,
  description: string,
  domains: Domain[],
): string {
  const domainSections = domains.map((domain) => {
    const tech = domain.techStack.length > 0 ? ` (${domain.techStack.join(", ")})` : "";
    switch (domain.category) {
      case "frontend":
        return `## Frontend Architecture${tech}

- **Component pattern**: Functional components with hooks, co-located tests
- **Styling**: Utility-first CSS (TailwindCSS), responsive design with mobile-first breakpoints
- **State management**: Local state with hooks, server state with data fetching libraries
- **Routing**: File-based or declarative routing with lazy loading
- **Common pitfalls**: Unnecessary re-renders, missing error boundaries, accessibility gaps`;
      case "backend":
        return `## Backend Architecture${tech}

- **API pattern**: RESTful endpoints with consistent naming conventions
- **Layers**: Controller (HTTP) → Service (business logic) → Repository (data access)
- **Auth**: JWT or session-based authentication with middleware guards
- **Validation**: Schema validation at API boundaries (Zod, Joi, or Pydantic)
- **Common pitfalls**: N+1 queries, missing input validation, inconsistent error responses`;
      case "ai":
        return `## AI/ML Architecture${tech}

- **Chain pattern**: Input → Prompt template → LLM call → Output parser → Response
- **Streaming**: Server-Sent Events (SSE) for real-time AI responses
- **RAG pipeline**: Document loading → Chunking → Embedding → Vector store → Retrieval
- **Prompt management**: Versioned templates with variable injection
- **Common pitfalls**: Token limit overflow, prompt injection, missing retry logic`;
      default:
        return `## Architecture

- Domain-specific patterns and best practices
- Reference examples and templates`;
    }
  }).join("\n\n");

  const triggerPhrases = domains.map((d) => d.techStack.join(", ")).filter(Boolean).join(", ");

  return `---
# Generated by AGENT-FORGE
name: "${slug}"
description: "${description}. Provides architecture patterns and domain knowledge. USE FOR: ${triggerPhrases || title.toLowerCase()}, scaffolding, debugging, code review."
---

# ${title} — Domain Knowledge

## Overview

This skill provides reference architecture and patterns for the **${title}** project.

${domainSections}

## When to Use

Load this skill when working on any task related to this project's architecture,
scaffolding new features, debugging integration issues, or reviewing code quality.
`;
}

/**
 * Generate the project-level copilot-instructions.md.
 * This file is loaded by Copilot for EVERY interaction.
 * Contains a brief overview, tech stack, architecture, and agent references.
 */
function generateCopilotInstructionsContent(
  slug: string,
  title: string,
  description: string,
  domains: ResolvedDomain[] | Domain[],
): string {
  const effectiveDomains = domains.map((d) => ({
    ...d,
    agentName: "agentName" in d ? (d as ResolvedDomain).agentName : slug,
    agentTitle: "agentTitle" in d ? (d as ResolvedDomain).agentTitle : d.title,
  }));
  const allTech = domains.flatMap((d) => d.techStack).filter(Boolean);
  const techSummary = allTech.length > 0
    ? `Tech stack: ${[...new Set(allTech)].join(", ")}.`
    : "";

  const agentSection = effectiveDomains
    .map((d) => {
      const tech = d.techStack.length > 0 ? ` (${d.techStack.join(", ")})` : "";
      return `- **@${d.agentTitle}**${tech} — see \`agents/${d.agentName}.agent.md\`, \`instructions/${d.agentName}.instructions.md\`, \`skills/${d.agentName}/SKILL.md\``;
    })
    .join("\n");

  const architectureLines: string[] = [];
  for (const domain of domains) {
    switch (domain.category) {
      case "frontend":
        architectureLines.push(`- **Frontend**: Component-based UI with utility-first CSS. File pattern: \`${domain.applyToGlob}\``);
        break;
      case "backend":
        architectureLines.push(`- **Backend**: Controller → Service → Repository layered architecture. File pattern: \`${domain.applyToGlob}\``);
        break;
      case "ai":
        architectureLines.push(`- **AI/ML**: LLM chains, prompt templates, and RAG pipelines. File pattern: \`${domain.applyToGlob}\``);
        break;
      default:
        architectureLines.push(`- **General**: Follow existing project conventions`);
    }
  }

  return `---
# Generated by AGENT-FORGE
# This file is loaded by GitHub Copilot for EVERY interaction in this workspace.
# Keep it concise — detailed rules belong in per-agent instructions and skills.
---

# ${title}

${description}

${techSummary}

## Architecture

${architectureLines.join("\n")}

## Agents

${agentSection}

## Key Conventions

- Never hardcode secrets or credentials — use environment variables
- All external input must be validated at API boundaries
- Follow the existing code style and patterns in each layer
- When uncertain which agent to use, check the prompt: \`prompts/${slug}.prompt.md\`

## What NOT to Do

- Do not mix concerns across layers (e.g., UI logic in backend, DB queries in controllers)
- Do not bypass input validation or error handling
- Do not introduce new patterns without checking existing conventions first
`;
}

function generateReadmeContent(
  slug: string,
  title: string,
  description: string,
): string {
  return `<!-- Generated by AGENT-FORGE -->
# ${title}

${description}

## Artifacts

| Type | File | Description |
|------|------|-------------|
| Agent | \`agents/${slug}.agent.md\` | Main ${title.toLowerCase()} agent |
| Prompt | \`prompts/${slug}.prompt.md\` | \`/${slug}\` slash command |
| Instruction | \`instructions/${slug}.instructions.md\` | Quality rules |
| Skill | \`skills/${slug}/SKILL.md\` | Domain knowledge |

## Installation

Copy the contents of this directory into your project's \`.github/\` folder:

\`\`\`bash
cp -r agents/ .github/agents/
cp -r prompts/ .github/prompts/
cp -r instructions/ .github/instructions/
cp -r skills/ .github/skills/
\`\`\`

## Usage

In GitHub Copilot Chat:

\`\`\`
@${title} <your request>
\`\`\`

Or use the slash command:

\`\`\`
/${slug} <your request>
\`\`\`
`;
}

// --- Utilities ---

/** Domain augmented with resolved agent naming */
export interface ResolvedDomain extends Domain {
  agentName: string;
  agentTitle: string;
}

/**
 * Derive an agent file name from the domain's detected tech stack.
 * Matches the AI planner's naming style: use primary framework name.
 * Fallback: generic layer name (frontend, backend, ai).
 */
function deriveDomainAgentName(domain: Domain): string {
  const FRAMEWORK_PRIORITY: Record<string, string> = {
    // Frontend
    "react": "reactjs", "reactjs": "reactjs",
    "next.js": "nextjs", "nextjs": "nextjs",
    "vue": "vue", "vuejs": "vue",
    "angular": "angular",
    "svelte": "svelte",
    "nuxt": "nuxt",
    "remix": "remix",
    "astro": "astro",
    // Backend
    "fastapi": "fastapi",
    "express": "express",
    "nestjs": "nestjs", "nest.js": "nestjs",
    "django": "django",
    "flask": "flask",
    "rails": "rails",
    "spring": "spring", "springboot": "spring",
    "laravel": "laravel",
    ".net": "dotnet", "dotnet": "dotnet",
    "gin": "gin",
    "fiber": "fiber",
    "koa": "koa",
    "hapi": "hapi",
    "fastify": "fastify",
    // AI
    "langchain": "langchain",
    "langgraph": "langgraph", "lang-graph": "langgraph",
    "crewai": "crewai", "crew.ai": "crewai",
    "autogen": "autogen",
    "semantic-kernel": "semantic-kernel",
  };

  for (const tech of domain.techStack) {
    const normalized = tech.toLowerCase();
    if (FRAMEWORK_PRIORITY[normalized]) {
      return FRAMEWORK_PRIORITY[normalized];
    }
  }

  // Fallback to generic layer name
  return domain.slug; // "frontend", "backend", "ai", "general"
}

/**
 * Resolve domain agent names using AI (Copilot CLI) when available,
 * falling back to heuristic framework-based naming.
 */
async function resolveDomainNames(
  targetDir: string,
  description: string,
  domains: Domain[],
  model?: string,
): Promise<{ slug: string; title: string; resolvedDomains: ResolvedDomain[] }> {
  // Try AI-powered naming first
  const { resolveNamingWithAI } = await import("./copilot-cli.js");
  const aiNaming = await resolveNamingWithAI(targetDir, description, model);

  if (aiNaming && aiNaming.slug && aiNaming.agents?.length > 0) {
    // Build a lookup from AI agent categories to names
    const aiAgentMap = new Map<string, { name: string; title: string }>();
    for (const agent of aiNaming.agents) {
      aiAgentMap.set(agent.category, { name: agent.name, title: agent.title });
    }

    const resolvedDomains = domains.map((domain) => {
      const aiAgent = aiAgentMap.get(domain.category);
      return {
        ...domain,
        agentName: aiAgent?.name ?? deriveDomainAgentName(domain),
        agentTitle: aiAgent?.title ?? domain.title,
      };
    });

    return {
      slug: aiNaming.slug,
      title: aiNaming.title,
      resolvedDomains,
    };
  }

  // Heuristic fallback: business domain slug + tech-based agent names
  const slug = deriveProjectName(description);
  const resolvedDomains = domains.map((domain) => ({
    ...domain,
    agentName: deriveDomainAgentName(domain),
    agentTitle: domain.title,
  }));

  return {
    slug,
    title: slugToTitle(slug),
    resolvedDomains,
  };
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "with", "using", "for", "of", "to", "in",
  "on", "at", "by", "from", "as", "is", "it", "its", "that", "this",
  "be", "are", "was", "were", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "shall", "should", "may",
  "can", "could", "might", "must", "need", "also", "just", "very",
  "application", "app", "project", "based", "platform", "system",
  // Architecture layer terms — these describe *how*, not *what*
  "backend", "frontend", "front", "end", "back", "server", "client",
  // Generic tech/language terms that add noise to slugs
  "net", "python", "java", "ruby", "php", "go", "rust",
  // Generic AI/ML terms — specific tools (langchain, openai) stay
  "ai", "ml", "llm", "llms", "gpt", "multiagent",
  // Filler verbs/prepositions common in descriptions
  "connect", "drive", "driven", "supported", "suppported", "wil",
  "build", "create", "make", "manage", "run", "running", "use",
  "implement", "service", "services",
  "framework", "workflow", "library", "tool", "tools",
]);

/**
 * Business domain terms — prioritized in slug generation.
 * These describe *what* the project does, not *how* it's built.
 */
const BUSINESS_DOMAIN_PATTERNS: Array<{ pattern: RegExp; term: string }> = [
  { pattern: /\be[- ]?commerce\b/i, term: "ecommerce" },
  { pattern: /\bonline[- ]?shop(?:ping)?\b/i, term: "ecommerce" },
  { pattern: /\bmarketplace\b/i, term: "marketplace" },
  { pattern: /\bhealthcare\b/i, term: "healthcare" },
  { pattern: /\bfintech\b/i, term: "fintech" },
  { pattern: /\bblog(?:ging)?\b/i, term: "blog" },
  { pattern: /\bcms\b/i, term: "cms" },
  { pattern: /\bchat(?:bot)?\b/i, term: "chat" },
  { pattern: /\bdashboard\b/i, term: "dashboard" },
  { pattern: /\banalytics\b/i, term: "analytics" },
  { pattern: /\binventory\b/i, term: "inventory" },
  { pattern: /\bcrm\b/i, term: "crm" },
  { pattern: /\berp\b/i, term: "erp" },
  { pattern: /\bsaas\b/i, term: "saas" },
  { pattern: /\bsocial[- ]?media\b/i, term: "social" },
  { pattern: /\biot\b/i, term: "iot" },
  { pattern: /\bedtech\b/i, term: "edtech" },
  { pattern: /\bpayment\b/i, term: "payment" },
  { pattern: /\bbooking\b/i, term: "booking" },
  { pattern: /\bscheduling\b/i, term: "scheduling" },
  { pattern: /\btask[- ]?manag/i, term: "taskmanager" },
  { pattern: /\bportfolio\b/i, term: "portfolio" },
];

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/**
 * Derive a short, meaningful project name from a verbose description.
 * Prioritizes business domain terms (e-commerce, dashboard, etc.) over
 * generic architecture/tech terms. Strips stop words and filler.
 *
 * Strategy:
 *   1. Extract business domain terms first (e-commerce → "ecommerce")
 *   2. Extract key tech differentiators (fastapi, langchain, react)
 *   3. Combine: domain terms first, then up to 2-3 tech terms
 *   4. Max 4 terms total for a short, readable slug
 */
export function deriveProjectName(description: string): string {
  // Step 1: Extract business domain terms
  const domainTerms: string[] = [];
  const seenDomains = new Set<string>();
  for (const { pattern, term } of BUSINESS_DOMAIN_PATTERNS) {
    if (pattern.test(description) && !seenDomains.has(term)) {
      seenDomains.add(term);
      domainTerms.push(term);
    }
  }

  // Step 2: Normalize and extract remaining meaningful words
  let normalized = description.toLowerCase().replace(/full[- ]?stack/gi, "fullstack");
  // Normalize compound terms before splitting
  normalized = normalized.replace(/e[- ]commerce/gi, "ecommerce");
  normalized = normalized.replace(/multi[- ]agent(?:ic)?/gi, "multiagent");

  const words = normalized
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  // Deduplicate and normalize aliases
  const seen = new Set<string>(seenDomains); // skip already-captured domain terms
  const techTerms: string[] = [];
  for (const word of words) {
    const key = word
      .replace(/^reactjs$/, "react")
      .replace(/^nodejs$/, "node")
      .replace(/^tailwindcss$/, "tailwind")
      .replace(/^vuejs$/, "vue")
      .replace(/^nextjs$/, "next");
    if (!seen.has(key)) {
      seen.add(key);
      techTerms.push(key);
    }
  }

  // Step 3: Combine — domain terms first, then fill with tech terms
  const maxTerms = 3;
  const maxTech = Math.max(1, maxTerms - domainTerms.length);
  const combined = [...domainTerms, ...techTerms.slice(0, maxTech)];

  const slug = combined.join("-").replace(/-$/, "");
  return slug || toKebabCase(description);
}

/**
 * Merge multiple applyTo globs into one combined glob.
 */
function mergeGlobs(globs: string[]): string {
  const extensions = new Set<string>();
  for (const glob of globs) {
    const match = glob.match(/\*\*\/\*\.\{?([^}]+)\}?$/);
    if (match) {
      for (const ext of match[1].split(",")) {
        extensions.add(ext.trim());
      }
    }
  }
  if (extensions.size === 0) return "**/*";
  const sorted = [...extensions].sort();
  return sorted.length === 1 ? `**/*.${sorted[0]}` : `**/*.{${sorted.join(",")}}`;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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

import { execSync, spawn } from "child_process";
import { select } from "@inquirer/prompts";
import type { Domain, GenerationMode, ArtifactType, GenerationPlan, PlannedAgent } from "../types.js";
import type { WorkspaceInfo } from "../types.js";

let _copilotCliInstalled: boolean | undefined;

/**
 * Check if the GitHub Copilot CLI (`copilot`) binary is available.
 * Result is cached for the process lifetime.
 */
export function isCopilotCliInstalled(): boolean {
  if (_copilotCliInstalled !== undefined) return _copilotCliInstalled;
  try {
    execSync("copilot --version", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    _copilotCliInstalled = true;
  } catch {
    _copilotCliInstalled = false;
  }
  return _copilotCliInstalled;
}

/**
 * Get the installed Copilot CLI version string, or null if not installed.
 */
export function getCopilotCliVersion(): string | null {
  try {
    const output = execSync("copilot --version", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const match = output.match(/(\d+\.\d+[\d.]*)/);
    return match ? match[1] : output.slice(0, 30);
  } catch {
    return null;
  }
}

/**
 * Lightweight single-shot Copilot CLI call that captures stdout as JSON.
 * No agent routing — direct prompt → structured response.
 * Used for quick decisions (naming, classification) without the full pipeline.
 */
export function callCopilotForJson<T = unknown>(
  workingDir: string,
  prompt: string,
  options?: { model?: string; timeoutMs?: number },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const args = ["-p", prompt, "--autopilot"];
    if (options?.model) args.push("--model", options.model);

    const child = spawn("copilot", args, {
      cwd: workingDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    const timeout = options?.timeoutMs ?? 30_000;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Copilot CLI timed out after ${timeout}ms`));
    }, timeout);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to launch Copilot CLI: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const raw = Buffer.concat(chunks).toString("utf-8");
      // Extract JSON from potentially noisy output (preamble/postamble)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        reject(new Error(`No JSON found in Copilot output (exit ${code}): ${raw.slice(0, 300)}`));
        return;
      }
      try {
        resolve(JSON.parse(jsonMatch[0]) as T);
      } catch (e) {
        reject(new Error(`Failed to parse JSON: ${(e as Error).message}\nRaw: ${jsonMatch[0].slice(0, 300)}`));
      }
    });
  });
}

/** Result of AI-powered naming resolution */
export interface NamingResult {
  slug: string;
  title: string;
  agents: Array<{ name: string; title: string; category: "frontend" | "backend" | "ai" | "general" }>;
}

/**
 * Ask the LLM to derive a clean project slug and per-domain agent names.
 * Returns null if Copilot CLI is unavailable or the call fails.
 */
export async function resolveNamingWithAI(
  workingDir: string,
  description: string,
  model?: string,
): Promise<NamingResult | null> {
  if (!isCopilotCliInstalled()) return null;

  const prompt = `You are a naming expert for GitHub Copilot agent projects. Given this project description, output ONLY a JSON object (no markdown, no explanation, no code fences).

Description: "${description}"

Rules:
- "slug": short kebab-case business domain name (1-2 words). Use the BUSINESS purpose (e-commerce→"ecommerce", blog→"blog", dashboard→"dashboard"), NOT tech stack names.
- "title": Human-readable title for the project (2-4 words).
- "agents": array of agents, one per detected technology layer. Each agent "name" should be the PRIMARY framework/library in kebab-case (e.g. "reactjs", "fastapi", "langchain", "nextjs", "express", "django"). If no specific framework, use the layer name ("frontend", "backend", "ai"). Agent names must be 1 word, distinct, non-overlapping.
- "category": one of "frontend", "backend", "ai", "general".

Output ONLY this JSON:
{"slug":"...","title":"...","agents":[{"name":"...","title":"...","category":"..."}]}`;

  try {
    return await callCopilotForJson<NamingResult>(
      workingDir,
      prompt,
      { model: model ?? "claude-sonnet-4.6", timeoutMs: 20_000 },
    );
  } catch {
    // AI naming failed — caller should fall back to heuristic
    return null;
  }
}

/** Available models ordered by speed (fastest first) */
export const AVAILABLE_MODELS = [
  { value: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", description: "Fastest — best speed/quality tradeoff (recommended)" },
  { value: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", description: "Fast — higher quality reasoning" },
  { value: "gpt-5.2-codex", name: "GPT 5.2 Codex", description: "Balanced — strong code generation" },
  { value: "claude-opus-4.6", name: "Claude Opus 4.6", description: "Slowest — highest quality output" },
] as const;

/**
 * Interactive model picker. Returns the selected model ID.
 */
export async function selectModel(): Promise<string> {
  return select({
    message: "Select a model for AI generation:",
    choices: AVAILABLE_MODELS.map((m) => ({
      value: m.value,
      name: `${m.name} — ${m.description}`,
    })),
    default: "claude-sonnet-4.6",
  });
}

/**
 * Launch the Copilot CLI in the given working directory with a pre-formed prompt.
 * Routes to the forge-orchestrator agent with autopilot for multi-agent generation.
 */
export function launchCopilotCli(
  workingDir: string,
  prompt: string,
  options?: { model?: string; agent?: string },
): Promise<number> {
  return new Promise((resolve, reject) => {
    const agentName = options?.agent ?? "forge-orchestrator";
    const args = [
      "-p", prompt,
      "--agent", agentName,
      "--autopilot",
      "--allow-all",
    ];

    if (options?.model) {
      args.push("--model", options.model);
    }

    const child = spawn("copilot", args, {
      cwd: workingDir,
      stdio: "inherit",
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to launch Copilot CLI: ${err.message}`));
    });

    child.on("close", (code) => {
      resolve(code ?? 0);
    });
  });
}

/**
 * Build the generation prompt for Copilot CLI.
 * Self-contained prompt with exact file paths and inline format specs.
 * No subagent orchestration — the forge-generator agent handles everything in a single pass.
 */
export function buildGenerationPrompt(
  slug: string,
  title: string,
  description: string,
  domains: Domain[] = [],
): string {
  const effectiveDomains = domains.length > 0 ? domains : [{ slug: "general", title, category: "general" as const, techStack: [] as string[], applyToGlob: "**/*" }];

  const agentFiles = effectiveDomains.map((d) => {
    const agentSlug = effectiveDomains.length > 1 ? `${slug}-${d.slug}` : slug;
    const tech = d.techStack.length > 0 ? ` specializing in ${d.techStack.join(", ")}` : "";
    return `- \`.github/agents/${agentSlug}.agent.md\` — ${d.title} specialist${tech}`;
  }).join("\n");

  const applyToGlob = effectiveDomains.length === 1
    ? effectiveDomains[0].applyToGlob
    : mergeApplyToGlobs(effectiveDomains.map((d) => d.applyToGlob));

  const domainContext = effectiveDomains.map((d) => {
    const tech = d.techStack.length > 0 ? d.techStack.join(", ") : d.category;
    return `- **${d.title}** (${tech}): ${d.category} domain`;
  }).join("\n");

  return [
    `Generate Copilot customization files for: "${description}"`,
    ``,
    `## Exact files to create`,
    ``,
    `### Agents`,
    agentFiles,
    ``,
    `Each agent MUST have:`,
    `- Frontmatter: name, description, tools (choose from: read, edit, search)`,
    `- Body starting with: "You are the **Name** — a [role] that [purpose]."`,
    `- ## Responsibilities (4-6 specific duties for this domain)`,
    `- ## Technical Standards (4-6 concrete rules for ${effectiveDomains.map((d) => d.techStack.join(", ") || d.category).join(", ")})`,
    `- ## Process (numbered: Understand → Plan → Build → Verify)`,
    ``,
    `### Prompt`,
    `- \`.github/prompts/${slug}.prompt.md\``,
    `- Frontmatter: name ("${slug}"), description`,
    `- Body: task description, \${input:task:placeholder}, output format, focus areas`,
    ``,
    `### Instruction`,
    `- \`.github/instructions/${slug}.instructions.md\``,
    `- Frontmatter: name ("${slug}"), description, applyTo ("${applyToGlob}")`,
    `- Body: ## headings grouping rules, bullet points with reasoning, code examples`,
    ``,
    `### Skill`,
    `- \`.github/skills/${slug}/SKILL.md\``,
    `- Frontmatter: name ("${slug}"), description (include USE FOR / DO NOT USE FOR trigger phrases)`,
    `- Body: ## Overview, architecture patterns, ## When to Use, ## When NOT to Use`,
    ``,
    `## Domain context`,
    domainContext,
    ``,
    `## Rules`,
    `- Write EVERY file listed above. Do not skip any.`,
    `- Content must be specific to "${description}" — no generic placeholders.`,
    `- Instructions must use the applyTo glob "${applyToGlob}" — not "**/*" unless truly universal.`,
    `- Do NOT create any files outside .github/.`,
    `- Do NOT run validation or review after generating.`,
    `- Stop after all files are written.`,
  ].join("\n");
}

/** Merge multiple applyTo globs into one combined glob. */
function mergeApplyToGlobs(globs: string[]): string {
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

/**
 * Build an orchestration prompt for the multi-agent Copilot CLI generation.
 * Instructs the orchestrator on which sub-agents to invoke based on the generation mode.
 */
export function buildOrchestrationPrompt(
  mode: GenerationMode,
  slug: string,
  title: string,
  description: string,
  domains: Domain[] = [],
  selectedTypes?: ArtifactType[],
): string {
  const effectiveDomains = domains.length > 0 ? domains : [{ slug: "general", title, category: "general" as const, techStack: [] as string[], applyToGlob: "**/*" }];

  const domainContext = effectiveDomains.map((d) => {
    const tech = d.techStack.length > 0 ? d.techStack.join(", ") : d.category;
    return `- **${d.title}** (${tech}): ${d.category} domain`;
  }).join("\n");

  const applyToGlob = effectiveDomains.length === 1
    ? effectiveDomains[0].applyToGlob
    : mergeApplyToGlobs(effectiveDomains.map((d) => d.applyToGlob));

  const sections: string[] = [
    `Generate Copilot customization files for: "${description}"`,
    ``,
    `## Generation Mode: ${mode}`,
    ``,
    `## Context`,
    `- Slug: ${slug}`,
    `- Title: ${title}`,
    `- ApplyTo glob: ${applyToGlob}`,
    ``,
    `## Domains`,
    domainContext,
    ``,
  ];

  // Mode-specific instructions
  switch (mode) {
    case "full":
      sections.push(...buildFullModeInstructions(slug, title, description, effectiveDomains, applyToGlob));
      break;
    case "on-demand": {
      const types = selectedTypes ?? ["agent", "instruction", "prompt", "skill"];
      sections.push(...buildOnDemandInstructions(slug, title, description, effectiveDomains, applyToGlob, types));
      break;
    }
    case "hooks":
      sections.push(...buildHooksModeInstructions(slug, title, description));
      break;
    case "mcp-server":
      sections.push(...buildMcpModeInstructions(slug, title, description));
      break;
    case "agentic-workflow":
      sections.push(...buildWorkflowModeInstructions(slug, title, description));
      break;
    case "discovery":
      sections.push(...buildDiscoveryModeInstructions(slug, title, description, effectiveDomains, applyToGlob));
      break;
  }

  sections.push(
    ``,
    `## Rules`,
    `- Delegate to the appropriate sub-agents. Do NOT write artifact files directly.`,
    `- Run sub-agents in parallel when they are independent.`,
    `- Content must be specific to "${description}" — no generic placeholders.`,
    `- Stop after all files are written. Do NOT run validation.`,
  );

  return sections.join("\n");
}

function buildFullModeInstructions(
  slug: string,
  _title: string,
  description: string,
  domains: Domain[],
  applyToGlob: string,
): string[] {
  const agentFiles = domains.map((d) => {
    const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
    const tech = d.techStack.length > 0 ? ` specializing in ${d.techStack.join(", ")}` : "";
    return `  - \`.github/agents/${agentSlug}.agent.md\` — ${d.title} specialist${tech}`;
  }).join("\n");

  const instructionFiles = domains.map((d) => {
    const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
    return `  - \`.github/instructions/${agentSlug}.instructions.md\` with applyTo: "${d.applyToGlob}"`;
  }).join("\n");

  const skillFiles = domains.map((d) => {
    const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
    return `  - \`.github/skills/${agentSlug}/SKILL.md\``;
  }).join("\n");

  return [
    `## Sub-agents to invoke (in parallel)`,
    ``,
    `### 1. forge-agent-writer`,
    `Create these agent files:`,
    agentFiles,
    ``,
    `### 2. forge-prompt-writer`,
    `Create: \`.github/prompts/${slug}.prompt.md\``,
    ``,
    `### 3. forge-instruction-writer`,
    `Create per-agent instruction files (each with its own applyTo glob):`,
    instructionFiles,
    ``,
    `### 4. forge-skill-writer`,
    `Create per-agent skill files (each with USE FOR/DO NOT USE FOR trigger phrases):`,
    skillFiles,
    ``,
    `Description for all: "${description}"`,
  ];
}

function buildOnDemandInstructions(
  slug: string,
  _title: string,
  description: string,
  domains: Domain[],
  applyToGlob: string,
  types: ArtifactType[],
): string[] {
  const sections: string[] = [`## Sub-agents to invoke (selected types only)`, ``];

  for (const type of types) {
    switch (type) {
      case "agent": {
        const agentFiles = domains.map((d) => {
          const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
          return `  - \`.github/agents/${agentSlug}.agent.md\``;
        }).join("\n");
        sections.push(`### forge-agent-writer`, `Create:`, agentFiles, ``);
        break;
      }
      case "prompt":
        sections.push(`### forge-prompt-writer`, `Create: \`.github/prompts/${slug}.prompt.md\``, ``);
        break;
      case "instruction":
        sections.push(`### forge-instruction-writer`, `Create: \`.github/instructions/${slug}.instructions.md\` with applyTo: "${applyToGlob}"`, ``);
        break;
      case "skill":
        sections.push(`### forge-skill-writer`, `Create: \`.github/skills/${slug}/SKILL.md\``, ``);
        break;
      case "hook":
        sections.push(`### forge-hook-writer`, `Create: \`.github/hooks/${slug}.json\` with companion scripts`, ``);
        break;
      case "mcp-server":
        sections.push(`### forge-mcp-writer`, `Create: \`.vscode/mcp.json\``, ``);
        break;
      case "agentic-workflow":
        sections.push(`### forge-workflow-writer`, `Create: \`.github/workflows/${slug}.md\``, ``);
        break;
    }
  }

  sections.push(`Description for all: "${description}"`);
  return sections;
}

function buildHooksModeInstructions(slug: string, _title: string, description: string): string[] {
  return [
    `## Sub-agent to invoke`,
    ``,
    `### forge-hook-writer`,
    `Create: \`.github/hooks/${slug}.json\``,
    `Also create companion scripts in \`.github/hooks/scripts/\``,
    ``,
    `Purpose: "${description}"`,
    `Choose the most appropriate hook events for this use case.`,
  ];
}

function buildMcpModeInstructions(slug: string, _title: string, description: string): string[] {
  return [
    `## Sub-agent to invoke`,
    ``,
    `### forge-mcp-writer`,
    `Create: \`.vscode/mcp.json\``,
    ``,
    `Purpose: "${description}"`,
    `Choose the most relevant MCP servers for this use case.`,
    `Use \${input:...} for any API keys or secrets.`,
  ];
}

function buildWorkflowModeInstructions(slug: string, _title: string, description: string): string[] {
  return [
    `## Sub-agent to invoke`,
    ``,
    `### forge-workflow-writer`,
    `Create: \`.github/workflows/${slug}.md\``,
    ``,
    `Purpose: "${description}"`,
    `Choose the most appropriate trigger type and pattern for this use case.`,
    `Include proper permissions and safe-outputs configuration.`,
  ];
}

// ─── Plan-then-Execute pipeline ───

/**
 * Build a planning prompt for the forge-planner agent.
 * The planner will analyze the use case and write a forge-plan.json.
 */
export function buildPlanningPrompt(
  mode: GenerationMode,
  slug: string,
  title: string,
  description: string,
  domains: Domain[] = [],
  workspace?: WorkspaceInfo,
  selectedTypes?: ArtifactType[],
): string {
  const effectiveDomains = domains.length > 0 ? domains : [{ slug: "general", title, category: "general" as const, techStack: [] as string[], applyToGlob: "**/*" }];

  const domainContext = effectiveDomains.map((d) => {
    const tech = d.techStack.length > 0 ? d.techStack.join(", ") : d.category;
    return `- **${d.title}** (${tech}): ${d.category} domain`;
  }).join("\n");

  const sections: string[] = [
    `Create a generation plan for: "${description}"`,
    ``,
    `## Generation Mode: ${mode}`,
    ``,
    `## Context`,
    `- Suggested slug: ${slug}`,
    `- Suggested title: ${title}`,
    ``,
    `## Detected Domains (hints — you may override with better decomposition)`,
    domainContext,
    ``,
  ];

  // Discovery mode: include workspace context
  if (mode === "discovery" && workspace) {
    sections.push(
      `## Workspace Analysis (from auto-detection)`,
      ``,
      workspace.projectType ? `- Project type: ${workspace.projectType}` : `- Project type: unknown`,
      workspace.techStack.length > 0 ? `- Tech stack: ${workspace.techStack.join(", ")}` : `- Tech stack: not detected`,
    );

    const existing: string[] = [];
    if (workspace.existingAgents.length > 0) existing.push(`agents: ${workspace.existingAgents.join(", ")}`);
    if (workspace.existingPrompts.length > 0) existing.push(`prompts: ${workspace.existingPrompts.join(", ")}`);
    if (workspace.existingInstructions.length > 0) existing.push(`instructions: ${workspace.existingInstructions.join(", ")}`);
    if (workspace.existingSkills.length > 0) existing.push(`skills: ${workspace.existingSkills.join(", ")}`);
    if (workspace.existingHooks.length > 0) existing.push(`hooks: ${workspace.existingHooks.join(", ")}`);

    if (existing.length > 0) {
      sections.push(`- Existing customizations (DO NOT duplicate): ${existing.join("; ")}`);
    }

    sections.push(
      ``,
      `**IMPORTANT**: You are in Discovery Mode. SCAN the project codebase before planning.`,
      `Read package.json, tsconfig.json, framework configs, directory structure, and README.`,
      `Plan agents that target actual components/layers found in the codebase.`,
      ``,
    );
  }

  // Mode-specific artifact expectations
  switch (mode) {
    case "full":
    case "discovery":
      sections.push(
        `## Artifacts to Plan`,
        `- **agents**: Decompose into 1-4 agents with meaningful names`,
        `- Each agent gets its OWN **instruction** (with specific applyTo glob) and **skill** (with USE FOR/DO NOT USE FOR trigger phrases)`,
        `- **prompt**: One shared prompt file that routes to all agents`,
        `- Do NOT create shared/combined instruction or skill files`,
        ``,
      );
      break;
    case "on-demand": {
      const types = selectedTypes ?? ["agent", "instruction", "prompt", "skill"];
      sections.push(
        `## Artifacts to Plan (selected types only)`,
        ...types.map((t) => `- **${t}**`),
        ``,
      );
      break;
    }
    case "hooks":
      sections.push(
        `## Artifacts to Plan`,
        `- **hooks**: Plan hook events and companion scripts`,
        ``,
      );
      break;
    case "mcp-server":
      sections.push(
        `## Artifacts to Plan`,
        `- **mcp**: Plan MCP server configuration`,
        ``,
      );
      break;
    case "agentic-workflow":
      sections.push(
        `## Artifacts to Plan`,
        `- **workflow**: Plan the agentic workflow trigger and purpose`,
        ``,
      );
      break;
  }

  sections.push(
    `## Rules`,
    `- Write ONLY \`forge-plan.json\` in the workspace root.`,
    `- Do NOT create any .agent.md, .prompt.md, .instructions.md, or SKILL.md files.`,
    `- Agent names must be meaningful and use-case-aligned (not generic domain slugs).`,
    `- Stop immediately after writing the plan file.`,
  );

  return sections.join("\n");
}

/**
 * Build an orchestration prompt from a parsed GenerationPlan.
 * Uses planner-decided agent names instead of slug-based names.
 */
export function buildOrchestrationPromptFromPlan(
  plan: GenerationPlan,
  mode: GenerationMode,
): string {
  const sections: string[] = [
    `Generate Copilot customization files based on the following plan.`,
    ``,
    `## Use Case`,
    `"${plan.description}"`,
    ``,
    `## Generation Mode: ${mode}`,
    ``,
  ];

  // Agent delegation — agents + per-agent instructions + per-agent skills
  if (plan.agents.length > 0) {
    const agentDetails = plan.agents.map((a: PlannedAgent) => {
      const tech = a.techStack.length > 0 ? ` (${a.techStack.join(", ")})` : "";
      const resp = a.responsibilities.map((r: string) => `    - ${r}`).join("\n");
      return [
        `  - **Agent file**: \`.github/agents/${a.name}.agent.md\``,
        `    - Title: ${a.title}`,
        `    - Role: ${a.role}${tech}`,
        `    - Category: ${a.category}`,
        `    - ApplyTo: ${a.applyToGlob}`,
        `    - Responsibilities:`,
        resp,
        `  - **Instruction file**: \`.github/instructions/${a.name}.instructions.md\``,
        `    - ApplyTo: "${a.applyToGlob}"`,
        `    - Description: "${a.instruction.description}"`,
        `  - **Skill file**: \`.github/skills/${a.name}/SKILL.md\``,
        `    - Description: "${a.skill.description}"`,
      ].join("\n");
    }).join("\n\n");

    sections.push(
      `## Artifacts to create (per-agent aligned architecture)`,
      ``,
      `Each agent gets its own instruction file (loaded via applyTo globs) and skill file (loaded on-demand via trigger phrases).`,
      ``,
      agentDetails,
      ``,
      `### Delegation`,
      ``,
      `**forge-agent-writer** — Create ALL agent files listed above`,
      `**forge-instruction-writer** — Create ALL instruction files listed above (one per agent, each with its own applyTo glob)`,
      `**forge-skill-writer** — Create ALL skill files listed above (one per agent, each with USE FOR/DO NOT USE FOR trigger phrases)`,
      ``,
    );
  }

  // Prompt delegation
  if (plan.prompt) {
    sections.push(
      `**forge-prompt-writer** — Create: \`.github/prompts/${plan.prompt.slug}.prompt.md\``,
      `Description: "${plan.prompt.description}"`,
      `This prompt routes to all agents: ${plan.agents.map((a) => `@${a.title}`).join(", ")}`,
      ``,
    );
  }

  // Global copilot-instructions.md
  sections.push(
    `### Global Workspace Instructions`,
    `Create: \`.github/copilot-instructions.md\``,
    ``,
    `This file is loaded by Copilot for EVERY interaction in this workspace. It should contain:`,
    `- Brief project overview (1-2 sentences)`,
    `- Key architecture decisions and patterns`,
    `- Critical conventions (naming, file structure, imports)`,
    `- What NOT to do (common mistakes to avoid)`,
    ``,
    `Keep it concise (<50 lines) — this is loaded on every request, so brevity = performance.`,
    `Do NOT duplicate content from the per-agent instruction files.`,
    `Reference the agents by name so developers know what's available.`,
    ``,
  );

  // Optional: hooks
  if (plan.hooks) {
    sections.push(
      `### forge-hook-writer`,
      `Create: \`.github/hooks/${plan.hooks.slug}.json\` with companion scripts`,
      `Events: ${plan.hooks.events.join(", ")}`,
      `Purpose: "${plan.hooks.description}"`,
      ``,
    );
  }

  // Optional: MCP
  if (plan.mcp) {
    sections.push(
      `### forge-mcp-writer`,
      `Create: \`.vscode/mcp.json\``,
      `Servers: ${plan.mcp.servers.join(", ")}`,
      `Purpose: "${plan.mcp.description}"`,
      ``,
    );
  }

  // Optional: Workflow
  if (plan.workflow) {
    sections.push(
      `### forge-workflow-writer`,
      `Create: \`.github/workflows/${plan.workflow.slug}.md\``,
      `Trigger: ${plan.workflow.trigger}`,
      `Purpose: "${plan.workflow.description}"`,
      ``,
    );
  }

  sections.push(
    `## Rules`,
    `- Delegate to the appropriate sub-agents. Do NOT write artifact files directly.`,
    `- Run sub-agents in parallel when they are independent.`,
    `- Content must be specific to the use case — no generic placeholders.`,
    `- Pass the EXACT file paths, names, roles, and responsibilities from this plan to each sub-agent.`,
    `- Stop after all files are written. Do NOT run validation.`,
  );

  return sections.join("\n");
}

function buildDiscoveryModeInstructions(
  slug: string,
  _title: string,
  description: string,
  domains: Domain[],
  _applyToGlob: string,
): string[] {
  const agentFiles = domains.map((d) => {
    const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
    const tech = d.techStack.length > 0 ? ` specializing in ${d.techStack.join(", ")}` : "";
    return `  - \`.github/agents/${agentSlug}.agent.md\` — ${d.title} specialist${tech}`;
  }).join("\n");

  const instructionFiles = domains.map((d) => {
    const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
    return `  - \`.github/instructions/${agentSlug}.instructions.md\` with applyTo: "${d.applyToGlob}"`;
  }).join("\n");

  const skillFiles = domains.map((d) => {
    const agentSlug = domains.length > 1 ? `${slug}-${d.slug}` : slug;
    return `  - \`.github/skills/${agentSlug}/SKILL.md\``;
  }).join("\n");

  return [
    `## Discovery Mode`,
    ``,
    `**IMPORTANT**: Before generating, READ the project codebase to understand:`,
    `1. Project structure (directories, key files, entry points)`,
    `2. Tech stack and frameworks actually in use`,
    `3. Existing patterns, conventions, and architecture`,
    `4. Any existing .github/ customizations to avoid duplicating`,
    ``,
    `Then generate customizations that are **specific to this actual codebase**, not generic templates.`,
    ``,
    `## Sub-agents to invoke (in parallel, after discovery)`,
    ``,
    `### 1. forge-agent-writer`,
    `Create these agent files:`,
    agentFiles,
    `Tailor each agent's responsibilities and standards to the actual patterns found in the codebase.`,
    ``,
    `### 2. forge-prompt-writer`,
    `Create: \`.github/prompts/${slug}.prompt.md\``,
    ``,
    `### 3. forge-instruction-writer`,
    `Create per-agent instruction files (each with its own applyTo glob):`,
    instructionFiles,
    `Base rules on actual code conventions observed, not generic best practices.`,
    ``,
    `### 4. forge-skill-writer`,
    `Create per-agent skill files (each with USE FOR/DO NOT USE FOR trigger phrases):`,
    skillFiles,
    `Include architecture patterns actually used in this project.`,
    ``,
    `Description: "${description}"`,
  ];
}

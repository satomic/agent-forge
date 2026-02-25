import { execSync, spawn } from "child_process";
import { select } from "@inquirer/prompts";
import type { Domain, GenerationMode, ArtifactType } from "../types.js";

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
    `Create: \`.github/instructions/${slug}.instructions.md\` with applyTo: "${applyToGlob}"`,
    ``,
    `### 4. forge-skill-writer`,
    `Create: \`.github/skills/${slug}/SKILL.md\``,
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

function buildDiscoveryModeInstructions(
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
    `Create: \`.github/instructions/${slug}.instructions.md\` with applyTo: "${applyToGlob}"`,
    `Base rules on actual code conventions observed, not generic best practices.`,
    ``,
    `### 4. forge-skill-writer`,
    `Create: \`.github/skills/${slug}/SKILL.md\``,
    `Include architecture patterns actually used in this project.`,
    ``,
    `Description: "${description}"`,
  ];
}

/**
 * Copilot CLI Runner — streamlined launcher for GitHub Copilot CLI.
 *
 * Pure CLI orchestration: detect, launch, parallel.
 * All prompt construction lives in prompt-builder.ts.
 * All domain logic lives in domain-registry.ts.
 */
import { execSync, spawn } from "child_process";
import { select } from "@inquirer/prompts";

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

/** Options for launching Copilot CLI */
export interface LaunchOptions {
  model?: string;
  agent?: string;
  maxContinues?: number;
  /** Suppress terminal output (pipe instead of inherit stdio) */
  quiet?: boolean;
  /** Launch in /plan mode for deeper reasoning before acting (used by planner agents) */
  plan?: boolean;
}

/**
 * Launch the Copilot CLI with a prompt routed to a specific agent.
 * Uses --autopilot, --allow-all, --no-ask-user for fully autonomous execution.
 * --plan activates plan mode for deeper reasoning (used by planner agents).
 * --max-autopilot-continues prevents runaway sessions.
 */
export function launchCopilotCli(
  workingDir: string,
  prompt: string,
  options?: LaunchOptions,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const agentName = options?.agent ?? "forge-orchestrator";
    const maxContinues = options?.maxContinues ?? 25;
    const args = [
      "-p", prompt,
      "--agent", agentName,
      "--autopilot",
      "--allow-all",
      "--no-ask-user",
      "--max-autopilot-continues", String(maxContinues),
    ];

    if (options?.plan) {
      args.push("--plan");
    }

    if (options?.model) {
      args.push("--model", options.model);
    }

    const child = spawn("copilot", args, {
      cwd: workingDir,
      stdio: options?.quiet ? "pipe" : "inherit",
      shell: true,
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to launch Copilot CLI: ${err.message}`));
    });

    child.on("close", (code) => {
      resolve(code ?? 0);
    });
  });
}

/** A task for parallel writer execution */
export interface ParallelTask {
  prompt: string;
  agent: string;
}

/** Result of a single parallel writer */
export interface WriterResult {
  agent: string;
  exitCode: number;
  durationMs: number;
}

/** Result of parallel Copilot CLI execution */
export interface ParallelResult {
  results: WriterResult[];
  failed: number;
  totalDurationMs: number;
}

/** Human-readable labels for writer agents */
export const WRITER_LABELS: Record<string, string> = {
  "forge-agent-writer": "Agent writer",
  "forge-instruction-writer": "Instruction writer",
  "forge-skill-writer": "Skill writer",
  "forge-prompt-writer": "Prompt writer",
  "forge-hook-writer": "Hook writer",
  "forge-mcp-writer": "MCP writer",
  "forge-workflow-writer": "Workflow writer",
};

/** Format milliseconds into a human-readable duration string */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}

/**
 * Launch multiple Copilot CLI processes in parallel (Turbo mode).
 * Each task spawns an independent `copilot` process targeting a specific writer agent.
 * Output is suppressed (quiet mode) — progress is reported via the onComplete callback.
 */
export async function launchCopilotCliParallel(
  workingDir: string,
  tasks: ParallelTask[],
  options?: LaunchOptions,
  onComplete?: (result: WriterResult) => void,
): Promise<ParallelResult> {
  const start = Date.now();

  const promises = tasks.map(async (task) => {
    const taskStart = Date.now();
    const exitCode = await launchCopilotCli(workingDir, task.prompt, {
      ...options,
      agent: task.agent,
      maxContinues: options?.maxContinues ?? 15,
      quiet: true,
    });
    const result: WriterResult = {
      agent: task.agent,
      exitCode,
      durationMs: Date.now() - taskStart,
    };
    onComplete?.(result);
    return result;
  });

  const results = await Promise.all(promises);
  return {
    results,
    failed: results.filter((r) => r.exitCode !== 0).length,
    totalDurationMs: Date.now() - start,
  };
}

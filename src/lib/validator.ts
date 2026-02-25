import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import type {
  ValidationReport,
  ValidationFinding,
  ArtifactType,
} from "../types.js";

/** Valid frontmatter fields per artifact type (markdown-based types only) */
const VALID_FIELDS: Partial<Record<ArtifactType, Set<string>>> = {
  agent: new Set([
    "name",
    "description",
    "tools",
    "agents",
    "model",
    "user-invocable",
    "disable-model-invocation",
    "target",
    "mcp-servers",
    "handoffs",
    "argument-hint",
  ]),
  prompt: new Set([
    "name",
    "description",
    "argument-hint",
    "agent",
    "model",
    "tools",
  ]),
  instruction: new Set(["name", "description", "applyTo"]),
  skill: new Set([
    "name",
    "description",
    "argument-hint",
    "user-invocable",
    "disable-model-invocation",
  ]),
};

/**
 * Validate all customization files in a directory.
 */
export async function validateDirectory(dir: string): Promise<ValidationReport> {
  const findings: ValidationFinding[] = [];
  const passed: string[] = [];

  const githubDir = path.join(dir, ".github");
  const useCasesDir = path.join(dir, "use-cases");

  // Validate .github/ if it exists
  if (await fs.pathExists(githubDir)) {
    await validateArtifactsInDir(githubDir, findings, passed);
  }

  // Validate use-cases/ if it exists
  if (await fs.pathExists(useCasesDir)) {
    const entries = await fs.readdir(useCasesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await validateArtifactsInDir(
          path.join(useCasesDir, entry.name),
          findings,
          passed,
        );
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  const summary =
    errors.length === 0
      ? `All checks passed (${passed.length} files validated, ${warnings.length} warnings)`
      : `${errors.length} error(s), ${warnings.length} warning(s) across ${passed.length + errors.length} files`;

  return { errors, warnings, passed, summary };
}

const VALID_HOOK_EVENTS = new Set([
  "SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse",
  "PreCompact", "SubagentStart", "SubagentStop", "Stop",
]);

async function validateArtifactsInDir(
  dir: string,
  findings: ValidationFinding[],
  passed: string[],
): Promise<void> {
  // Agents
  const agentsDir = path.join(dir, "agents");
  if (await fs.pathExists(agentsDir)) {
    await validateFilesInDir(agentsDir, ".agent.md", "agent", findings, passed);
  }

  // Prompts
  const promptsDir = path.join(dir, "prompts");
  if (await fs.pathExists(promptsDir)) {
    await validateFilesInDir(
      promptsDir,
      ".prompt.md",
      "prompt",
      findings,
      passed,
    );
  }

  // Instructions
  const instructionsDir = path.join(dir, "instructions");
  if (await fs.pathExists(instructionsDir)) {
    await validateFilesInDir(
      instructionsDir,
      ".instructions.md",
      "instruction",
      findings,
      passed,
    );
  }

  // Skills
  const skillsDir = path.join(dir, "skills");
  if (await fs.pathExists(skillsDir)) {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
        if (await fs.pathExists(skillFile)) {
          await validateFile(skillFile, "skill", findings, passed);
        }
      }
    }
  }

  // Hooks
  const hooksDir = path.join(dir, "hooks");
  if (await fs.pathExists(hooksDir)) {
    await validateHookFiles(hooksDir, findings, passed);
  }

  // Agentic Workflows (.md files in workflows/)
  const workflowsDir = path.join(dir, "workflows");
  if (await fs.pathExists(workflowsDir)) {
    await validateWorkflowFiles(workflowsDir, findings, passed);
  }

  // copilot-instructions.md
  const copilotInstructions = path.join(dir, "copilot-instructions.md");
  if (await fs.pathExists(copilotInstructions)) {
    passed.push(copilotInstructions);
  }

  // MCP config (.vscode/mcp.json — check parent dir)
  const parentDir = path.dirname(dir);
  const mcpFile = path.join(parentDir, ".vscode", "mcp.json");
  if (await fs.pathExists(mcpFile)) {
    await validateMcpConfig(mcpFile, findings, passed);
  }
}

async function validateHookFiles(
  dir: string,
  findings: ValidationFinding[],
  passed: string[],
): Promise<void> {
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(dir, file);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const config = JSON.parse(content) as { hooks?: Record<string, unknown[]> };

      if (!config.hooks || typeof config.hooks !== "object") {
        findings.push({
          severity: "error",
          file: filePath,
          message: 'Hook config must have a top-level "hooks" object',
        });
        continue;
      }

      let hasError = false;
      for (const [event, commands] of Object.entries(config.hooks)) {
        if (!VALID_HOOK_EVENTS.has(event)) {
          findings.push({
            severity: "error",
            file: filePath,
            message: `Unknown hook event: "${event}". Valid events: ${[...VALID_HOOK_EVENTS].join(", ")}`,
            field: event,
          });
          hasError = true;
        }
        if (!Array.isArray(commands)) {
          findings.push({
            severity: "error",
            file: filePath,
            message: `Hook event "${event}" must be an array of commands`,
            field: event,
          });
          hasError = true;
          continue;
        }
        for (const cmd of commands) {
          const c = cmd as Record<string, unknown>;
          if (c.type !== "command") {
            findings.push({
              severity: "error",
              file: filePath,
              message: `Hook command must have type: "command" (in event "${event}")`,
              field: event,
            });
            hasError = true;
          }
          if (!c.command && !c.windows && !c.linux && !c.osx) {
            findings.push({
              severity: "error",
              file: filePath,
              message: `Hook command missing "command" field (in event "${event}")`,
              field: event,
            });
            hasError = true;
          }
        }
      }
      if (!hasError) passed.push(filePath);
    } catch {
      findings.push({
        severity: "error",
        file: filePath,
        message: "Invalid JSON in hook configuration file",
      });
    }
  }
}

async function validateMcpConfig(
  filePath: string,
  findings: ValidationFinding[],
  passed: string[],
): Promise<void> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const config = JSON.parse(content) as { servers?: Record<string, Record<string, unknown>> };

    if (!config.servers || typeof config.servers !== "object") {
      findings.push({
        severity: "error",
        file: filePath,
        message: 'MCP config must have a top-level "servers" object',
      });
      return;
    }

    let hasError = false;
    for (const [name, server] of Object.entries(config.servers)) {
      if (!server.command && !server.url && !server.type) {
        findings.push({
          severity: "error",
          file: filePath,
          message: `MCP server "${name}" must have "command" (stdio) or "url"+ "type" (http)`,
          field: name,
        });
        hasError = true;
      }
    }
    if (!hasError) passed.push(filePath);
  } catch {
    findings.push({
      severity: "error",
      file: filePath,
      message: "Invalid JSON in MCP configuration file",
    });
  }
}

async function validateWorkflowFiles(
  dir: string,
  findings: ValidationFinding[],
  passed: string[],
): Promise<void> {
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(dir, file);
    const content = await fs.readFile(filePath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    if (!frontmatter) {
      findings.push({
        severity: "error",
        file: filePath,
        message: "Agentic workflow must have YAML frontmatter with trigger config",
      });
      continue;
    }

    let hasError = false;
    if (!frontmatter.on) {
      findings.push({
        severity: "error",
        file: filePath,
        message: 'Agentic workflow missing required "on" trigger configuration',
        field: "on",
      });
      hasError = true;
    }

    if (!frontmatter.permissions) {
      findings.push({
        severity: "warning",
        file: filePath,
        message: 'Missing "permissions" field — workflow will use default permissions',
        field: "permissions",
      });
    }

    if (!hasError) passed.push(filePath);
  }
}

async function validateFilesInDir(
  dir: string,
  suffix: string,
  type: ArtifactType,
  findings: ValidationFinding[],
  passed: string[],
): Promise<void> {
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (file.endsWith(suffix)) {
      await validateFile(path.join(dir, file), type, findings, passed);
    }
  }
}

async function validateFile(
  filePath: string,
  type: ArtifactType,
  findings: ValidationFinding[],
  passed: string[],
): Promise<void> {
  const content = await fs.readFile(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  let hasError = false;

  if (!frontmatter) {
    findings.push({
      severity: "error",
      file: filePath,
      message: "Missing YAML frontmatter (must start with ---)",
    });
    return;
  }

  // Validate frontmatter fields
  const validFields = VALID_FIELDS[type];
  if (validFields) {
    for (const key of Object.keys(frontmatter)) {
      if (!validFields.has(key)) {
        findings.push({
          severity: "warning",
          file: filePath,
          message: `Unrecognized frontmatter field: "${key}"`,
          field: key,
        });
      }
    }
  }

  // Required: description
  if (!frontmatter.description) {
    findings.push({
      severity: "error",
      file: filePath,
      message: "Missing required field: description",
      field: "description",
    });
    hasError = true;
  }

  // Agent-specific checks
  if (type === "agent") {
    if (typeof frontmatter["user-invocable"] === "string") {
      findings.push({
        severity: "error",
        file: filePath,
        message:
          'Field "user-invocable" must be a boolean (true/false), not a string',
        field: "user-invocable",
      });
      hasError = true;
    }
    if (frontmatter.tools && !Array.isArray(frontmatter.tools)) {
      findings.push({
        severity: "error",
        file: filePath,
        message: 'Field "tools" must be an array',
        field: "tools",
      });
      hasError = true;
    }
  }

  // Instruction-specific checks
  if (type === "instruction") {
    if (!frontmatter.applyTo) {
      findings.push({
        severity: "warning",
        file: filePath,
        message:
          "Missing applyTo field — instruction will not auto-apply to any files",
        field: "applyTo",
      });
    }
  }

  // Check for empty body
  if (!body.trim()) {
    findings.push({
      severity: "warning",
      file: filePath,
      message: "File has empty body content",
    });
  }

  if (!hasError) {
    passed.push(filePath);
  }
}

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown> | null;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };

  try {
    const frontmatter = YAML.parse(match[1]) as Record<string, unknown>;
    return { frontmatter, body: match[2] };
  } catch {
    return { frontmatter: null, body: content };
  }
}

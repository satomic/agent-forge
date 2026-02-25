/**
 * Shared types for the AGENT-FORGE CLI.
 */

/** Project type detected or chosen during init */
export type ProjectType =
  | "web"
  | "api"
  | "cli"
  | "library"
  | "data-pipeline"
  | "other";

/** Status of a gallery use case relative to the current project */
export type UseCaseStatus = "installed" | "available" | "generated";

/** An artifact type that AGENT-FORGE can generate */
export type ArtifactType =
  | "agent"
  | "prompt"
  | "instruction"
  | "skill"
  | "hook"
  | "mcp-server"
  | "agentic-workflow";

/** Generation mode selected by the user */
export type GenerationMode =
  | "full"
  | "on-demand"
  | "mcp-server"
  | "hooks"
  | "agentic-workflow"
  | "discovery";

/** Hook lifecycle events supported by VS Code */
export type HookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PreCompact"
  | "SubagentStart"
  | "SubagentStop"
  | "Stop";

/** Agentic Workflow pattern types */
export type AgenticWorkflowPattern =
  | "ChatOps"
  | "DailyOps"
  | "IssueOps"
  | "LabelOps"
  | "Orchestration"
  | "Monitoring"
  | "TaskOps";

/** Configuration for a single hook command */
export interface HookConfig {
  type: "command";
  command: string;
  windows?: string;
  linux?: string;
  osx?: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/** MCP server configuration entry */
export interface McpServerConfig {
  type?: "http";
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/** Agentic Workflow frontmatter configuration */
export interface AgenticWorkflowConfig {
  on: Record<string, unknown>;
  permissions?: Record<string, string>;
  engine?: string;
  "safe-outputs"?: Record<string, unknown>;
}

/** Severity of a validation finding */
export type Severity = "error" | "warning" | "info";

/** Metadata for a built-in gallery use case */
export interface GalleryEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  files: string[];
}

/** Result of workspace detection */
export interface WorkspaceInfo {
  hasGitHub: boolean;
  hasAgents: boolean;
  hasPrompts: boolean;
  hasInstructions: boolean;
  hasSkills: boolean;
  hasCopilotInstructions: boolean;
  hasHooks: boolean;
  hasMcpConfig: boolean;
  hasAgenticWorkflows: boolean;
  existingAgents: string[];
  existingPrompts: string[];
  existingInstructions: string[];
  existingSkills: string[];
  existingHooks: string[];
  existingMcpServers: string[];
  existingWorkflows: string[];
  projectType: ProjectType | null;
  techStack: string[];
}

/** A single validation finding */
export interface ValidationFinding {
  severity: Severity;
  file: string;
  message: string;
  line?: number;
  field?: string;
}

/** Full validation report */
export interface ValidationReport {
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
  passed: string[];
  summary: string;
}

/** Init wizard mode */
export type InitMode = "new" | "existing" | "gallery";

/** Options for the init command */
export interface InitOptions {
  force: boolean;
  mode?: InitMode;
  description?: string;
  model?: string;
  generationMode?: GenerationMode;
  selectedTypes?: ArtifactType[];
  useCases?: string[];
}

/** Options for the generate command */
export interface GenerateOptions {
  static?: boolean;
  model?: string;
  mode?: GenerationMode;
  types?: ArtifactType[];
}

/** A detected domain within a multi-stack description */
export interface Domain {
  /** kebab-case identifier, e.g. "frontend" */
  slug: string;
  /** Title-case label, e.g. "Frontend" */
  title: string;
  /** Domain category */
  category: "frontend" | "backend" | "ai" | "general";
  /** Detected tech stack keywords, e.g. ["react", "tailwindcss"] */
  techStack: string[];
  /** Recommended applyTo glob for instruction files */
  applyToGlob: string;
}

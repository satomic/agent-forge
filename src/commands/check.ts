import chalk from "chalk";
import { execSync } from "child_process";
import { getCopilotCliVersion } from "../lib/copilot-cli.js";
import { animateLogo } from "./init.js";

interface CheckResult {
  name: string;
  found: boolean;
  detail?: string;
  recommended?: boolean;
}

export async function checkCommand(): Promise<void> {
  await animateLogo();
  console.log(chalk.bold("  Checking prerequisites...\n"));

  const results: CheckResult[] = [];

  // Node.js
  results.push({
    name: "Node.js",
    found: true,
    detail: `v${process.versions.node}`,
  });

  // VS Code
  const vscodeResult = checkTool("code", "Visual Studio Code");
  results.push(vscodeResult);

  // VS Code Insiders
  const insidersResult = checkTool("code-insiders", "VS Code Insiders");
  results.push(insidersResult);

  // Git
  const gitResult = checkTool("git", "Git");
  results.push(gitResult);

  // GitHub CLI (for agentic workflows)
  const ghResult = checkTool("gh", "GitHub CLI (for agentic workflows)");
  results.push(ghResult);

  // GitHub Copilot CLI (recommended)
  const copilotVersion = getCopilotCliVersion();
  results.push({
    name: "GitHub Copilot CLI (recommended)",
    found: copilotVersion !== null,
    detail: copilotVersion ? `v${copilotVersion}` : undefined,
    recommended: true,
  });

  // Docker (optional, for some MCP servers)
  const dockerResult = checkTool("docker", "Docker (optional, for MCP servers)");
  results.push(dockerResult);

  // Display results
  for (const result of results) {
    const icon = result.found ? chalk.green("✓") : chalk.dim("○");
    const detail = result.detail ? chalk.dim(` (${result.detail})`) : "";
    const name = result.found ? result.name : chalk.dim(result.name);
    console.log(`  ${icon} ${name}${detail}`);
  }

  const hasVSCode = vscodeResult.found || insidersResult.found;

  console.log();
  if (hasVSCode) {
    console.log(chalk.green.bold("✓ Ready to use AGENT-FORGE!"));
  } else {
    console.log(chalk.yellow("⚠ VS Code not found in PATH."));
    console.log(
      chalk.dim(
        "  Install from https://code.visualstudio.com/ and enable Shell Command.",
      ),
    );
  }

  if (!copilotVersion) {
    console.log();
    console.log(chalk.yellow("⚠ GitHub Copilot CLI not found."));
    console.log(chalk.dim("  Install for AI-powered use case generation:"));
    console.log(chalk.cyan("    npm install -g @github/copilot"));
  }

  console.log();
  console.log(chalk.bold("Required VS Code settings:"));
  console.log(chalk.dim("  chat.agent.enabled: true"));
  console.log(chalk.dim("  GitHub Copilot extension installed & signed in"));
  console.log();
}

function checkTool(command: string, displayName: string): CheckResult {
  try {
    const version = execSync(`${command} --version`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    }).trim();
    // Extract just the version number
    const vMatch = version.match(/(\d+\.\d+[\d.]*)/);
    return {
      name: displayName,
      found: true,
      detail: vMatch ? `v${vMatch[1]}` : version.slice(0, 30),
    };
  } catch {
    return { name: displayName, found: false };
  }
}

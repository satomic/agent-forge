import chalk from "chalk";
import ora from "ora";
import { validateDirectory } from "../lib/validator.js";

export async function validateCommand(scope?: string): Promise<void> {
  const targetDir = scope ?? process.cwd();

  const spinner = ora("Validating customization files...").start();
  const report = await validateDirectory(targetDir);
  spinner.stop();

  // Errors
  if (report.errors.length > 0) {
    console.log(chalk.red.bold(`\n✗ ${report.errors.length} Error(s):\n`));
    for (const finding of report.errors) {
      const loc = finding.field ? ` (field: ${finding.field})` : "";
      console.log(
        `  ${chalk.red("✗")} ${chalk.dim(finding.file)}${loc}`,
      );
      console.log(`    ${finding.message}`);
    }
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log(
      chalk.yellow.bold(`\n⚠ ${report.warnings.length} Warning(s):\n`),
    );
    for (const finding of report.warnings) {
      const loc = finding.field ? ` (field: ${finding.field})` : "";
      console.log(
        `  ${chalk.yellow("⚠")} ${chalk.dim(finding.file)}${loc}`,
      );
      console.log(`    ${finding.message}`);
    }
  }

  // Passed
  if (report.passed.length > 0) {
    console.log(chalk.green.bold(`\n✓ ${report.passed.length} file(s) passed\n`));
  }

  // Summary
  console.log(chalk.bold("Summary:"), report.summary);
  console.log();

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

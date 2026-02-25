---
name: "deployment"
description: "Run pre-deployment validation checks"
agent: "Deployment Guardian"
argument-hint: "Describe the deployment target or leave blank for full check"
---

Run a pre-deployment validation check on this project.

${input:target:Deployment target (e.g., 'production', 'staging') or leave blank}

Scan the workspace for:
1. Missing or hardcoded environment variables
2. Dependency vulnerabilities
3. Debug code left in production files
4. Missing health checks or monitoring
5. Configuration issues

Generate a structured readiness report with blockers, warnings, and passed checks.

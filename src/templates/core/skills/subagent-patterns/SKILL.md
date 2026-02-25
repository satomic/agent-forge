---
name: subagent-patterns
description: >-
  Orchestration patterns for multi-agent workflows using VSCode Copilot subagents.
  Includes coordinator-worker, pipeline, multi-perspective review, and TDD patterns.
  Use when designing agent systems that delegate work across specialized subagents,
  configuring handoffs between agents, or building autonomous multi-step workflows.
---

# Subagent Orchestration Patterns

This skill provides ready-to-use patterns for building multi-agent workflows in VS Code. Each pattern includes a coordinator agent template, worker agent templates, and wiring instructions.

---

## Core Concepts

### Context Isolation
Each subagent runs in its own context window:
- Subagents do NOT inherit the main agent's conversation history
- Subagents do NOT inherit the main agent's instructions
- Only the task prompt you provide is sent to the subagent
- Only the final result summary is returned to the main agent

### Execution Model
- **Synchronous**: Main agent blocks until subagent completes
- **Parallel**: VS Code can spawn multiple subagents simultaneously when requested
- **Result-only**: Only the subagent's final output enters the main agent's context

### Required Setup
- Add `agent` to the coordinator's `tools` list
- Specify `agents: ['Worker1', 'Worker2']` to restrict available subagents
- Worker agents should set `user-invocable: false` to hide from the dropdown

---

## Pattern 1: Coordinator-Worker

**Use when**: A complex task can be decomposed into independent subtasks with different tool/permission needs.

### Coordinator Agent

```yaml
---
name: Feature Builder
description: 'Coordinate feature development through planning, implementation, and review'
tools: ['agent', 'edit', 'search', 'read']
agents: ['Planner', 'Implementer', 'Reviewer']
handoffs:
  - label: 'Review Changes'
    agent: Reviewer
    prompt: 'Review the implementation above for quality and security issues.'
---

You are a feature development coordinator. For each feature request:

1. Use the **Planner** agent as a subagent to break down the feature into tasks.
2. Use the **Implementer** agent as a subagent to write code for each task.
3. Use the **Reviewer** agent as a subagent to check the implementation.
4. If the reviewer identifies issues, use the Implementer again to fix them.

Iterate between review and implementation until all issues are resolved.
```

### Worker Agents

```yaml
# .github/agents/planner.agent.md
---
name: Planner
user-invocable: false
tools: ['read', 'search']
---
Break down feature requests into implementation tasks.
Research existing code patterns and identify reusable components.
Return a numbered task list with file locations and descriptions.
```

```yaml
# .github/agents/implementer.agent.md
---
name: Implementer
user-invocable: false
tools: ['read', 'edit', 'search', 'terminal']
model: ['Claude Haiku 4.5 (copilot)', 'Gemini 3 Flash (Preview) (copilot)']
---
Write code to complete assigned tasks.
Follow existing code patterns and conventions.
Run tests after implementation to verify correctness.
```

```yaml
# .github/agents/reviewer.agent.md
---
name: Reviewer
user-invocable: false
tools: ['read', 'search']
---
Review code for quality, security, and adherence to project conventions.
Identify bugs, edge cases, and potential improvements.
Return a prioritized list of issues with severity levels.
```

---

## Pattern 2: Pipeline (Sequential Handoffs)

**Use when**: Work flows through a series of stages where each stage's output feeds the next.

### Agent Chain

```yaml
# .github/agents/architect.agent.md
---
name: Architect
description: 'Design system architecture for new features'
tools: ['read', 'search', 'fetch']
handoffs:
  - label: 'Start Implementation'
    agent: Builder
    prompt: 'Implement the architecture designed above.'
    send: false
---
You are a solution architect. Analyze requirements and design:
1. System components and their responsibilities
2. Data flow between components
3. API contracts and interfaces
4. Technology choices with rationale

Output a structured design document.
```

```yaml
# .github/agents/builder.agent.md
---
name: Builder
description: 'Implement features based on architecture designs'
tools: ['read', 'edit', 'search', 'terminal']
handoffs:
  - label: 'Request Review'
    agent: QA
    prompt: 'Review and test the implementation above.'
    send: false
---
You are a software engineer. Given an architecture design:
1. Implement each component following the design
2. Write unit tests for each component
3. Ensure all tests pass

Follow existing code patterns and conventions in the workspace.
```

```yaml
# .github/agents/qa.agent.md
---
name: QA
description: 'Review and test implementations'
tools: ['read', 'search', 'terminal']
handoffs:
  - label: 'Fix Issues'
    agent: Builder
    prompt: 'Fix the issues identified in the review above.'
    send: false
---
You are a QA engineer. Review implementations for:
1. Correctness — logic errors, edge cases, type issues
2. Test coverage — missing test scenarios
3. Security — input validation, injection risks
4. Performance — inefficient algorithms, unnecessary allocations

Return a structured report with severity levels.
```

---

## Pattern 3: Multi-Perspective Review

**Use when**: You want independent, unbiased analysis from multiple viewpoints run in parallel.

```yaml
# .github/agents/thorough-reviewer.agent.md
---
name: Thorough Reviewer
description: 'Multi-perspective code review with parallel analysis'
tools: ['agent', 'read', 'search']
---

You review code through multiple perspectives simultaneously.
Run each perspective as a **parallel subagent** so findings are independent and unbiased.

When asked to review code, run these subagents in parallel:
- **Correctness reviewer**: logic errors, edge cases, type issues
- **Code quality reviewer**: readability, naming, duplication
- **Security reviewer**: input validation, injection risks, data exposure
- **Architecture reviewer**: codebase patterns, design consistency, structural alignment

After all subagents complete, synthesize findings into a prioritized summary.
Note which issues are critical versus nice-to-have.
Acknowledge what the code does well.
```

> **Tip**: For more control, each review perspective can be its own custom agent with specialized tool access (e.g., a security reviewer with a security-focused MCP server).

---

## Pattern 4: Test-Driven Development (TDD)

**Use when**: Implementing features using the Red-Green-Refactor cycle.

```yaml
# .github/agents/tdd.agent.md
---
name: TDD
description: 'Implement features using test-driven development'
tools: ['agent']
agents: ['Red', 'Green', 'Refactor']
---

Implement the following feature using test-driven development.
Use subagents to guide each step:

1. Use the **Red** agent to write failing tests that define the expected behavior.
2. Use the **Green** agent to write the minimum code to make tests pass.
3. Use the **Refactor** agent to improve code quality without changing behavior.

Repeat the cycle for each piece of functionality.
```

```yaml
# .github/agents/red.agent.md
---
name: Red
user-invocable: false
tools: ['read', 'edit', 'search', 'terminal']
---
Write failing tests that define the expected behavior.
- Focus on one behavior at a time
- Use descriptive test names that explain the requirement
- Verify tests fail before proceeding (run them)
```

```yaml
# .github/agents/green.agent.md
---
name: Green
user-invocable: false
tools: ['read', 'edit', 'terminal']
---
Write the minimum code necessary to make the failing tests pass.
- Do NOT add extra functionality beyond what the tests require
- Do NOT refactor — just make the tests green
- Run tests to confirm they pass
```

```yaml
# .github/agents/refactor.agent.md
---
name: Refactor
user-invocable: false
tools: ['read', 'edit', 'search', 'terminal']
---
Improve code quality without changing external behavior.
- Extract duplicated code into shared functions
- Improve naming and readability
- Simplify complex logic
- Run all tests to confirm nothing broke
```

---

## Pattern 5: Research-Then-Act

**Use when**: You need to gather information before making decisions or changes.

```yaml
---
name: Informed Coder
description: 'Research before implementation to make better decisions'
tools: ['agent', 'read', 'edit', 'search']
---

Before making any code changes, always research first:

1. Run a subagent to research the topic:
   - Search the codebase for related patterns
   - Read relevant documentation
   - Identify existing conventions

2. Synthesize the research findings.

3. Only then proceed with implementation, applying what you learned.

This prevents making changes that conflict with existing patterns or
miss reusable components.
```

---

## Anti-Patterns

### Don't: Unconstrained Subagent Access
```yaml
# BAD — any agent can be a subagent, including unrelated ones
tools: ['agent']
# agents field omitted = '*' (all agents)
```

### Do: Explicit Subagent Lists
```yaml
# GOOD — only specific, relevant agents allowed
tools: ['agent']
agents: ['Planner', 'Implementer', 'Reviewer']
```

### Don't: Workers Visible in Dropdown
```yaml
# BAD — clutters the agents dropdown
name: Planner
# user-invocable defaults to true
```

### Do: Hide Workers
```yaml
# GOOD — clean dropdown, workers accessed only via coordinator
name: Planner
user-invocable: false
```

### Don't: Pass Huge Context to Subagents
```yaml
# BAD — defeats the purpose of context isolation
prompt: 'Here is the entire conversation history... [10k tokens]'
```

### Do: Pass Focused Tasks
```yaml
# GOOD — specific, bounded task
prompt: 'Review the authentication module in src/auth/ for SQL injection vulnerabilities.'
```

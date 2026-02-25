---
name: 'design-workflow'
description: 'Start a guided context engineering design session — analyze your needs and create the right mix of agents, prompts, instructions, and skills'
argument-hint: 'Describe what you want to automate or the role you need'
agent: Copilot Architect
tools:
  - 'agent'
  - 'read'
  - 'search'
---

# Context Engineering Design Session

You are starting a guided design session to create VSCode Copilot customization artifacts.

## What I Need From You

Describe what you want to build. Here are some example inputs:

- "I need a code review workflow for my Python Django project"
- "Create a specialized agent for writing database migrations"
- "Set up coding standards for our TypeScript monorepo"
- "Build a TDD workflow with red-green-refactor cycle"
- "I want a planning agent that creates implementation plans before coding"

## What Happens Next

1. I'll analyze your workspace to understand your project structure
2. I'll interview you about your specific needs (if anything is unclear)
3. I'll recommend which artifacts to create (agents, prompts, instructions, skills)
4. I'll present a design plan for your review
5. After your approval, I'll hand off to specialized agents to create each artifact

## Your Input

${input:goal:Describe the workflow, role, or task you want to automate}

---
name: "onboarding"
description: "Architecture explanation patterns and codebase navigation strategies for the Onboarding Assistant."
---

# Onboarding — Domain Knowledge

## Architecture Explanation Template

When explaining a codebase architecture, follow this structure:

### 1. System Overview
```
What does this system do? (1-2 sentences)
Who uses it? (users, other services, cron jobs)
What are the main components? (3-5 bullet points)
```

### 2. Entry Points
```
How does a request enter the system?
- Web: HTTP request → router → controller → service → DB
- CLI: Command → parser → handler → output
- Worker: Queue message → consumer → processor → result
```

### 3. Key Directories
```
src/
├── routes/     → HTTP endpoint definitions
├── services/   → Business logic (the "what")
├── models/     → Data structures and DB interactions
├── middleware/  → Cross-cutting concerns (auth, logging)
└── utils/      → Shared helpers
```

### 4. Data Flow
```
User Request → Auth Check → Validation → Business Logic → Database → Response
```

## Common Architecture Patterns

| Pattern | Description | Look For |
|---------|-------------|----------|
| MVC | Model-View-Controller | `controllers/`, `models/`, `views/` |
| Hexagonal | Ports & Adapters | `domain/`, `adapters/`, `ports/` |
| Layered | Horizontal slices | `presentation/`, `business/`, `data/` |
| Feature-based | Vertical slices | `features/auth/`, `features/billing/` |
| Event-driven | Pub/Sub | `events/`, `handlers/`, `listeners/` |
| Microservices | Service per domain | `services/user-service/`, `services/order-service/` |

## Navigation Strategies

When someone asks "where is X?":

1. **Search for the name** — exact match first, then partial
2. **Check entry points** — routes, commands, exports
3. **Follow the imports** — trace from entry point to implementation
4. **Check config** — look for feature flags, env vars, settings
5. **Read tests** — test files often reveal behavior best

## First-Day Checklist for New Developers

```markdown
## Getting Started Checklist

- [ ] Clone the repo and run the setup script
- [ ] Get the application running locally
- [ ] Run the test suite successfully
- [ ] Read the README and architecture docs
- [ ] Identify the main entry point(s)
- [ ] Find where the database models are defined
- [ ] Trace one user-facing feature end-to-end
- [ ] Make a small change and verify it works
```

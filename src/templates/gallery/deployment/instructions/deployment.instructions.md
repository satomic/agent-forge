---
name: "deployment-rules"
description: "Deployment safety rules applied to configuration and infrastructure files"
applyTo: "**/{Dockerfile,docker-compose.yml,.env*,*.yaml,*.yml}"
---

# Deployment Safety Rules

When working on deployment-related files:

## Environment Variables

- Never commit `.env` files with real credentials
- Document every required env var in `.env.example`
- Use descriptive names: `DATABASE_URL` not `DB`, `API_KEY` not `KEY`
- Validate that required variables are set at startup, not at first use

## Docker

- Use specific image tags, not `latest`
- Run as non-root user in production containers
- Don't copy `node_modules` or build artifacts — use multi-stage builds
- Set `HEALTHCHECK` instruction in Dockerfile

## Configuration

- Use separate config per environment (dev, staging, production)
- Never disable TLS/SSL in production config
- Set appropriate timeouts for all external connections
- Enable structured logging in production

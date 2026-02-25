---
name: "deployment"
description: "Deployment checklists, environment configuration patterns, and infrastructure references for the Deployment Guardian."
---

# Deployment — Domain Knowledge

## Pre-Deploy Checklist

### Code Readiness
- [ ] All tests passing on CI
- [ ] No merge conflicts with target branch
- [ ] Code reviewed and approved
- [ ] Changelog updated (if applicable)

### Configuration
- [ ] Environment variables documented
- [ ] Secrets stored in vault/secret manager (not in code)
- [ ] Feature flags configured for gradual rollout
- [ ] Database migrations tested and reversible

### Infrastructure
- [ ] Container builds successfully
- [ ] Health check endpoint responds
- [ ] Monitoring/alerting configured
- [ ] Rollback plan documented

### Security
- [ ] Dependencies scanned for vulnerabilities
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

## Environment Variable Patterns

```bash
# .env.example — Document ALL required variables

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
DATABASE_POOL_SIZE=10

# External APIs
API_KEY=your-api-key-here
API_TIMEOUT_MS=5000

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Feature flags
FEATURE_NEW_DASHBOARD=false
```

## Health Check Patterns

### Express.js
```javascript
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
  });
});
```

### FastAPI
```python
@app.get("/health")
async def health():
    return {"status": "healthy", "version": settings.app_version}
```

## Rollback Strategies

| Strategy | When to Use | Risk Level |
|----------|------------|------------|
| Blue-Green | Zero-downtime requirement | Low — instant switch |
| Canary | Gradual rollout needed | Low — easy to abort |
| Rolling | Stateless services | Medium — partial old/new |
| Recreate | Breaking changes, small scale | High — brief downtime |

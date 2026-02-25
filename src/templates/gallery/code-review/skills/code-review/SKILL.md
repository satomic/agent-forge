---
name: "code-review"
description: "Security checklist and code quality reference patterns for code review. Covers OWASP Top 10, common vulnerability patterns, and language-specific anti-patterns."
---

# Code Review — Domain Knowledge

## OWASP Top 10 Quick Reference

| # | Category | What to Look For |
|---|----------|-----------------|
| 1 | Broken Access Control | Missing auth checks, IDOR, privilege escalation |
| 2 | Cryptographic Failures | Weak algorithms, hardcoded keys, missing encryption |
| 3 | Injection | SQL, XSS, command injection, LDAP injection |
| 4 | Insecure Design | Missing rate limits, no input validation, trust boundaries |
| 5 | Security Misconfiguration | Default credentials, verbose errors, open CORS |
| 6 | Vulnerable Components | Outdated dependencies, known CVEs |
| 7 | Auth Failures | Weak passwords, missing MFA, session fixation |
| 8 | Data Integrity | Unsigned updates, deserialization attacks |
| 9 | Logging Failures | Missing audit trail, logging sensitive data |
| 10 | SSRF | Unvalidated URLs, internal network access |

## Common Anti-Patterns by Language

### JavaScript / TypeScript
- `eval()` or `new Function()` with user input
- `innerHTML` assignments without sanitization
- `JSON.parse()` without try/catch
- Missing `await` on async operations
- Prototype pollution via `Object.assign` with user data

### Python
- `os.system()` or `subprocess.call(shell=True)` with user input
- `pickle.loads()` on untrusted data
- `exec()` or `eval()` with user input
- SQL string formatting instead of parameterized queries
- Missing input validation on file paths (path traversal)

### Go
- Unchecked error returns (`err` ignored)
- SQL string concatenation in `db.Query()`
- Missing `defer` for resource cleanup
- Race conditions from shared state without mutex

## Review Checklist Template

```markdown
## Code Review Checklist

### Security
- [ ] No hardcoded secrets or credentials
- [ ] User input validated at boundaries
- [ ] SQL queries parameterized
- [ ] Output properly escaped
- [ ] Auth/authz checks present

### Quality
- [ ] Error handling is explicit
- [ ] No dead code or commented-out blocks
- [ ] Functions have single responsibility
- [ ] Naming is clear and consistent

### Testing
- [ ] Happy path covered
- [ ] Error cases tested
- [ ] Edge cases identified
- [ ] No test pollution (shared state)

### Performance
- [ ] No N+1 queries
- [ ] Appropriate caching
- [ ] Timeouts set on external calls
- [ ] No blocking I/O in hot paths
```

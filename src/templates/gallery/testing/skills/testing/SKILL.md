---
name: "testing"
description: "Testing patterns, coverage strategies, and framework-specific references for the Testing Agent."
---

# Testing — Domain Knowledge

## Test Pyramid

```
        ╱ E2E Tests ╲         (few, slow, high confidence)
       ╱─────────────╲
      ╱ Integration    ╲      (moderate count, medium speed)
     ╱─────────────────╲
    ╱    Unit Tests      ╲    (many, fast, isolated)
   ╱─────────────────────╲
```

- **Unit tests** — Test individual functions/methods in isolation. Mock external dependencies.
- **Integration tests** — Test module interactions. Use real DB/API when feasible.
- **E2E tests** — Test user workflows end-to-end. Use sparingly for critical paths.

## Coverage Strategy

### What to Test First (Priority Order)
1. Public API / exported functions
2. Business logic with branching
3. Error handling paths
4. Edge cases (empty input, null, boundaries, overflow)
5. Security-sensitive code (auth, validation, sanitization)

### What NOT to Test
- Framework internals (React renders, Express routing itself)
- Simple getters/setters with no logic
- Third-party library behavior
- CSS / purely visual output

## Framework Quick Reference

### Jest / Vitest (JavaScript/TypeScript)
```javascript
describe("UserService", () => {
  it("should return user when found", async () => {
    const user = await service.findById("123");
    expect(user).toEqual({ id: "123", name: "Alice" });
  });

  it("should throw when user not found", async () => {
    await expect(service.findById("unknown")).rejects.toThrow("Not found");
  });
});
```

### pytest (Python)
```python
def test_create_user_returns_user_with_id():
    user = create_user(name="Alice")
    assert user.id is not None
    assert user.name == "Alice"

def test_create_user_raises_on_duplicate_email():
    create_user(email="a@b.com")
    with pytest.raises(DuplicateError):
        create_user(email="a@b.com")
```

### Go testing
```go
func TestFindUser_ReturnsUser(t *testing.T) {
    user, err := FindUser("123")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got %q, want %q", user.Name, "Alice")
    }
}
```

## Mocking Strategies

| Approach | When to Use | Example |
|----------|------------|---------|
| Dependency Injection | Default choice for unit tests | Pass mock via constructor |
| Module Mocking | When DI isn't available | `jest.mock("./db")` |
| Spy | When you need real behavior + verification | `jest.spyOn(obj, "method")` |
| Stub | When you need controlled return values | Fixed return, no side effects |
| Fake | When you need working in-memory implementation | In-memory DB, fake filesystem |

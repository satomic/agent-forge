---
name: "refactoring"
description: "Refactoring catalog with techniques, code smell patterns, and safe transformation references for the Refactoring Coach."
---

# Refactoring — Domain Knowledge

## Refactoring Catalog

### Extract Function
**When:** A code fragment can be grouped together and given a meaningful name.
```javascript
// Before
function printReport(data) {
  console.log("=== Report ===");
  let total = 0;
  for (const item of data) {
    total += item.amount;
  }
  console.log(`Total: ${total}`);
  console.log("=== End ===");
}

// After
function printReport(data) {
  console.log("=== Report ===");
  console.log(`Total: ${calculateTotal(data)}`);
  console.log("=== End ===");
}

function calculateTotal(data) {
  return data.reduce((sum, item) => sum + item.amount, 0);
}
```

### Replace Conditional with Guard Clauses
**When:** Deep nesting from conditional checks.
```javascript
// Before
function getPayment(order) {
  if (order) {
    if (order.isPaid) {
      if (order.payment) {
        return order.payment;
      }
    }
  }
  return null;
}

// After
function getPayment(order) {
  if (!order) return null;
  if (!order.isPaid) return null;
  if (!order.payment) return null;
  return order.payment;
}
```

### Introduce Parameter Object
**When:** Several parameters always travel together.
```javascript
// Before
function createEvent(title, startDate, endDate, location, description) { ... }

// After
function createEvent({ title, startDate, endDate, location, description }) { ... }
```

### Replace Magic Numbers with Constants
**When:** Numeric literals appear without explanation.
```javascript
// Before
if (password.length < 8) { ... }
if (retries > 3) { ... }

// After
const MIN_PASSWORD_LENGTH = 8;
const MAX_RETRIES = 3;
if (password.length < MIN_PASSWORD_LENGTH) { ... }
if (retries > MAX_RETRIES) { ... }
```

## Complexity Metrics

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Cyclomatic complexity | ≤10 per function | Extract branches into separate functions |
| Cognitive complexity | ≤15 per function | Simplify nesting, use guard clauses |
| Lines per function | ≤40 | Extract logical groups |
| Parameters per function | ≤4 | Use parameter objects |
| Dependencies per module | ≤7 | Split module by responsibility |

## Safe Refactoring Workflow

```
1. Verify existing tests pass           (green baseline)
2. Identify ONE code smell               (focus)
3. Choose refactoring technique          (from catalog)
4. Apply the refactoring                 (one change)
5. Run tests                            (still green?)
   ├── Yes → Commit, go to step 2
   └── No  → Revert, choose smaller step
```

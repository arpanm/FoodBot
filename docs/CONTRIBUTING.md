# Contributing to FoodBot

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [PR Process](#pr-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)

---

## Code Style Guidelines

### TypeScript

- **Strict mode:** All TypeScript projects use `strict: true`.
- **No `any`:** Use explicit types. The `@typescript-eslint/no-explicit-any` rule is enforced.
- **Prefer `const`:** Use `const` for all variables unless reassignment is needed.
- **Explicit return types:** Functions should have explicit return types (warning level).
- **No console.log:** Use the project logger (Pino). The `no-console` ESLint rule is enforced.

### Formatting

All code is auto-formatted with Prettier:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Run before committing:
```bash
pnpm lint:fix
pnpm format
```

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `order-service.ts` |
| Classes/Components | PascalCase | `OrderService`, `RestaurantCard` |
| Functions/Methods | camelCase | `calculateTotal()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Interfaces | PascalCase (no `I` prefix) | `Order`, `UserContext` |
| Type Aliases | PascalCase | `OrderStatus`, `PaymentMethod` |
| Enums | PascalCase | `OrderStatusEnum` |

### File Size Limits

- Maximum 300 lines per file
- Maximum 50 lines per function
- Maximum cyclomatic complexity of 10 per function

---

## Git Workflow

### Branch Naming

```
feat/add-user-authentication
feat/order-tracking-system
fix/payment-validation-bug
fix/memory-leak-in-worker
hotfix/critical-security-patch
chore/update-dependencies
docs/api-documentation
test/add-cart-service-tests
refactor/extract-validation-logic
```

### Commit Messages

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` -- New feature
- `fix` -- Bug fix
- `docs` -- Documentation only
- `style` -- Formatting, no code change
- `refactor` -- Code change that neither fixes a bug nor adds a feature
- `perf` -- Performance improvement
- `test` -- Adding or updating tests
- `chore` -- Maintenance tasks

**Examples:**
```
feat(auth): add JWT token refresh endpoint

Implement automatic token refresh when the access token expires.
The refresh endpoint exchanges a valid refresh token for new tokens.

Closes #123
```

```
fix(order): prevent duplicate order creation

Add idempotency check using the order's cart hash to prevent
duplicate orders when the client retries a failed request.

Fixes #456
```

### Workflow

1. Create a feature branch from `main`
2. Make changes with semantic commits
3. Push branch to remote
4. Create a pull request
5. Pass all CI checks
6. Get code review approval
7. Squash and merge to `main`

---

## PR Process

### Creating a Pull Request

1. Ensure your branch is up to date with `main`
2. Run quality checks locally:
   ```bash
   pnpm quality:check    # lint + format + tests
   ```
3. Create the PR with a clear title and description

### PR Requirements

- [ ] All CI checks passing (lint, type check, tests, build)
- [ ] Code review from at least one team member
- [ ] No merge conflicts
- [ ] All conversations resolved
- [ ] Documentation updated if API or behavior changed

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No console.logs or debugger statements
- [ ] Types are explicit (no any)
- [ ] Error handling is comprehensive
```

### Code Review Guidelines

**Reviewers should check:**

1. **Correctness:** Does the code do what it claims?
2. **Security:** Any potential vulnerabilities?
3. **Performance:** Any obvious performance issues?
4. **Readability:** Is the code easy to understand?
5. **Testing:** Are edge cases covered?
6. **Architecture:** Does it follow project patterns?

---

## Testing Requirements

### Coverage

- Minimum 80% coverage for all new code
- All business logic must have unit tests
- API endpoints must have integration tests
- Critical user workflows must have E2E tests

### Test Patterns

- Use test factories for data generation (never hardcode test data)
- Mock all external dependencies in unit tests
- Tests must be deterministic (no randomness, mocked dates)
- Use descriptive test names: `it('should return 404 when order not found')`

### Running Tests

```bash
pnpm test:unit          # Unit tests
pnpm test:integration   # Integration tests
pnpm test:e2e           # E2E tests
pnpm test:coverage      # With coverage report
pnpm test:all           # All tests
```

---

## Documentation Requirements

### When to Update Documentation

- Adding a new API endpoint: Update `docs/API_DOCUMENTATION.md`
- Adding a new service: Create a README in the service directory
- Changing architecture: Update `docs/ARCHITECTURE.md`
- Changing environment variables: Update `docs/DEPLOYMENT.md` and `.env.example`
- Adding a new workflow: Update `docs/WORKFLOW_GUIDE.md`
- Adding a new Kafka event: Update `docs/EVENT_STREAMING.md`

### Code Documentation

- All public functions should have JSDoc comments
- Complex algorithms should have inline comments explaining the "why"
- Module-level documentation explains the module's purpose

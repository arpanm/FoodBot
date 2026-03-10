# TASK-TD-001: Technical Debt Resolution & Code Quality Hardening

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 12 days
**Component:** All Services / All Packages
**Depends On:** None
**Blocks:** Production readiness, maintainability
**Related Requirements:** development-guardrails.md

---

## Overview

Address all identified technical debt across the codebase including cart workflow complexity refactoring, OAuth service extraction, missing TypeScript strict mode compliance, incomplete error handling, missing input validation, code duplication, outdated dependencies, missing documentation, and enforcement of all development guardrails defined in the project rules.

---

## Requirements

### Functional Requirements

1. **Cart Workflow Complexity Refactor**
   - Current: cyclomatic complexity > 15 in cart workflow
   - Target: max complexity 10 per function
   - Extract cart validation, pricing, and state management into separate services
   - Add proper state machine for cart lifecycle
   - Implement cart expiry cleanup

2. **OAuth Service Extraction**
   - Extract OAuth logic from MCP adapter into shared package
   - Create `packages/oauth/` with reusable OAuth 2.1 client
   - Support multiple OAuth providers
   - Centralized token management
   - Shared by MCP adapter, gateway API, and mobile app

3. **TypeScript Strict Mode Compliance**
   - Audit all packages for strict mode violations
   - Fix all `any` type usages (replace with proper types)
   - Fix all implicit null/undefined
   - Enable all strict compiler options across all tsconfig files
   - Add explicit return types to all functions
   - Remove all `@ts-ignore` and `@ts-expect-error` comments (fix root causes)

4. **Error Handling Standardization**
   - Implement Result<T, E> pattern across all services
   - Standardize error codes (DOMAIN_ERROR_NAME format)
   - Add user-friendly error messages for all API errors
   - Implement global exception filter in gateway API
   - Add context and correlation IDs to all error logs
   - Remove all bare `catch(e)` blocks (add proper error handling)

5. **Input Validation Hardening**
   - Add class-validator decorators to ALL DTOs
   - Validate all API endpoint inputs
   - Add request size limits per endpoint
   - Sanitize all user inputs (XSS prevention)
   - Add rate limiting per endpoint per user
   - Validate all environment variables on startup

6. **Code Duplication Removal**
   - Identify duplicated code across packages (jscpd)
   - Extract shared utilities into packages/shared
   - Extract common patterns (pagination, filtering, sorting) into reusable modules
   - Standardize API response format across all controllers
   - Remove copy-pasted test utilities (create shared test-utils package)

7. **Dependency Updates**
   - Update all dependencies to latest stable versions
   - Resolve all npm audit vulnerabilities
   - Remove unused dependencies
   - Lock dependency versions (exact versions in package.json)
   - Add Renovate/Dependabot for automated updates
   - Verify compatibility after updates (run full test suite)

8. **Documentation**
   - Add JSDoc to all public APIs
   - Update OpenAPI/Swagger spec for all endpoints
   - Add inline code comments for complex logic only
   - Update architecture diagrams to match current state
   - Add ADRs (Architecture Decision Records) for key decisions
   - Update README with current setup instructions

9. **Performance Optimization**
   - Profile and fix N+1 queries in database operations
   - Add database query result caching where appropriate
   - Optimize Elasticsearch queries (remove unnecessary fields)
   - Add request compression (gzip) for API responses
   - Optimize Docker image sizes (review layers)
   - Add lazy loading for frontend routes (verify all routes)

10. **Test Quality**
    - Remove all flaky tests (run 3x, identify non-deterministic)
    - Add missing test data factories for all entities
    - Ensure all mocks are properly typed
    - Add test coverage for error paths (not just happy paths)
    - Add boundary condition tests
    - Speed up test suite (parallel execution, efficient mocking)

### Architecture

```
Technical Debt Resolution Plan:

Phase 1: Safety Net (3 days)
├── Add/fix TypeScript strict mode
├── Add missing input validation
└── Standardize error handling

Phase 2: Refactoring (4 days)
├── Cart workflow refactor
├── OAuth service extraction
├── Code duplication removal
└── Shared utilities extraction

Phase 3: Quality (3 days)
├── Dependency updates
├── Test quality improvement
├── Performance optimization
└── Documentation

Phase 4: Verification (2 days)
├── Full test suite run
├── Performance benchmarks
├── Security scan
└── Code quality metrics

Refactoring Strategy:
┌─────────────────────────────────────────────────┐
│ Cart Workflow (Before)                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ cartWorkflow() - complexity: 18             │ │
│ │   validateCart()                             │ │
│ │   calculatePricing()                        │ │
│ │   applyDiscounts()                          │ │
│ │   checkInventory()                          │ │
│ │   processPayment()                          │ │
│ │   updateState()                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Cart Workflow (After)                           │
│ ┌───────────────┐ ┌───────────────┐            │
│ │ CartValidator  │ │ PricingEngine │            │
│ │ complexity: 5  │ │ complexity: 6 │            │
│ └───────────────┘ └───────────────┘            │
│ ┌───────────────┐ ┌───────────────┐            │
│ │ CartStateMgr   │ │ DiscountSvc   │            │
│ │ complexity: 4  │ │ complexity: 5 │            │
│ └───────────────┘ └───────────────┘            │
│ ┌───────────────┐ ┌───────────────┐            │
│ │ InventoryChk   │ │ PaymentProc   │            │
│ │ complexity: 3  │ │ complexity: 7 │            │
│ └───────────────┘ └───────────────┘            │
└─────────────────────────────────────────────────┘

OAuth Extraction:
┌─────────────────────────────────────────────────┐
│ packages/oauth/                                 │
│ ├── src/                                        │
│ │   ├── oauth-client.ts (main client)           │
│ │   ├── token-manager.ts (store/refresh)        │
│ │   ├── providers/                              │
│ │   │   ├── google.provider.ts                  │
│ │   │   ├── github.provider.ts                  │
│ │   │   └── apple.provider.ts                   │
│ │   ├── types.ts                                │
│ │   └── index.ts                                │
│ └── __tests__/                                  │
│     ├── oauth-client.spec.ts                    │
│     └── token-manager.spec.ts                   │
└─────────────────────────────────────────────────┘
```

### Acceptance Criteria
- [ ] Cart workflow complexity <= 10 per function
- [ ] OAuth extracted to shared package
- [ ] Zero TypeScript `any` types (excluding generated code)
- [ ] All strict mode compiler options enabled
- [ ] Result<T, E> pattern in all services
- [ ] Standardized error codes across all APIs
- [ ] All DTOs have class-validator decorators
- [ ] All inputs sanitized (XSS prevention verified)
- [ ] Zero code duplication > 10 lines (jscpd check)
- [ ] All dependencies up to date (zero npm audit issues)
- [ ] Zero flaky tests (verified with 3x run)
- [ ] Test coverage >= 80% across all packages
- [ ] API response time <= 500ms p95 (no regression)
- [ ] Docker images <= 200MB each
- [ ] All public APIs documented (JSDoc + Swagger)
- [ ] SonarQube quality gate: A rating

### Files to Create/Modify
**Many files across codebase** - estimated 100+ files touched
- All `tsconfig.json` files (strict mode)
- All DTO files (validation decorators)
- All service files (error handling, Result types)
- `packages/oauth/` (new shared package)
- `packages/shared/src/test-utils/` (shared test utilities)
- `packages/shared/src/pagination/`
- `packages/shared/src/response-format/`
- All test files (fix flaky, add factories)
- `package.json` files (dependency updates)
- `.renovaterc.json` or `.github/dependabot.yml`

---

## SDLC Phases

### Phase 1: Safety Net - TypeScript & Validation (3 days)
- Audit all `tsconfig.json` files for strict mode compliance
- Enable `strict: true` in all packages; fix compilation errors
- Run `grep -r "any" --include="*.ts"` to find all `any` usages; replace with proper types
- Remove all `@ts-ignore` and `@ts-expect-error`; fix underlying issues
- Add explicit return types to all public functions
- Add class-validator decorators to all existing DTOs
- Add ValidationPipe globally in gateway API
- Add DOMPurify sanitization to all text inputs
- Add environment variable validation on startup (Joi/Zod schema)
- Verify all tests still pass after strict mode changes

### Phase 2: Error Handling Standardization (2 days)
- Implement `Result<T, E>` type in `packages/shared`
- Create domain error base classes with error codes
- Create user-friendly error message mapping
- Implement global exception filter in gateway API
- Add correlation ID middleware (generate per request, propagate)
- Refactor all services to use Result pattern for fallible operations
- Replace all bare `catch(e)` blocks with typed error handling
- Add structured logging with context for all errors
- Update tests to verify error handling paths

### Phase 3: Cart Workflow Refactor (2 days)
- Analyze current cart workflow complexity (run ESLint complexity report)
- Design cart state machine (pending, active, checkout, completed, expired)
- Extract CartValidator service (input validation, item availability)
- Extract PricingEngine service (subtotal, tax, delivery fee calculation)
- Extract DiscountService (coupon codes, promotional discounts)
- Extract CartStateManager (state transitions, expiry management)
- Implement cart expiry cleanup (background job, configurable TTL)
- Update all tests for refactored cart modules
- Verify complexity <= 10 per function

### Phase 4: OAuth Service Extraction (1 day)
- Create `packages/oauth/` package structure
- Extract OAuth client from MCP adapter
- Implement OAuthClient with provider abstraction
- Implement TokenManager (store, refresh, revoke)
- Add provider implementations (Google, GitHub, Apple)
- Update MCP adapter to use shared OAuth package
- Update gateway API to use shared OAuth package
- Write comprehensive tests for OAuth package
- Update package dependencies across monorepo

### Phase 5: Code Duplication & Dependencies (2 days)
- Run jscpd to identify duplicated code blocks
- Extract shared pagination utilities
- Extract shared API response format
- Extract shared test utilities (factories, mocks, helpers)
- Standardize API response envelope across all controllers
- Run `npm audit` and resolve all vulnerabilities
- Update all dependencies to latest stable versions
- Remove unused dependencies (depcheck)
- Add `.renovaterc.json` for automated dependency updates
- Lock all dependency versions (exact versions)

### Phase 6: Test Quality & Performance (1 day)
- Run full test suite 3 times to identify flaky tests
- Fix or quarantine all flaky tests
- Add test data factories for all entity types
- Ensure all mocks are properly typed (no `as any`)
- Add missing error path test coverage
- Profile database queries for N+1 issues (fix with eager loading/batching)
- Add gzip compression middleware
- Verify API response time <= 500ms p95

### Phase 7: Verification & Documentation (1 day)
- Run full test suite with coverage report (verify >= 80%)
- Run ESLint with zero warnings
- Run jscpd with zero duplication > 10 lines
- Run madge circular dependency check
- Run SonarQube analysis (verify A rating)
- Add JSDoc to all public APIs
- Update OpenAPI/Swagger specifications
- Final performance benchmark comparison

# FoodBot Testing Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Testing Strategy](#1-testing-strategy)
- [2. Test Setup Instructions](#2-test-setup-instructions)
- [3. Running Tests](#3-running-tests)
- [4. Coverage Requirements](#4-coverage-requirements)
- [5. CI/CD Integration](#5-cicd-integration)
- [6. Test Data Management](#6-test-data-management)

---

## 1. Testing Strategy

FoodBot uses a three-tier testing strategy:

### Test Pyramid

```
         /  E2E Tests  \         ~10 tests   (Playwright)
        /  Integration  \        ~50 tests   (Supertest + NestJS Testing)
       /   Unit Tests    \       ~150 tests  (Jest + React Testing Library)
```

### Test Categories

| Category | Extension | Tool | Purpose |
|----------|-----------|------|---------|
| Unit | `.test.ts`, `.test.tsx` | Jest, React Testing Library | Individual functions, components, services |
| Integration | `.spec.ts` | Jest, Supertest, NestJS Testing | API endpoints, module interactions |
| E2E | `.e2e.ts` | Playwright | Full user workflows across browsers |

### Test Organization

```
FoodBot/
  apps/
    customer-app/
      src/components/Cart/__tests__/CartItem.test.tsx     # Frontend unit tests
      src/components/Chat/__tests__/ChatInterface.test.tsx
    gateway-api/
      src/modules/auth/__tests__/auth.controller.e2e.spec.ts  # Backend integration
      src/modules/order/__tests__/order.controller.e2e.spec.ts
      src/test/factories/                                      # Backend factories
  packages/
    workflows/
      src/__tests__/placeOrder.workflow.test.ts            # Workflow unit tests
      src/__tests__/searchRestaurant.workflow.test.ts
    events/
      src/__tests__/schemas.spec.ts                        # Event schema tests
  services/
    notification-service/
      src/__tests__/order-event.consumer.spec.ts           # Service tests
    mcp-orchestrator/
      src/test/java/                                       # Java tests
  test/
    setup/jest.setup.ts                                    # Global test setup
    setup/jest.integration.setup.ts                        # Integration setup
    examples/                                              # Example test patterns
  e2e/
    tests/example.e2e.ts                                   # Playwright E2E
```

---

## 2. Test Setup Instructions

### Prerequisites

```bash
# Install dependencies (includes test libraries)
pnpm install

# Install Playwright browsers (for E2E tests)
npx playwright install --with-deps
```

### Test Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.cjs` | Root Jest configuration with project-based test selection |
| `apps/customer-app/jest.config.cjs` | Frontend test configuration |
| `apps/restaurant-app/jest.config.cjs` | Restaurant app test configuration |
| `packages/workflows/jest.config.cjs` | Workflow test configuration |
| `playwright.config.ts` | Playwright E2E configuration |
| `test/setup/jest.setup.ts` | Global setup (environment, mocks) |
| `test/setup/jest.integration.setup.ts` | Integration test setup (database, Redis) |
| `tsconfig.integration.json` | TypeScript config for integration tests |

### Environment for Tests

Tests use environment variables defined in the test setup. For integration tests that need databases:

```bash
# Start required infrastructure
docker-compose up -d foodbot-db redis

# Set test environment
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5433
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=foodbot_test
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=test-jwt-secret-minimum-32-characters
export JWT_REFRESH_SECRET=test-refresh-secret-minimum-32-chars
```

---

## 3. Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Watch mode
pnpm test:watch

# Run tests for a specific file
pnpm test:unit -- --testPathPattern=cart

# Run tests for a specific package
cd packages/workflows && pnpm test
cd apps/customer-app && pnpm test
```

### Integration Tests

```bash
# Run all integration tests (requires DB and Redis)
pnpm test:integration
```

### E2E Tests

```bash
# Run E2E tests (requires running application)
pnpm test:e2e

# Run with interactive UI
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug
```

### All Tests

```bash
# Run unit + integration + E2E
pnpm test:all

# Run with coverage
pnpm test:coverage
```

### MCP Orchestrator Tests (Java)

```bash
cd services/mcp-orchestrator
mvn test
```

---

## 4. Coverage Requirements

### Thresholds

The project enforces 80% minimum coverage:

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Current Coverage

| Area | Tests | Coverage |
|------|-------|----------|
| Frontend (Customer App) | ~80 tests | ~75% |
| Backend (Gateway API) | ~80 tests | ~75% |
| Workflows | ~30 tests | ~80% |
| Events Package | ~10 tests | ~90% |
| Notification Service | ~5 tests | ~70% |
| **Total** | **~206 tests** | **~75%** |

### Generating Coverage Reports

```bash
# Generate HTML coverage report
pnpm test:coverage

# View report
open coverage/lcov-report/index.html
```

---

## 5. CI/CD Integration

### GitHub Actions Pipeline

**File:** `.github/workflows/ci.yml`

The CI pipeline runs on every push to `main`/`develop` and on pull requests:

| Job | Depends On | Steps |
|-----|-----------|-------|
| `lint` | -- | ESLint, Prettier check, TypeScript type check |
| `test-backend` | -- | Unit tests + Integration tests (with PostgreSQL + Redis) |
| `test-frontend` | -- | Frontend component tests with coverage |
| `test-mcp` | -- | Java/Maven tests for MCP Orchestrator |
| `build-backend` | lint, test-backend | Build NestJS application |
| `build-frontend` | lint, test-frontend | Build React application |
| `build-mcp` | test-mcp | Build Spring Boot JAR |
| `security` | -- | npm audit + Maven dependency check (PR only) |
| `test-e2e` | build-backend, build-frontend, build-mcp | Playwright E2E (main branch only) |

### Coverage Upload

Coverage reports are uploaded to Codecov on main branch pushes with separate flags for backend and frontend.

---

## 6. Test Data Management

### Test Factories

All test data is generated via factory functions using `@faker-js/faker`:

**Backend factories** (`apps/gateway-api/src/test/factories/`):

| Factory | Generates |
|---------|-----------|
| `user.factory.ts` | User entities with random email, name, role |
| `restaurant.factory.ts` | Restaurant entities with cuisine, rating, location |
| `dish.factory.ts` | Dish entities with price, category, availability |
| `order.factory.ts` | Order entities with items, total, status |

**Frontend factories** (`apps/customer-app/src/test/factories/`):

| Factory | Generates |
|---------|-----------|
| `user.factory.ts` | User DTOs |
| `restaurant.factory.ts` | Restaurant DTOs |
| `dish.factory.ts` | Dish DTOs |
| `order.factory.ts` | Order DTOs |
| `message.factory.ts` | Chat message DTOs |

**Workflow factories** (`packages/workflows/src/test/factories/`):

| Factory | Generates |
|---------|-----------|
| `workflow-input.factory.ts` | Workflow input objects (search, order, payment) |

### Test Helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| `auth-helper.ts` | `apps/gateway-api/src/test/utils/` | Generate test JWT tokens |
| `test-module.factory.ts` | `apps/gateway-api/src/test/utils/` | Create NestJS test modules |
| `mockStore.ts` | `apps/customer-app/src/test/utils/` | Create mock Redux stores |
| `renderWithProviders.tsx` | `apps/customer-app/src/test/utils/` | Render with Redux Provider |
| `activity-mocks.ts` | `packages/workflows/src/test/mocks/` | Mock Temporal activities |
| `temporal-test-helper.ts` | `packages/workflows/src/test/utils/` | Temporal test environment |

### Deterministic Tests

All tests follow the deterministic testing rule:
- Dates are mocked with `jest.spyOn(global, 'Date')`
- Random values use seeded generators or fixed values
- External calls are mocked (never hit real APIs)
- Database state is reset between tests

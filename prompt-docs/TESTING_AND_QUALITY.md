# 🧪 Testing & Quality Tools - Complete Guide

Comprehensive testing and quality assurance setup for FoodBot project.

---

## 📦 What Was Configured

### **Testing Tools**

1. ✅ Jest - Unit & Integration Testing
2. ✅ Playwright - E2E Testing
3. ✅ Temporal Testing - Workflow Testing

### **Quality Tools**

4. ✅ ESLint - Code Linting
5. ✅ Prettier - Code Formatting
6. ✅ SonarQube - Code Quality Analysis
7. ✅ Snyk - Security Scanning
8. ✅ CodeRabbit - AI Code Review

---

## 🧪 Testing Tools

### 1. Jest (Unit & Integration Testing)

**Configuration:** [jest.config.js](jest.config.js)

**Features:**

- Separate projects for unit and integration tests
- TypeScript support via ts-jest
- Path aliases (`@/`, `@foodbot/`, `@apps/`, `@services/`)
- Coverage thresholds (80% required)
- Custom matchers (UUID, ISO date validation)

**Directory Structure:**

```
test/
├── setup/
│   ├── jest.setup.ts              # Unit test setup
│   └── jest.integration.setup.ts  # Integration test setup
├── temporal/
│   └── temporal-test-env.ts       # Temporal testing utilities
├── fixtures/                      # Test fixtures
└── examples/                      # Example tests
    ├── unit.test.example.ts
    ├── integration.spec.example.ts
    └── temporal.test.example.ts
```

**Commands:**

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# All tests
pnpm test:all
```

**Test Patterns:**

- Unit tests: `*.test.ts`, `*.test.tsx`
- Integration tests: `*.spec.ts`, `*.spec.tsx`

**Coverage Reports:**

- Location: `coverage/unit/`, `coverage/integration/`
- Formats: text, lcov, html, json, json-summary

**Custom Matchers:**

```typescript
expect(uuid).toBeValidUUID();
expect(isoDate).toBeValidISODate();
```

---

### 2. Playwright (E2E Testing)

**Configuration:** [playwright.config.ts](playwright.config.ts)

**Features:**

- Multi-browser support (Chromium, Firefox, WebKit)
- Mobile device testing (iPhone, Pixel, iPad)
- Visual regression testing
- API testing
- Trace/screenshot/video on failure
- Parallel execution

**Directory Structure:**

```
e2e/
├── tests/
│   └── example.e2e.ts             # E2E test examples
├── fixtures/                      # Test fixtures
└── playwright-report/             # HTML reports
```

**Commands:**

```bash
# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug

# Specific browser
pnpm test:e2e --project=chromium

# Headed mode (see browser)
pnpm test:e2e --headed
```

**Test Patterns:**

```typescript
// Page interactions
await page.goto('/');
await page.locator('[data-testid="button"]').click();
await expect(page.locator('h1')).toBeVisible();

// API testing
const response = await request.post('/api/orders', { data: {...} });
expect(response.ok()).toBeTruthy();
```

**Reports:**

- HTML: `playwright-report/index.html`
- JSON: `test-results/e2e-results.json`
- JUnit: `test-results/e2e-junit.xml`

---

### 3. Temporal Workflow Testing

**Utilities:**
[test/temporal/temporal-test-env.ts](test/temporal/temporal-test-env.ts)

**Features:**

- Test environment with time skipping
- Activity mocking
- Workflow coverage tracking
- Retry simulation
- Error handling tests

**Usage Example:**

```typescript
import { TemporalTestEnv, TemporalTestFixture } from '../temporal/temporal-test-env';

describe('Workflow Test', () => {
  let testEnv;
  let fixture: TemporalTestFixture;

  beforeAll(async () => {
    testEnv = await TemporalTestEnv.getTestEnvironment();
  });

  afterAll(async () => {
    await TemporalTestEnv.cleanup();
  });

  it('should execute workflow', async () => {
    // Mock activities
    const mockActivity = fixture.addActivity('enrichContext', async () => ({...}));

    // Test workflow
    // ... workflow execution
  });
});
```

**Test Patterns:**

- Mock activities with `fixture.addActivity()`
- Use `testEnv.sleep()` for time-based tests
- Verify activity calls with Jest mocks
- Test error handling and retries

---

## 🔧 Quality Tools

### 4. ESLint (Code Linting)

**Configuration:** [.eslintrc.js](.eslintrc.js)

**Features:**

- TypeScript support
- React/React Hooks rules
- Import ordering
- Security rules
- Code quality (SonarJS)
- Promise handling

**Plugins:**

- `@typescript-eslint` - TypeScript linting
- `import` - Import/export validation
- `jsx-a11y` - Accessibility
- `react` & `react-hooks` - React best practices
- `security` - Security vulnerabilities
- `sonarjs` - Code quality
- `promise` - Promise patterns

**Commands:**

```bash
# Lint
pnpm lint

# Lint with auto-fix
pnpm lint:fix

# Lint specific files
pnpm lint apps/gateway-api/src/**/*.ts
```

**Key Rules:**

- No unused vars (except `_` prefix)
- Explicit return types (warn)
- No floating promises (error)
- Import ordering (error)
- Max complexity: 10 (warn)
- Max lines: 500 (warn)
- Max params: 4 (warn)

**Special Rules for Temporal:**

```javascript
// Workflows must be deterministic
// ❌ Forbidden:
Date.now(); // Use workflow.now()
Math.random(); // Use activities
setTimeout(); // Use workflow.sleep()
```

---

### 5. Prettier (Code Formatting)

**Configuration:** [.prettierrc.js](.prettierrc.js)

**Settings:**

- Print width: 100
- Tab width: 2
- Single quotes: true
- Trailing commas: ES5
- Arrow parens: avoid
- Line ending: LF

**Commands:**

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check

# Format specific files
pnpm format apps/**/*.ts
```

**Integration:**

- Auto-format on save (if IDE configured)
- Pre-commit hook (via hooks)
- CI validation

---

### 6. SonarQube (Code Quality)

**Configuration:** [sonar-project.properties](sonar-project.properties)

**Features:**

- Code quality metrics
- Code smells detection
- Security vulnerability detection
- Technical debt calculation
- Duplication analysis
- Coverage reports integration

**Setup:**

```bash
# Local SonarQube (Docker)
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest

# Run analysis
pnpm sonar

# Local server
pnpm sonar:local
```

**Metrics Tracked:**

- Code coverage (from Jest)
- Bugs
- Code smells
- Security hotspots
- Duplications
- Maintainability rating

**Quality Gates:**

- Coverage ≥ 80%
- No high/critical bugs
- No high/critical vulnerabilities
- Duplication < 3%

**Reports:**

- Dashboard: `http://localhost:9000/dashboard?id=foodbot`

---

### 7. Snyk (Security Scanning)

**Configuration:** [.snyk](.snyk)

**Features:**

- Dependency vulnerability scanning
- License compliance checking
- Docker image scanning
- Infrastructure as Code scanning
- Continuous monitoring

**Commands:**

```bash
# Test for vulnerabilities
pnpm security:scan

# Monitor project
pnpm security:monitor

# Auto-fix vulnerabilities
pnpm security:fix

# Test and fail on issues
snyk test --severity-threshold=high
```

**Severity Levels:**

- 🔴 Critical - Block deployment
- 🟠 High - Block deployment
- 🟡 Medium - Warn
- 🟢 Low - Info

**Integration:**

- Pre-push hook
- CI/CD pipeline
- GitHub security alerts
- Slack notifications (optional)

**Reports:**

- CLI output
- HTML report
- JSON report for CI

---

### 8. CodeRabbit (AI Code Review)

**Configuration:** [.coderabbit.yaml](.coderabbit.yaml)

**Features:**

- AI-powered code review
- Automated PR comments
- Security issue detection
- Best practices enforcement
- Custom rules enforcement

**Custom Rules:**

1. **No hardcoded secrets**

   ```regex
   (api[_-]?key|password|secret|token)\s*=\s*['"][^'"]+['"]
   ```

2. **No console.log in production**

   ```regex
   console\.log\(
   ```

3. **Temporal workflow determinism**

   ```regex
   (Date\.now|Math\.random|setTimeout)
   ```

4. **Test naming convention**
   ```regex
   ^(describe|it|test)\(['"]\w+\.$
   ```

**Path-Specific Rules:**

- `**/*.test.ts` - Verify comprehensive test coverage
- `**/*.workflow.ts` - Check determinism
- `**/contracts/**` - Verify backward compatibility
- `.ai/**` - Review spec consistency

**Integration:**

- Automatic PR review
- Inline suggestions
- Security scanning
- Learning from project rules

**Features:**

- References `.claude/rules.md` automatically
- Enforces architectural decisions
- Validates against coding standards
- Checks for anti-patterns

---

## 📊 Quality Metrics

### Test Coverage

```
Target: 80% minimum

Current Status:
- Unit Tests: Configure after implementation
- Integration Tests: Configure after implementation
- E2E Tests: Configure after implementation
```

### Code Quality (SonarQube)

```
Maintainability Rating: A (target)
Reliability Rating: A (target)
Security Rating: A (target)
Coverage: ≥80%
Duplications: <3%
```

### Security (Snyk)

```
Critical: 0 (block deployment)
High: 0 (block deployment)
Medium: <5 (warn)
Low: <10 (info)
```

### Linting (ESLint)

```
Errors: 0 (block commit)
Warnings: <10 (review)
Complexity: ≤10 per function
Max Lines: ≤500 per file
```

---

## 🚀 Commands Summary

### Testing

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `pnpm test`             | Run unit tests           |
| `pnpm test:unit`        | Run unit tests only      |
| `pnpm test:integration` | Run integration tests    |
| `pnpm test:e2e`         | Run E2E tests            |
| `pnpm test:watch`       | Watch mode for tests     |
| `pnpm test:coverage`    | Generate coverage report |
| `pnpm test:all`         | Run all tests            |

### Quality

| Command              | Description               |
| -------------------- | ------------------------- |
| `pnpm lint`          | Run ESLint                |
| `pnpm lint:fix`      | Fix linting issues        |
| `pnpm format`        | Format code with Prettier |
| `pnpm format:check`  | Check formatting          |
| `pnpm quality:check` | Run all quality checks    |
| `pnpm quality:fix`   | Fix all quality issues    |

### Security

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `pnpm security:scan`    | Scan for vulnerabilities |
| `pnpm security:monitor` | Monitor project          |
| `pnpm security:fix`     | Auto-fix vulnerabilities |

### Analysis

| Command            | Description              |
| ------------------ | ------------------------ |
| `pnpm sonar`       | Run SonarQube analysis   |
| `pnpm sonar:local` | Run against local server |

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow (Example)

```yaml
name: Quality & Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Unit tests
        run: pnpm test:unit

      - name: Integration tests
        run: pnpm test:integration

      - name: E2E tests
        run: pnpm test:e2e

      - name: Security scan
        run: pnpm security:scan

      - name: SonarQube scan
        run: pnpm sonar
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/*/lcov.info
```

---

## 📋 Configuration Files

| File                                                 | Purpose                  |
| ---------------------------------------------------- | ------------------------ |
| [jest.config.js](jest.config.js)                     | Jest configuration       |
| [playwright.config.ts](playwright.config.ts)         | Playwright configuration |
| [.eslintrc.js](.eslintrc.js)                         | ESLint rules             |
| [.prettierrc.js](.prettierrc.js)                     | Prettier settings        |
| [.prettierignore](.prettierignore)                   | Prettier exclusions      |
| [sonar-project.properties](sonar-project.properties) | SonarQube settings       |
| [.snyk](.snyk)                                       | Snyk policy              |
| [.coderabbit.yaml](.coderabbit.yaml)                 | CodeRabbit configuration |

---

## 🎓 Best Practices

### Writing Tests

1. **Follow AAA Pattern**

   ```typescript
   it('should do something', () => {
     // Arrange
     const input = {...};

     // Act
     const result = doSomething(input);

     // Assert
     expect(result).toBe(expected);
   });
   ```

2. **Use Descriptive Names**

   ```typescript
   // ✅ Good
   it('should throw OrderNotFoundError when order ID is invalid.');

   // ❌ Bad
   it('test1');
   ```

3. **One Assertion Per Test (when possible)**

   ```typescript
   // ✅ Good
   it('should return correct user ID.', () => {
     expect(user.id).toBe('123');
   });

   it('should return correct user name.', () => {
     expect(user.name).toBe('John');
   });
   ```

4. **Mock External Dependencies**

   ```typescript
   // Mock API calls, database, external services
   jest.mock('./api-client');
   ```

5. **Clean Up After Tests**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

### Code Quality

1. **Keep Functions Small** (≤50 lines)
2. **Limit Parameters** (≤4 params)
3. **Reduce Complexity** (≤10 cyclomatic complexity)
4. **Avoid Duplication** (DRY principle)
5. **Write Self-Documenting Code**

### Security

1. **Never hardcode secrets**
2. **Validate all input**
3. **Use parameterized queries**
4. **Keep dependencies updated**
5. **Follow least privilege principle**

---

## 🐛 Troubleshooting

### Jest Issues

```bash
# Clear cache
jest --clearCache

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Increase timeout
jest.setTimeout(30000);
```

### Playwright Issues

```bash
# Install browsers
npx playwright install

# Run codegen
npx playwright codegen http://localhost:3000

# Show trace
npx playwright show-trace trace.zip
```

### ESLint Issues

```bash
# Check specific file
npx eslint path/to/file.ts

# Explain rule
npx eslint --help

# Disable rule for line
// eslint-disable-next-line rule-name
```

### SonarQube Issues

```bash
# Verify connection
curl http://localhost:9000/api/system/status

# Check logs
docker logs sonarqube

# Reset password
# Login: admin / admin (first time)
```

---

## ✅ Setup Checklist

- [x] Jest configured
- [x] Playwright configured
- [x] Temporal testing utilities created
- [x] ESLint configured
- [x] Prettier configured
- [x] SonarQube configured
- [x] Snyk configured
- [x] CodeRabbit configured
- [x] Test examples created
- [x] package.json updated with scripts
- [ ] Run `pnpm install` to install dependencies
- [ ] Configure SonarQube server (if using)
- [ ] Configure Snyk account (if using)
- [ ] Configure CodeRabbit (if using)
- [ ] Write first tests
- [ ] Set up CI/CD pipeline

---

## 📚 Resources

- **Jest:** https://jestjs.io/
- **Playwright:** https://playwright.dev/
- **Temporal Testing:** https://docs.temporal.io/develop/typescript/testing
- **ESLint:** https://eslint.org/
- **Prettier:** https://prettier.io/
- **SonarQube:** https://www.sonarqube.org/
- **Snyk:** https://snyk.io/
- **CodeRabbit:** https://coderabbit.ai/

---

**Status:** ✅ **COMPLETE** **Last Updated:** 2024-02-17 **Version:** 1.0.0

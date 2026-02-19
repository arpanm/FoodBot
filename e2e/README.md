# E2E Testing with Playwright

Comprehensive end-to-end testing suite for the FoodBot system, including Chrome Extension testing.

## Overview

The E2E test suite validates the complete system integration:

1. **Job Creation & Polling** - Tests job lifecycle from creation to completion
2. **Chrome Extension Workflow** - Tests extension polling and platform interaction
3. **Full System Integration** - Tests complete order flows end-to-end

## Directory Structure

```
e2e/
├── setup/
│   ├── global-setup.ts           # Pre-test environment setup
│   └── global-teardown.ts        # Post-test cleanup
├── helpers/
│   ├── auth-helper.ts            # Authentication utilities
│   ├── api-helper.ts             # API interaction utilities
│   └── extension-helper.ts       # Chrome Extension utilities
├── fixtures/
│   ├── extension-fixture.ts      # Custom Playwright fixture for extensions
│   └── test-data.ts              # Test data and selectors
├── job-creation.spec.ts          # Job lifecycle tests
├── extension-workflow.spec.ts    # Extension-specific tests
└── full-system-integration.spec.ts # Complete integration tests
```

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### With UI Mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Headed Mode (see browser actions)
```bash
npm run test:e2e:headed
```

### Specific Project
```bash
# Regular tests only
npm run test:e2e:chromium

# Extension tests only
npm run test:e2e:extension
```

### View Report
```bash
npm run test:e2e:report
```

## Prerequisites

1. **Build Chrome Extension**
   ```bash
   cd chrome-extension
   npm run build
   ```

2. **Start Services**
   ```bash
   # Gateway API
   cd apps/gateway-api
   npm run start:dev

   # Customer App
   cd apps/customer-app
   npm run dev
   ```

3. **Environment Variables** (optional)
   ```bash
   export GATEWAY_API_URL=http://localhost:3000
   export CUSTOMER_APP_URL=http://localhost:3001
   ```

## Test Categories

### Job Creation Tests (`job-creation.spec.ts`)

Tests the job creation and polling workflow:

- ✅ Create job via chatbot
- ✅ Display job ID
- ✅ Poll job status
- ✅ Display progress tracker
- ✅ Real-time WebSocket updates
- ✅ Display job results
- ✅ Handle job failures
- ✅ List all user jobs
- ✅ Filter jobs by status
- ✅ Retry failed jobs

### Extension Workflow Tests (`extension-workflow.spec.ts`)

Tests Chrome Extension functionality:

- ✅ Extension initialization
- ✅ Job polling mechanism
- ✅ Search workflow execution
- ✅ Add to cart workflow
- ✅ Checkout workflow
- ✅ Error handling and reporting
- ✅ Multiple jobs in queue
- ✅ Popup status display
- ✅ State persistence

### Full System Integration Tests (`full-system-integration.spec.ts`)

Tests complete end-to-end flows:

- ✅ Complete order flow (chat → job → extension → completion)
- ✅ Search → select → add to cart → checkout
- ✅ Multiple concurrent jobs
- ✅ Error recovery and retry
- ✅ Real-time order tracking
- ✅ Order cancellation
- ✅ Performance benchmarks

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginViaAPI, TEST_USERS } from './helpers/auth-helper';

test.describe('Feature Name', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    authToken = await loginViaAPI(
      page,
      TEST_USERS.customer.email,
      TEST_USERS.customer.password
    );
  });

  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    // Test logic
    await expect(page.locator('[data-testid="something"]')).toBeVisible();
  });
});
```

### Extension Test Structure

```typescript
import { expect } from '@playwright/test';
import { test } from './fixtures/extension-fixture';
import { triggerExtensionPoll } from './helpers/extension-helper';

test.describe('Extension Feature', () => {
  test('should use extension', async ({ extensionContext, extensionId }) => {
    const page = await extensionContext.newPage();
    await page.goto('https://www.swiggy.com');

    await triggerExtensionPoll(extensionContext);

    // Test extension behavior
  });
});
```

## Helper Functions

### Authentication
- `loginViaUI(page, email, password)` - Login through UI
- `loginViaAPI(page, email, password)` - Login via API (faster)
- `logout(page)` - Logout
- `isAuthenticated(page)` - Check auth status

### API Operations
- `createTestJob(request, jobData, authToken)` - Create job
- `getJobStatus(request, jobId, authToken)` - Get job status
- `pollJobUntilComplete(request, jobId, authToken)` - Wait for completion
- `createOrder(request, orderData, authToken)` - Create order
- `getOrderStatus(request, orderId, authToken)` - Get order status

### Extension Operations
- `loadExtension()` - Load extension in browser
- `openExtensionPopup(context, extensionId)` - Open extension popup
- `getExtensionStorage(context)` - Get extension storage
- `setExtensionStorage(context, data)` - Set extension storage
- `triggerExtensionPoll(context)` - Manually trigger job poll
- `waitForExtensionToProcessJob(context, jobId)` - Wait for job processing
- `waitForContentScript(page)` - Wait for content script to load

## Test Data

All test data is centralized in `fixtures/test-data.ts`:

- `TEST_RESTAURANTS` - Sample restaurant data
- `TEST_DISHES` - Sample dish data
- `TEST_JOBS` - Sample job payloads
- `TEST_ORDERS` - Sample order data
- `CHAT_MESSAGES` - Common chat messages
- `SELECTORS` - Data-testid selectors

## Best Practices

### 1. Use Data-Testid Selectors
```typescript
// ✅ Good - stable selector
await page.click('[data-testid="login-button"]');

// ❌ Bad - fragile selector
await page.click('.btn.btn-primary.login');
```

### 2. Wait for Elements
```typescript
// ✅ Good - explicit wait
await page.waitForSelector('[data-testid="results"]');
await expect(page.locator('[data-testid="results"]')).toBeVisible();

// ❌ Bad - no wait
await page.click('[data-testid="results"]'); // May fail if not loaded
```

### 3. Clean Up After Tests
```typescript
test.afterEach(async ({ page, extensionContext }) => {
  // Clear state
  await page.evaluate(() => localStorage.clear());

  // Close pages
  await extensionContext?.close();
});
```

### 4. Use Fixtures for Common Setup
```typescript
// Define custom fixture
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await loginViaAPI(page, TEST_USERS.customer.email, TEST_USERS.customer.password);
    await use(page);
  },
});

// Use in tests
test('should do something', async ({ authenticatedPage }) => {
  // Already authenticated
});
```

### 5. Parallel Execution
```typescript
// Tests in same file run in parallel by default
test.describe.configure({ mode: 'parallel' });

// Force serial execution if needed
test.describe.configure({ mode: 'serial' });
```

## Debugging

### 1. UI Mode (Best for Development)
```bash
npm run test:e2e:ui
```
- Visual test execution
- Time travel debugging
- Watch mode
- Easy test selection

### 2. Debug Mode
```bash
npm run test:e2e:debug
```
- Step through tests
- Inspect elements
- Console logs

### 3. Headed Mode
```bash
npm run test:e2e:headed
```
- See browser actions
- Useful for extension tests

### 4. Screenshots and Videos
Failed tests automatically capture:
- Screenshots: `test-results/playwright/*.png`
- Videos: `test-results/playwright/*.webm`
- Traces: `test-results/playwright/*.zip`

View trace:
```bash
npx playwright show-trace test-results/trace.zip
```

## CI/CD Integration

Tests run automatically in CI:

```yaml
# .github/workflows/e2e-tests.yml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Build Extension
  run: cd chrome-extension && npm run build

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Extension Tests Failing

1. **Rebuild Extension**
   ```bash
   cd chrome-extension && npm run build
   ```

2. **Check Extension Path**
   Verify `chrome-extension/dist` exists

3. **Enable Headed Mode**
   ```bash
   npm run test:e2e:headed -- extension-workflow.spec.ts
   ```

### Service Connection Errors

1. **Check Services Running**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3001
   ```

2. **Check Ports**
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

3. **View Logs**
   Check `playwright-report/` for detailed logs

### Flaky Tests

1. **Increase Timeouts**
   ```typescript
   test.setTimeout(120000); // 2 minutes
   ```

2. **Add Explicit Waits**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForSelector('[data-testid="element"]');
   ```

3. **Retry Failed Tests**
   ```bash
   npm run test:e2e -- --retries=3
   ```

## Performance Benchmarks

Target metrics:

- Job creation: < 500ms
- Job polling interval: 2s (test) / 5s (prod)
- Extension job processing: < 30s
- Complete order flow: < 2 minutes
- Test suite completion: < 10 minutes

## Contributing

1. Write tests for all new features
2. Maintain 80%+ coverage
3. Use descriptive test names
4. Add data-testid attributes to new UI elements
5. Update test data fixtures as needed
6. Document complex test scenarios

## Support

For issues or questions:
- Check troubleshooting section
- Review test logs in `playwright-report/`
- Check Playwright docs: https://playwright.dev
- Contact: dev-team@foodbot.com

import { test, expect } from '@playwright/test';

/**
 * Example E2E Test
 * This file demonstrates basic Playwright test patterns
 * Use this as a reference when writing new tests
 */

test.describe('Example Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should display homepage', async ({ page }) => {
    // Navigate
    await page.goto('/');

    // Wait for element
    await page.waitForSelector('h1');

    // Assert
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should interact with elements', async ({ page }) => {
    // Fill input
    await page.fill('[data-testid="search-input"]', 'pizza');

    // Click button
    await page.click('[data-testid="search-button"]');

    // Wait for results
    await page.waitForSelector('[data-testid="results"]');

    // Assert count
    const results = page.locator('[data-testid="result-card"]');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle async operations', async ({ page }) => {
    // Click button that triggers API call
    await page.click('[data-testid="load-data-button"]');

    // Wait for loading state
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('[data-testid="data-loaded"]', {
      timeout: 10000,
    });

    // Verify data
    await expect(page.locator('[data-testid="data-item"]')).toHaveCount(10);
  });

  test('should test API responses', async ({ page, request }) => {
    // Make API call
    const response = await request.get('/api/restaurants');

    // Check response
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Parse JSON
    const data = await response.json();
    expect(data.restaurants).toBeDefined();
    expect(data.restaurants.length).toBeGreaterThan(0);
  });

  test('should test navigation', async ({ page }) => {
    // Navigate to different page
    await page.click('[data-testid="menu-link"]');

    // Wait for URL change
    await page.waitForURL('**/menu');

    // Verify URL
    expect(page.url()).toContain('/menu');

    // Verify page content
    await expect(page.locator('h1')).toHaveText('Menu');
  });

  test('should test forms', async ({ page }) => {
    // Fill form
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.selectOption('[data-testid="country-select"]', 'US');
    await page.check('[data-testid="terms-checkbox"]');

    // Submit
    await page.click('[data-testid="submit-button"]');

    // Wait for success
    await page.waitForSelector('[data-testid="success-message"]');

    // Verify
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Form submitted successfully'
    );
  });

  test('should test localStorage', async ({ page }) => {
    // Set localStorage
    await page.evaluate(() => {
      localStorage.setItem('testKey', 'testValue');
    });

    // Get localStorage
    const value = await page.evaluate(() => {
      return localStorage.getItem('testKey');
    });

    expect(value).toBe('testValue');
  });

  test('should test multiple tabs', async ({ context }) => {
    // Open first tab
    const page1 = await context.newPage();
    await page1.goto('/page1');

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/page2');

    // Interact with both tabs
    await page1.click('[data-testid="button1"]');
    await page2.click('[data-testid="button2"]');

    // Verify both tabs
    await expect(page1.locator('[data-testid="result1"]')).toBeVisible();
    await expect(page2.locator('[data-testid="result2"]')).toBeVisible();
  });

  test('should handle file uploads', async ({ page }) => {
    // Set input files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('test content'),
    });

    // Submit
    await page.click('[data-testid="upload-button"]');

    // Wait for success
    await page.waitForSelector('[data-testid="upload-success"]');
  });

  test('should mock API responses', async ({ page, context }) => {
    // Mock API
    await context.route('**/api/restaurants', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          restaurants: [
            { id: '1', name: 'Test Restaurant' },
          ],
        }),
      });
    });

    // Navigate
    await page.goto('/restaurants');

    // Verify mocked data is displayed
    await expect(page.locator('[data-testid="restaurant-name"]')).toHaveText(
      'Test Restaurant'
    );
  });

  test.skip('should be skipped', async ({ page }) => {
    // This test will be skipped
    expect(true).toBe(true);
  });

  test.fixme('should be fixed later', async ({ page }) => {
    // This test is marked as broken and needs fixing
    expect(true).toBe(false);
  });
});

test.describe('Example Test Patterns', () => {
  test('should use custom timeout', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds for this test

    await page.goto('/');
    // Long running operation
  });

  test('should use retry', async ({ page }) => {
    test.info().retry = 3; // Retry this test up to 3 times

    await page.goto('/');
    // Potentially flaky operation
  });

  test('should use annotations', async ({ page }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'https://github.com/org/repo/issues/123' },
      { type: 'category', description: 'smoke' }
    );

    await page.goto('/');
  });
});

// Grouped tests with shared setup
test.describe('Feature Group', () => {
  let sharedData: any;

  test.beforeAll(async () => {
    // Setup once for all tests in this group
    sharedData = { value: 'shared' };
  });

  test('test 1', async ({ page }) => {
    expect(sharedData.value).toBe('shared');
  });

  test('test 2', async ({ page }) => {
    expect(sharedData.value).toBe('shared');
  });

  test.afterAll(async () => {
    // Cleanup after all tests
    sharedData = null;
  });
});

// Serial execution (tests run one after another)
test.describe.serial('Serial Tests', () => {
  test('step 1', async ({ page }) => {
    await page.goto('/step1');
  });

  test('step 2', async ({ page }) => {
    await page.goto('/step2');
  });

  test('step 3', async ({ page }) => {
    await page.goto('/step3');
  });
});

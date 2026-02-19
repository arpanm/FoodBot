import { expect } from '@playwright/test';
import { test } from './fixtures/extension-fixture';
import { loginViaAPI, TEST_USERS } from './helpers/auth-helper';
import { createTestJob } from './helpers/api-helper';
import {
  openExtensionPopup,
  waitForExtensionToProcessJob,
  getExtensionStorage,
  triggerExtensionPoll,
  waitForContentScript,
} from './helpers/extension-helper';
import { TEST_JOBS } from './fixtures/test-data';

/**
 * E2E Tests for Chrome Extension Workflow
 * Tests extension job polling, execution, and platform interaction
 */

test.describe('Chrome Extension Workflow', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Login and get auth token
    authToken = await loginViaAPI(page, TEST_USERS.customer.email, TEST_USERS.customer.password);
  });

  test('extension should load and initialize', async ({ extensionContext, extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);

    // Check background page exists
    const backgroundPages = extensionContext.backgroundPages();
    expect(backgroundPages.length).toBeGreaterThan(0);

    // Open popup and verify it loads
    const popupPage = await openExtensionPopup(extensionContext, extensionId);
    await popupPage.waitForSelector('[data-testid="extension-status"]');

    const status = await popupPage.locator('[data-testid="extension-status"]').textContent();
    expect(status).toBe('Ready');
  });

  test('extension should poll for jobs', async ({ extensionContext, extensionId }) => {
    // Create a job
    const job = await createTestJob(
      extensionContext.request,
      {
        ...TEST_JOBS.searchRestaurant,
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Trigger manual poll
    await triggerExtensionPoll(extensionContext);

    // Wait for extension to pick up job
    await waitForExtensionToProcessJob(extensionContext, job.id, 30000);

    // Verify job was processed
    const storage = await getExtensionStorage(extensionContext);
    const processedJobs = (storage.processedJobs as string[]) || [];
    expect(processedJobs).toContain(job.id);
  });

  test('extension should execute search workflow on Swiggy', async ({
    extensionContext,
    extensionId,
  }) => {
    // Create search job
    const job = await createTestJob(
      extensionContext.request,
      {
        action: 'search_restaurant',
        platform: 'swiggy',
        payload: { query: 'pizza' },
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Open Swiggy in a new page
    const page = await extensionContext.newPage();
    await page.goto('https://www.swiggy.com');

    // Wait for content script to load
    await waitForContentScript(page);

    // Trigger extension poll
    await triggerExtensionPoll(extensionContext);

    // Wait for search to be performed
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 10000 });

    // Verify search was performed
    const searchInput = page.locator('input[placeholder*="Search"]');
    const searchValue = await searchInput.inputValue();
    expect(searchValue).toBe('pizza');

    // Verify search results loaded
    await page.waitForSelector('[data-testid="restaurant-card"]', { timeout: 15000 });
    const restaurantCards = page.locator('[data-testid="restaurant-card"]');
    const count = await restaurantCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('extension should add items to cart', async ({ extensionContext, extensionId }) => {
    // Create add to cart job
    const job = await createTestJob(
      extensionContext.request,
      {
        action: 'add_to_cart',
        platform: 'swiggy',
        payload: {
          restaurantId: 'rest-1',
          dishId: 'dish-1',
          quantity: 2,
        },
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Open Swiggy restaurant page
    const page = await extensionContext.newPage();
    await page.goto('https://www.swiggy.com/restaurants/pizza-palace-123');

    // Wait for content script
    await waitForContentScript(page);

    // Trigger extension poll
    await triggerExtensionPoll(extensionContext);

    // Wait for item to be added to cart
    await page.waitForSelector('[data-testid="cart-badge"]', { timeout: 15000 });

    // Verify cart count updated
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    const cartCount = await cartBadge.textContent();
    expect(parseInt(cartCount || '0')).toBeGreaterThan(0);

    // Verify job completed
    await waitForExtensionToProcessJob(extensionContext, job.id);
  });

  test('extension should handle checkout workflow', async ({ extensionContext, extensionId }) => {
    // First add items to cart (prerequisite)
    await createTestJob(
      extensionContext.request,
      {
        action: 'add_to_cart',
        platform: 'swiggy',
        payload: {
          restaurantId: 'rest-1',
          dishId: 'dish-1',
          quantity: 2,
        },
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Wait for add to cart to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Create checkout job
    const checkoutJob = await createTestJob(
      extensionContext.request,
      {
        action: 'checkout',
        platform: 'swiggy',
        payload: {
          deliveryAddress: '123 Main St, New York, NY 10001',
          paymentMethod: 'cash',
        },
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Open Swiggy cart page
    const page = await extensionContext.newPage();
    await page.goto('https://www.swiggy.com/cart');

    // Wait for content script
    await waitForContentScript(page);

    // Trigger extension poll
    await triggerExtensionPoll(extensionContext);

    // Wait for checkout to start
    await page.waitForURL('**/checkout*', { timeout: 30000 });

    // Verify checkout page loaded
    expect(page.url()).toContain('checkout');

    // Verify address filled
    const addressInput = page.locator('[data-testid="delivery-address"]');
    await expect(addressInput).toHaveValue('123 Main St, New York, NY 10001');

    // Verify payment method selected
    const cashOption = page.locator('[data-testid="payment-cash"]');
    await expect(cashOption).toBeChecked();
  });

  test('extension should report errors for failed jobs', async ({
    extensionContext,
    extensionId,
  }) => {
    // Create invalid job
    const job = await createTestJob(
      extensionContext.request,
      {
        action: 'invalid_action',
        platform: 'swiggy',
        payload: {},
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Trigger poll
    await triggerExtensionPoll(extensionContext);

    // Wait a bit for processing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check extension storage for error
    const storage = await getExtensionStorage(extensionContext);
    const errors = (storage.errors as Array<{ jobId: string; error: string }>) || [];

    const jobError = errors.find((e) => e.jobId === job.id);
    expect(jobError).toBeTruthy();
    expect(jobError?.error).toContain('Invalid action');
  });

  test('extension should handle multiple jobs in queue', async ({
    extensionContext,
    extensionId,
  }) => {
    // Create multiple jobs
    const jobs = await Promise.all([
      createTestJob(
        extensionContext.request,
        { ...TEST_JOBS.searchRestaurant, userId: TEST_USERS.customer.email },
        authToken
      ),
      createTestJob(
        extensionContext.request,
        { ...TEST_JOBS.addToCart, userId: TEST_USERS.customer.email },
        authToken
      ),
    ]);

    // Trigger poll
    await triggerExtensionPoll(extensionContext);

    // Wait for all jobs to be processed
    for (const job of jobs) {
      await waitForExtensionToProcessJob(extensionContext, job.id, 60000);
    }

    // Verify all jobs processed
    const storage = await getExtensionStorage(extensionContext);
    const processedJobs = (storage.processedJobs as string[]) || [];

    for (const job of jobs) {
      expect(processedJobs).toContain(job.id);
    }
  });

  test('extension popup should display current job status', async ({
    extensionContext,
    extensionId,
  }) => {
    // Create job
    const job = await createTestJob(
      extensionContext.request,
      {
        ...TEST_JOBS.searchRestaurant,
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Open popup
    const popupPage = await openExtensionPopup(extensionContext, extensionId);

    // Trigger poll
    await triggerExtensionPoll(extensionContext);

    // Wait for job to appear in popup
    await popupPage.waitForSelector(`[data-testid="current-job-${job.id}"]`, {
      timeout: 10000,
    });

    // Verify job details displayed
    const jobCard = popupPage.locator(`[data-testid="current-job-${job.id}"]`);
    await expect(jobCard).toBeVisible();

    const jobStatus = jobCard.locator('[data-testid="job-status"]');
    await expect(jobStatus).toHaveText('in_progress');
  });

  test('extension should persist state across browser restarts', async ({
    extensionContext,
    extensionId,
  }) => {
    // Set some state
    await getExtensionStorage(extensionContext);

    // Create and process a job
    const job = await createTestJob(
      extensionContext.request,
      {
        ...TEST_JOBS.searchRestaurant,
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    await triggerExtensionPoll(extensionContext);
    await waitForExtensionToProcessJob(extensionContext, job.id);

    // Get processed jobs
    const storage1 = await getExtensionStorage(extensionContext);
    const processedJobs1 = (storage1.processedJobs as string[]) || [];

    // Simulate restart by getting storage again
    const storage2 = await getExtensionStorage(extensionContext);
    const processedJobs2 = (storage2.processedJobs as string[]) || [];

    // Verify state persisted
    expect(processedJobs2).toEqual(processedJobs1);
    expect(processedJobs2).toContain(job.id);
  });
});

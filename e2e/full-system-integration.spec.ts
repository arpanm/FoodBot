import { expect } from '@playwright/test';
import { test } from './fixtures/extension-fixture';
import { loginViaAPI, TEST_USERS } from './helpers/auth-helper';
import {
  createOrder,
  getOrderStatus,
  pollJobUntilComplete,
  createTestJob,
} from './helpers/api-helper';
import {
  triggerExtensionPoll,
  waitForExtensionToProcessJob,
  waitForContentScript,
} from './helpers/extension-helper';
import { SELECTORS, TEST_ORDERS, CHAT_MESSAGES } from './fixtures/test-data';

/**
 * E2E Tests for Full System Integration
 * Tests the complete end-to-end workflow from user input to order completion
 */

test.describe('Full System Integration', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    authToken = await loginViaAPI(page, TEST_USERS.customer.email, TEST_USERS.customer.password);
  });

  test('complete order flow: chat → job → extension → completion', async ({
    page,
    extensionContext,
    extensionId,
  }) => {
    // Step 1: User creates order via chatbot
    await page.goto('/chat');
    await page.fill(SELECTORS.chatInput, CHAT_MESSAGES.orderPizza);
    await page.click(SELECTORS.sendButton);

    // Wait for job creation
    await page.waitForSelector('[data-testid="job-created"]', { timeout: 10000 });
    const jobId = await page.locator(SELECTORS.jobId).textContent();
    expect(jobId).toBeTruthy();

    // Step 2: Navigate to job tracking
    await page.click(`[data-testid="view-job-${jobId}"]`);
    await page.waitForURL(`**/jobs/${jobId}`);

    // Verify job is pending
    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('pending');

    // Step 3: Extension picks up and executes job
    const extensionPage = await extensionContext.newPage();
    await extensionPage.goto('https://www.swiggy.com');
    await waitForContentScript(extensionPage);

    // Trigger extension poll
    await triggerExtensionPoll(extensionContext);

    // Step 4: Wait for extension to process
    await waitForExtensionToProcessJob(extensionContext, jobId || '', 60000);

    // Step 5: Verify job completed
    await page.reload();
    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('completed');

    // Step 6: Verify order created
    const resultSection = page.locator('[data-testid="job-result"]');
    await expect(resultSection).toBeVisible();

    const orderIdText = await resultSection.locator('[data-testid="order-id"]').textContent();
    expect(orderIdText).toBeTruthy();

    // Step 7: Navigate to order tracking
    await page.click(`[data-testid="view-order"]`);
    await page.waitForURL('**/orders/*');

    // Step 8: Verify order details
    await expect(page.locator('[data-testid="order-restaurant"]')).toContainText('Pizza Palace');
    await expect(page.locator(SELECTORS.orderStatus)).toHaveText('confirmed');
  });

  test('search → select → add to cart → checkout flow', async ({
    page,
    extensionContext,
    extensionId,
  }) => {
    // Step 1: Search for restaurants
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'pizza');
    await page.click('[data-testid="search-button"]');

    // Wait for results
    await page.waitForSelector(SELECTORS.restaurantList);
    const restaurants = page.locator(SELECTORS.restaurantCard);
    await expect(restaurants.first()).toBeVisible();

    // Step 2: Select restaurant
    await restaurants.first().click();
    await page.waitForURL('**/restaurants/*');

    // Step 3: Add items to cart
    const addToCartButtons = page.locator('[data-testid="add-to-cart-button"]');
    await addToCartButtons.first().click();
    await addToCartButtons.nth(1).click();

    // Verify cart count
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('2');

    // Step 4: Go to cart
    await page.click(SELECTORS.cartIcon);
    await page.waitForURL('**/cart');

    // Verify cart items
    const cartItems = page.locator(SELECTORS.cartItem);
    await expect(cartItems).toHaveCount(2);

    // Step 5: Proceed to checkout
    await page.click(SELECTORS.checkoutButton);

    // Wait for job creation
    await page.waitForSelector('[data-testid="checkout-job-created"]');

    // Step 6: Extension executes checkout
    const extensionPage = await extensionContext.newPage();
    await extensionPage.goto('https://www.swiggy.com/cart');
    await waitForContentScript(extensionPage);

    await triggerExtensionPoll(extensionContext);

    // Wait for checkout to complete
    await page.waitForSelector('[data-testid="order-confirmed"]', { timeout: 60000 });

    // Step 7: Verify order confirmation
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText(
      'Order placed successfully'
    );

    const orderId = await page.locator('[data-testid="confirmation-order-id"]').textContent();
    expect(orderId).toMatch(/^ORD-\d+$/);
  });

  test('multiple concurrent jobs execution', async ({ page, extensionContext, extensionId }) => {
    // Create multiple jobs
    const jobs = await Promise.all([
      createTestJob(
        page.request,
        {
          action: 'search_restaurant',
          platform: 'swiggy',
          payload: { query: 'pizza' },
          userId: TEST_USERS.customer.email,
        },
        authToken
      ),
      createTestJob(
        page.request,
        {
          action: 'search_restaurant',
          platform: 'swiggy',
          payload: { query: 'burger' },
          userId: TEST_USERS.customer.email,
        },
        authToken
      ),
      createTestJob(
        page.request,
        {
          action: 'search_restaurant',
          platform: 'swiggy',
          payload: { query: 'sushi' },
          userId: TEST_USERS.customer.email,
        },
        authToken
      ),
    ]);

    // Navigate to jobs dashboard
    await page.goto('/jobs');

    // Trigger extension to process all jobs
    await triggerExtensionPoll(extensionContext);

    // Wait for all jobs to complete
    for (const job of jobs) {
      await page.waitForSelector(`[data-testid="job-card-${job.id}"][data-status="completed"]`, {
        timeout: 90000,
      });
    }

    // Verify all jobs completed
    for (const job of jobs) {
      const jobCard = page.locator(`[data-testid="job-card-${job.id}"]`);
      const statusBadge = jobCard.locator('[data-testid="job-status-badge"]');
      await expect(statusBadge).toHaveText('completed');
    }
  });

  test('error recovery: failed job retry flow', async ({ page, extensionContext, extensionId }) => {
    // Create job that will fail
    const job = await createTestJob(
      page.request,
      {
        action: 'checkout',
        platform: 'swiggy',
        payload: {}, // Missing required fields
        userId: TEST_USERS.customer.email,
      },
      authToken
    );

    // Navigate to job page
    await page.goto(`/jobs/${job.id}`);

    // Trigger extension
    await triggerExtensionPoll(extensionContext);

    // Wait for job to fail
    await page.waitForSelector('[data-testid="job-status"][data-status="failed"]', {
      timeout: 30000,
    });

    // Verify error displayed
    const errorMessage = page.locator('[data-testid="job-error"]');
    await expect(errorMessage).toBeVisible();

    // Click retry button
    await page.click('[data-testid="retry-job-button"]');

    // Wait for confirmation
    await page.waitForSelector('[data-testid="job-retried"]');

    // Verify new job created
    const newJobId = await page.locator('[data-testid="new-job-id"]').textContent();
    expect(newJobId).not.toBe(job.id);

    // Navigate to new job
    await page.click(`[data-testid="view-new-job"]`);
    await page.waitForURL(`**/jobs/${newJobId}`);

    // Verify new job is pending
    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('pending');
  });

  test('real-time order tracking with live updates', async ({
    page,
    extensionContext,
    extensionId,
  }) => {
    // Create order
    const { orderId, jobId } = await createOrder(
      page.request,
      {
        restaurantId: 'rest-1',
        items: [
          { dishId: 'dish-1', quantity: 2 },
          { dishId: 'dish-2', quantity: 1 },
        ],
        deliveryAddress: '123 Main St, New York, NY 10001',
      },
      authToken
    );

    // Navigate to order tracking
    await page.goto(`/orders/${orderId}`);

    // Verify initial status
    await expect(page.locator(SELECTORS.orderStatus)).toHaveText('pending');

    // Extension processes the order
    await triggerExtensionPoll(extensionContext);

    // Monitor status changes in real-time
    const statusChanges: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Order status:')) {
        statusChanges.push(msg.text());
      }
    });

    // Wait for status to progress
    await page.waitForSelector('[data-testid="order-status"][data-status="confirmed"]', {
      timeout: 30000,
    });

    await expect(page.locator(SELECTORS.orderStatus)).toHaveText('confirmed');

    // Verify tracking info displayed
    const trackingSection = page.locator('[data-testid="order-tracking"]');
    await expect(trackingSection).toBeVisible();

    // Verify timeline shows progress
    const timelineSteps = page.locator('[data-testid="timeline-step"]');
    await expect(timelineSteps).toHaveCount(4); // Order placed, Confirmed, Preparing, Out for delivery

    // Verify received status updates
    expect(statusChanges.length).toBeGreaterThan(0);
  });

  test('user can cancel order before confirmation', async ({
    page,
    extensionContext,
    extensionId,
  }) => {
    // Create order
    const { orderId, jobId } = await createOrder(
      page.request,
      TEST_ORDERS[0],
      authToken
    );

    // Navigate to order
    await page.goto(`/orders/${orderId}`);

    // Verify cancel button available
    const cancelButton = page.locator('[data-testid="cancel-order-button"]');
    await expect(cancelButton).toBeVisible();

    // Click cancel
    await cancelButton.click();

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel-button"]');

    // Wait for cancellation to complete
    await page.waitForSelector('[data-testid="order-cancelled"]');

    // Verify status updated
    await expect(page.locator(SELECTORS.orderStatus)).toHaveText('cancelled');

    // Verify refund initiated
    const refundMessage = page.locator('[data-testid="refund-message"]');
    await expect(refundMessage).toContainText('Refund will be processed');
  });

  test('end-to-end performance: order completion under 2 minutes', async ({
    page,
    extensionContext,
    extensionId,
  }) => {
    const startTime = Date.now();

    // Create order via chat
    await page.goto('/chat');
    await page.fill(SELECTORS.chatInput, CHAT_MESSAGES.orderPizza);
    await page.click(SELECTORS.sendButton);

    // Wait for job
    await page.waitForSelector('[data-testid="job-created"]');
    const jobId = await page.locator(SELECTORS.jobId).textContent();

    // Extension processes
    await triggerExtensionPoll(extensionContext);

    // Wait for completion
    await pollJobUntilComplete(page.request, jobId || '', authToken, { timeout: 120000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify completion within 2 minutes
    expect(duration).toBeLessThan(120000);

    console.log(`✅ Order completed in ${duration}ms`);
  });
});

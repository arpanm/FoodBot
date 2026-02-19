import { test, expect } from '@playwright/test';
import {
  createLoginPage,
  createChatPage,
  createJobTrackingPage,
  createRestaurantSearchPage,
  createCartPage,
} from './helpers/page-objects';
import { TEST_USERS } from './helpers/auth-helper';

/**
 * Example E2E Tests Using Page Object Model
 * Demonstrates how to use Page Objects for cleaner, more maintainable tests
 */

test.describe('Page Object Model Examples', () => {
  test('should login using page object', async ({ page }) => {
    const loginPage = createLoginPage(page);

    await loginPage.goto('/login');
    await loginPage.login(TEST_USERS.customer.email, TEST_USERS.customer.password);

    // Verify logged in
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create job via chat using page object', async ({ page }) => {
    // Login first
    const loginPage = createLoginPage(page);
    await loginPage.goto('/login');
    await loginPage.login(TEST_USERS.customer.email, TEST_USERS.customer.password);

    // Navigate to chat
    const chatPage = createChatPage(page);
    await chatPage.goto('/chat');

    // Send message
    await chatPage.sendMessage('Order pizza from Dominos');

    // Wait for job creation
    const jobId = await chatPage.waitForJobCreation();
    expect(jobId).toBeTruthy();

    // Navigate to job tracking
    const jobTrackingPage = createJobTrackingPage(page, jobId);
    await jobTrackingPage.gotoJobPage();

    // Verify job status
    const status = await jobTrackingPage.getStatus();
    expect(status).toBe('pending');
  });

  test('should search and select restaurant using page objects', async ({ page }) => {
    // Login
    const loginPage = createLoginPage(page);
    await loginPage.goto('/login');
    await loginPage.login(TEST_USERS.customer.email, TEST_USERS.customer.password);

    // Search restaurants
    const searchPage = createRestaurantSearchPage(page);
    await searchPage.goto('/');
    await searchPage.search('pizza');

    // Verify results
    const count = await searchPage.getRestaurantCount();
    expect(count).toBeGreaterThan(0);

    // Get first restaurant name
    const name = await searchPage.getRestaurantName(0);
    console.log(`First restaurant: ${name}`);

    // Select first restaurant
    await searchPage.selectRestaurant(0);

    // Verify navigation to restaurant page
    await expect(page).toHaveURL(/.*restaurants\/.*/);
  });

  test('should add items to cart and checkout using page objects', async ({ page }) => {
    // Login
    const loginPage = createLoginPage(page);
    await loginPage.goto('/login');
    await loginPage.login(TEST_USERS.customer.email, TEST_USERS.customer.password);

    // Navigate to restaurant (assume we know the URL)
    await page.goto('/restaurants/rest-1');

    // Add items to cart
    const menuPage = createRestaurantSearchPage(page);
    // Note: You would typically use createRestaurantMenuPage here
    // This is just for demonstration

    // Go to cart
    const cartPage = createCartPage(page);
    await cartPage.gotoCart();

    // Verify cart
    const itemCount = await cartPage.getItemCount();
    expect(itemCount).toBeGreaterThan(0);

    // Proceed to checkout
    await cartPage.proceedToCheckout();

    // Verify checkout initiated
    await expect(page).toHaveURL(/.*checkout/);
  });

  test('should handle job status changes using page objects', async ({ page }) => {
    // Login
    const loginPage = createLoginPage(page);
    await loginPage.goto('/login');
    await loginPage.login(TEST_USERS.customer.email, TEST_USERS.customer.password);

    // Create job via chat
    const chatPage = createChatPage(page);
    await chatPage.goto('/chat');
    await chatPage.sendMessage('Find sushi restaurants');
    const jobId = await chatPage.waitForJobCreation();

    // Track job
    const jobTrackingPage = createJobTrackingPage(page, jobId);
    await jobTrackingPage.gotoJobPage();

    // Wait for status change
    await jobTrackingPage.waitForStatus('in_progress', 30000);

    // Verify status updated
    const status = await jobTrackingPage.getStatus();
    expect(status).toBe('in_progress');

    // Wait for completion
    await jobTrackingPage.waitForStatus('completed', 60000);

    // Get result
    const result = await jobTrackingPage.getResult();
    expect(result).toBeTruthy();
  });
});

/**
 * Benefits of Page Object Model:
 *
 * 1. Maintainability - Update selectors in one place
 * 2. Readability - Tests read like business logic
 * 3. Reusability - Share page objects across tests
 * 4. Type Safety - TypeScript provides autocomplete and type checking
 * 5. Encapsulation - Hide implementation details
 */

/**
 * Example E2E Test with Playwright
 * Demonstrates end-to-end testing patterns
 */

import { test, expect, type Page } from '@playwright/test';

// Constants
const RESTAURANT_CARD_SELECTOR = '[data-testid="restaurant-card"]';

// Test setup
test.describe('Customer App E2E Example', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app before each test
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check page loaded
    await expect(page).toHaveTitle(/FoodBot/);

    // Check main elements are visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should search for restaurants', async ({ page }) => {
    // Arrange: Find search input
    const searchInput = page.locator('[data-testid="search-input"]');
    const searchButton = page.locator('[data-testid="search-button"]');

    // Act: Enter search query
    await searchInput.fill('Italian restaurants');
    await searchButton.click();

    // Assert: Check results are displayed
    await expect(page.locator(RESTAURANT_CARD_SELECTOR).first()).toBeVisible();
    await expect(page.locator(RESTAURANT_CARD_SELECTOR)).toHaveCount(5, { timeout: 5000 });
  });

  test('should display restaurant details', async ({ page }) => {
    // Navigate to restaurant page
    await page.goto('/restaurant/123');

    // Check restaurant details are displayed
    await expect(page.locator('[data-testid="restaurant-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="restaurant-menu"]')).toBeVisible();

    // Check menu items
    const menuItems = page.locator('[data-testid="menu-item"]');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Playwright's toHaveCountGreaterThan is not typed correctly
    await expect(menuItems).toHaveCountGreaterThan(0);
  });

  test('should add item to cart', async ({ page }) => {
    // Go to restaurant page
    await page.goto('/restaurant/123');

    // Find first menu item and add to cart
    const firstItem = page.locator('[data-testid="menu-item"]').first();
    const addButton = firstItem.locator('[data-testid="add-to-cart"]');

    // Check cart is initially empty
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('0');

    // Add item
    await addButton.click();

    // Verify cart updated
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
  });

  test('should complete checkout flow', async ({ page }) => {
    // Add item to cart (reuse logic or navigate to pre-filled state)
    await page.goto('/cart?items=dish-123');

    // Check cart page
    await expect(page.locator('[data-testid="cart-items"]')).toBeVisible();

    // Proceed to checkout
    await page.locator('[data-testid="checkout-button"]').click();

    // Fill address
    await page.locator('[data-testid="address-input"]').fill('123 Main St');
    await page.locator('[data-testid="city-input"]').fill('San Francisco');

    // Select payment method
    await page.locator('[data-testid="payment-method"]').selectOption('card');

    // Place order
    await page.locator('[data-testid="place-order-button"]').click();

    // Verify order confirmation
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-id"]')).toBeVisible();
  });
});

test.describe('Mobile Experience Example', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should display mobile menu', async ({ page }) => {
    await page.goto('/');

    // Find mobile menu button
    const menuButton = page.locator('[data-testid="mobile-menu-button"]');
    await expect(menuButton).toBeVisible();

    // Open menu
    await menuButton.click();

    // Verify menu is open
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});

test.describe('Chat Interface Example', () => {
  test('should interact with chat bot', async ({ page }) => {
    await page.goto('/');

    // Open chat
    const chatButton = page.locator('[data-testid="chat-button"]');
    await chatButton.click();

    // Wait for chat to open
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Type message
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('I want to order Italian food');
    await chatInput.press('Enter');

    // Wait for bot response
    await expect(page.locator('[data-testid="bot-message"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Verify response contains cards
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Playwright's toHaveCountGreaterThan is not typed correctly
    await expect(page.locator(RESTAURANT_CARD_SELECTOR)).toHaveCountGreaterThan(0);
  });
});

// API Testing Example
test.describe('API Integration Example', () => {
  test('should create order via API', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        userId: 'test-user',
        items: [{ dishId: 'dish-123', quantity: 2 }],
      },
    });

    expect(response.ok()).toBeTruthy();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Playwright's response.json() returns any
    const data = await response.json();
    expect(data).toHaveProperty('orderId');
    expect(data).toHaveProperty('status', 'pending');
  });

  test('should get order status', async ({ request }) => {
    // Create order first
    const createResponse = await request.post('/api/orders', {
      data: { userId: 'test-user', items: [] },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Playwright's response.json() returns any
    const { orderId } = await createResponse.json();

    // Get order status
    const statusResponse = await request.get(`/api/orders/${orderId}`);
    expect(statusResponse.ok()).toBeTruthy();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Playwright's response.json() returns any
    const status = await statusResponse.json();
    expect(status).toHaveProperty('orderId', orderId);
    expect(status).toHaveProperty('status');
  });
});

// Helper functions for E2E tests
// These functions may be used in future tests or can be called from other test files
async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('[data-testid="email-input"]').fill(email);
  await page.locator('[data-testid="password-input"]').fill(password);
  await page.locator('[data-testid="login-button"]').click();
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

async function addItemToCart(page: Page, itemId: string): Promise<void> {
  await page.goto(`/restaurant?highlight=${itemId}`);
  await page.locator(`[data-testid="add-to-cart-${itemId}"]`).click();
}

// Export helper functions for potential reuse in other test files
export { loginUser, addItemToCart };

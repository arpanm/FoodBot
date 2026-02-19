import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model (POM) classes
 * Encapsulates page interactions for better maintainability
 */

// Base Page Object
export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}

// Login Page
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.registerLink = page.locator('[data-testid="register-link"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard');
  }

  async isLoginError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }
}

// Chat Page
export class ChatPage extends BasePage {
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly chatMessages: Locator;
  readonly jobCreatedNotification: Locator;
  readonly jobIdDisplay: Locator;

  constructor(page: Page) {
    super(page);
    this.chatInput = page.locator('[data-testid="chat-input"]');
    this.sendButton = page.locator('[data-testid="send-button"]');
    this.chatMessages = page.locator('[data-testid="chat-message"]');
    this.jobCreatedNotification = page.locator('[data-testid="job-created"]');
    this.jobIdDisplay = page.locator('[data-testid="job-id"]');
  }

  async sendMessage(message: string): Promise<void> {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  async waitForJobCreation(): Promise<string> {
    await this.jobCreatedNotification.waitFor({ state: 'visible' });
    const jobId = await this.jobIdDisplay.textContent();
    return jobId || '';
  }

  async getLastMessage(): Promise<string> {
    const messages = this.chatMessages;
    const count = await messages.count();
    return messages.nth(count - 1).textContent() || '';
  }
}

// Job Tracking Page
export class JobTrackingPage extends BasePage {
  readonly jobStatus: Locator;
  readonly progressTracker: Locator;
  readonly jobResult: Locator;
  readonly jobError: Locator;
  readonly retryButton: Locator;

  constructor(page: Page, private jobId: string) {
    super(page);
    this.jobStatus = page.locator('[data-testid="job-status"]');
    this.progressTracker = page.locator('[data-testid="progress-tracker"]');
    this.jobResult = page.locator('[data-testid="job-result"]');
    this.jobError = page.locator('[data-testid="job-error"]');
    this.retryButton = page.locator('[data-testid="retry-job-button"]');
  }

  async gotoJobPage(): Promise<void> {
    await this.page.goto(`/jobs/${this.jobId}`);
  }

  async getStatus(): Promise<string> {
    return this.jobStatus.textContent() || '';
  }

  async waitForStatus(status: string, timeout = 30000): Promise<void> {
    await this.page.waitForSelector(
      `[data-testid="job-status"][data-status="${status}"]`,
      { timeout }
    );
  }

  async getResult(): Promise<string> {
    await this.jobResult.waitFor({ state: 'visible' });
    return this.jobResult.textContent() || '';
  }

  async getError(): Promise<string> {
    await this.jobError.waitFor({ state: 'visible' });
    return this.jobError.textContent() || '';
  }

  async retry(): Promise<string> {
    await this.retryButton.click();
    await this.page.waitForSelector('[data-testid="job-retried"]');
    const newJobId = await this.page.locator('[data-testid="new-job-id"]').textContent();
    return newJobId || '';
  }
}

// Restaurant Search Page
export class RestaurantSearchPage extends BasePage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly restaurantList: Locator;
  readonly restaurantCards: Locator;
  readonly filterButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.restaurantList = page.locator('[data-testid="restaurant-list"]');
    this.restaurantCards = page.locator('[data-testid="restaurant-card"]');
    this.filterButton = page.locator('[data-testid="filter-button"]');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.restaurantList.waitFor({ state: 'visible' });
  }

  async getRestaurantCount(): Promise<number> {
    return this.restaurantCards.count();
  }

  async selectRestaurant(index: number): Promise<void> {
    await this.restaurantCards.nth(index).click();
    await this.page.waitForURL('**/restaurants/*');
  }

  async getRestaurantName(index: number): Promise<string> {
    const name = this.restaurantCards.nth(index).locator('[data-testid="restaurant-name"]');
    return name.textContent() || '';
  }
}

// Restaurant Menu Page
export class RestaurantMenuPage extends BasePage {
  readonly menuItems: Locator;
  readonly addToCartButtons: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.menuItems = page.locator('[data-testid="menu-item"]');
    this.addToCartButtons = page.locator('[data-testid="add-to-cart-button"]');
    this.cartBadge = page.locator('[data-testid="cart-badge"]');
  }

  async addItemToCart(index: number): Promise<void> {
    await this.addToCartButtons.nth(index).click();
  }

  async getCartCount(): Promise<number> {
    const text = await this.cartBadge.textContent();
    return parseInt(text || '0');
  }

  async getMenuItemCount(): Promise<number> {
    return this.menuItems.count();
  }
}

// Cart Page
export class CartPage extends BasePage {
  readonly cartItems: Locator;
  readonly cartTotal: Locator;
  readonly checkoutButton: Locator;
  readonly removeButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('[data-testid="cart-item"]');
    this.cartTotal = page.locator('[data-testid="cart-total"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
    this.removeButtons = page.locator('[data-testid="remove-item-button"]');
  }

  async gotoCart(): Promise<void> {
    await this.page.goto('/cart');
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async getTotal(): Promise<string> {
    return this.cartTotal.textContent() || '';
  }

  async removeItem(index: number): Promise<void> {
    await this.removeButtons.nth(index).click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}

// Order Tracking Page
export class OrderTrackingPage extends BasePage {
  readonly orderStatus: Locator;
  readonly orderTimeline: Locator;
  readonly cancelButton: Locator;
  readonly trackingInfo: Locator;

  constructor(page: Page, private orderId: string) {
    super(page);
    this.orderStatus = page.locator('[data-testid="order-status"]');
    this.orderTimeline = page.locator('[data-testid="order-tracking"]');
    this.cancelButton = page.locator('[data-testid="cancel-order-button"]');
    this.trackingInfo = page.locator('[data-testid="tracking-info"]');
  }

  async gotoOrderPage(): Promise<void> {
    await this.page.goto(`/orders/${this.orderId}`);
  }

  async getStatus(): Promise<string> {
    return this.orderStatus.textContent() || '';
  }

  async waitForStatus(status: string, timeout = 30000): Promise<void> {
    await this.page.waitForSelector(
      `[data-testid="order-status"][data-status="${status}"]`,
      { timeout }
    );
  }

  async cancelOrder(): Promise<void> {
    await this.cancelButton.click();
    await this.page.click('[data-testid="confirm-cancel-button"]');
    await this.page.waitForSelector('[data-testid="order-cancelled"]');
  }

  async getTimelineStepCount(): Promise<number> {
    const steps = this.page.locator('[data-testid="timeline-step"]');
    return steps.count();
  }
}

// Extension Popup Page
export class ExtensionPopupPage extends BasePage {
  readonly extensionStatus: Locator;
  readonly pollingToggle: Locator;
  readonly currentJobs: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.extensionStatus = page.locator('[data-testid="extension-status"]');
    this.pollingToggle = page.locator('[data-testid="polling-toggle"]');
    this.currentJobs = page.locator('[data-testid="current-job"]');
    this.settingsButton = page.locator('[data-testid="settings-button"]');
  }

  async getStatus(): Promise<string> {
    return this.extensionStatus.textContent() || '';
  }

  async togglePolling(): Promise<void> {
    await this.pollingToggle.click();
  }

  async getCurrentJobCount(): Promise<number> {
    return this.currentJobs.count();
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }
}

// Factory functions to create page objects
export function createLoginPage(page: Page): LoginPage {
  return new LoginPage(page);
}

export function createChatPage(page: Page): ChatPage {
  return new ChatPage(page);
}

export function createJobTrackingPage(page: Page, jobId: string): JobTrackingPage {
  return new JobTrackingPage(page, jobId);
}

export function createRestaurantSearchPage(page: Page): RestaurantSearchPage {
  return new RestaurantSearchPage(page);
}

export function createRestaurantMenuPage(page: Page): RestaurantMenuPage {
  return new RestaurantMenuPage(page);
}

export function createCartPage(page: Page): CartPage {
  return new CartPage(page);
}

export function createOrderTrackingPage(page: Page, orderId: string): OrderTrackingPage {
  return new OrderTrackingPage(page, orderId);
}

export function createExtensionPopupPage(page: Page): ExtensionPopupPage {
  return new ExtensionPopupPage(page);
}

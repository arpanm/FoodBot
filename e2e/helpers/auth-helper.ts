import { Page } from '@playwright/test';

/**
 * Authentication helper utilities for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  token?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  customer: {
    email: 'test.user@example.com',
    password: 'Test123!@#',
    name: 'Test User',
    role: 'customer',
  },
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    name: 'Admin User',
    role: 'admin',
  },
};

/**
 * Login via UI
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');

  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');

  // Wait for navigation to complete
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Login via API and set cookies
 */
export async function loginViaAPI(
  page: Page,
  email: string,
  password: string
): Promise<string> {
  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${gatewayUrl}/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
  }

  const { accessToken, user } = await response.json();

  // Set auth token in localStorage
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('authToken', token);
  }, accessToken);

  return accessToken;
}

/**
 * Logout
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('**/login');
}

/**
 * Get auth token from page
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return localStorage.getItem('authToken');
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await getAuthToken(page);
  return token !== null;
}

/**
 * Register new user via API
 */
export async function registerUser(
  page: Page,
  userData: Partial<TestUser>
): Promise<TestUser> {
  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${gatewayUrl}/auth/register`, {
    data: userData,
  });

  if (!response.ok()) {
    throw new Error(`Registration failed: ${response.status()} ${response.statusText()}`);
  }

  const { user } = await response.json();
  return { ...userData, ...user } as TestUser;
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('authToken');
    sessionStorage.clear();
  });
}

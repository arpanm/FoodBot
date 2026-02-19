import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 * Tests the full FoodBot system including Chrome Extension, API Gateway, and Frontend
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['list'], // Console reporter
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:3001',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time each action can take
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
  },

  // Configure projects for major browsers
  projects: [
    // Main desktop browser testing
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      testIgnore: '**/extension-*.spec.ts',
    },

    // Chrome extension testing - uses real Chrome with extension loaded
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        contextOptions: {
          permissions: ['notifications', 'storage'],
        },
      },
      testMatch: '**/extension-*.spec.ts',
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: '**/extension-*.spec.ts', // Extensions not supported in Firefox tests
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: '**/extension-*.spec.ts', // Extensions not supported in Safari tests
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: '**/extension-*.spec.ts',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: '**/extension-*.spec.ts',
    },

    // Tablet viewports
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
      testIgnore: '**/extension-*.spec.ts',
    },
  ],

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'pnpm dev:gateway',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
      },
    },
    {
      command: 'pnpm dev:customer-app',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
      },
    },
  ],

  // Global timeout for the entire test run
  globalTimeout: 600000, // 10 minutes

  // Timeout for each test
  timeout: 60000, // 1 minute per test

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Output directory
  outputDir: 'test-results/playwright',

  // Preserve output between test runs
  preserveOutput: 'always',

  // Global setup and teardown
  globalSetup: require.resolve('./e2e/setup/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/setup/global-teardown.ts'),
});

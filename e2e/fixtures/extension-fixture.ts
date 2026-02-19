import { test as base, BrowserContext } from '@playwright/test';
import { loadExtension, configureExtension } from '../helpers/extension-helper';

/**
 * Custom Playwright fixture that loads the Chrome Extension
 */

export type ExtensionFixtures = {
  extensionContext: BrowserContext;
  extensionId: string;
};

export const test = base.extend<ExtensionFixtures>({
  extensionContext: async ({}, use) => {
    const { context, extensionId } = await loadExtension();

    // Configure extension with test settings
    await configureExtension(context, {
      pollingInterval: 2000, // Faster polling for tests
      autoStart: true,
      apiEndpoint: process.env.GATEWAY_API_URL || 'http://localhost:3000',
    });

    await use(context);

    // Cleanup
    await context.close();
  },

  extensionId: async ({ extensionContext }, use) => {
    const backgroundPages = extensionContext.backgroundPages();
    const extensionId = backgroundPages[0]?.url().split('/')[2] || '';
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';

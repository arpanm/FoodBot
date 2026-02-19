import { BrowserContext, Page, chromium } from '@playwright/test';
import * as path from 'node:path';

/**
 * Chrome Extension helper utilities for E2E tests
 */

export const EXTENSION_PATH = path.join(__dirname, '../../chrome-extension/dist');

/**
 * Load Chrome Extension into browser context
 */
export async function loadExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Extensions require headed mode
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  // Get extension ID
  const extensionId = await getExtensionId(context);

  return { context, extensionId };
}

/**
 * Get extension ID from background page
 */
async function getExtensionId(context: BrowserContext): Promise<string> {
  // Wait for extension to load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const backgroundPages = context.backgroundPages();
  if (backgroundPages.length === 0) {
    throw new Error('Extension background page not found');
  }

  const backgroundPage = backgroundPages[0];
  const extensionId = backgroundPage.url().split('/')[2];

  return extensionId;
}

/**
 * Open extension popup
 */
export async function openExtensionPopup(
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const popupUrl = `chrome-extension://${extensionId}/ui/popup.html`;
  const page = await context.newPage();
  await page.goto(popupUrl);
  return page;
}

/**
 * Get extension storage data
 */
export async function getExtensionStorage(
  context: BrowserContext
): Promise<Record<string, unknown>> {
  const backgroundPage = context.backgroundPages()[0];

  return backgroundPage.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(items);
      });
    });
  });
}

/**
 * Set extension storage data
 */
export async function setExtensionStorage(
  context: BrowserContext,
  data: Record<string, unknown>
): Promise<void> {
  const backgroundPage = context.backgroundPages()[0];

  await backgroundPage.evaluate((storageData) => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set(storageData, () => {
        resolve();
      });
    });
  }, data);
}

/**
 * Clear extension storage
 */
export async function clearExtensionStorage(context: BrowserContext): Promise<void> {
  const backgroundPage = context.backgroundPages()[0];

  await backgroundPage.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  });
}

/**
 * Trigger extension polling manually
 */
export async function triggerExtensionPoll(context: BrowserContext): Promise<void> {
  const backgroundPage = context.backgroundPages()[0];

  await backgroundPage.evaluate(() => {
    // Send message to background script to force poll
    chrome.runtime.sendMessage({ action: 'force-poll' });
  });
}

/**
 * Wait for extension to process job
 */
export async function waitForExtensionToProcessJob(
  context: BrowserContext,
  jobId: string,
  timeout = 30000
): Promise<void> {
  const backgroundPage = context.backgroundPages()[0];
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const storage = await getExtensionStorage(context);
    const processedJobs = (storage.processedJobs as string[]) || [];

    if (processedJobs.includes(jobId)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Extension did not process job ${jobId} within ${timeout}ms`);
}

/**
 * Enable extension logging
 */
export async function enableExtensionLogging(context: BrowserContext): Promise<void> {
  await setExtensionStorage(context, {
    debugMode: true,
    logLevel: 'debug',
  });
}

/**
 * Get extension logs
 */
export async function getExtensionLogs(context: BrowserContext): Promise<string[]> {
  const backgroundPage = context.backgroundPages()[0];

  return backgroundPage.evaluate(() => {
    return (window as any).extensionLogs || [];
  });
}

/**
 * Configure extension settings
 */
export async function configureExtension(
  context: BrowserContext,
  settings: {
    pollingInterval?: number;
    autoStart?: boolean;
    apiEndpoint?: string;
  }
): Promise<void> {
  await setExtensionStorage(context, {
    settings: {
      pollingInterval: settings.pollingInterval || 5000,
      autoStart: settings.autoStart !== false,
      apiEndpoint: settings.apiEndpoint || 'http://localhost:3000',
    },
  });
}

/**
 * Check if extension is polling
 */
export async function isExtensionPolling(context: BrowserContext): Promise<boolean> {
  const storage = await getExtensionStorage(context);
  return (storage.isPolling as boolean) || false;
}

/**
 * Wait for content script to be ready
 */
export async function waitForContentScript(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      return (window as any).__FOODBOT_EXTENSION_LOADED__ === true;
    },
    { timeout }
  );
}

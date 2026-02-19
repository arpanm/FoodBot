import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

export interface SentryBrowserConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  debug?: boolean;
}

/**
 * Initialize Sentry for browser extensions
 */
export const initSentryBrowser = (config: SentryBrowserConfig): void => {
  const {
    dsn,
    environment = process.env.NODE_ENV || 'development',
    release = process.env.npm_package_version,
    tracesSampleRate = 0.1,
    debug = false,
  } = config;

  if (!dsn) {
    console.warn('Sentry DSN not provided. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    debug,
    integrations: [new BrowserTracing()],
    beforeSend: (event) => {
      // Filter out extension-specific errors that are expected
      const errorMessage = event.exception?.values?.[0]?.value || '';

      // Don't send chrome extension API errors in development
      if (
        environment === 'development' &&
        (errorMessage.includes('chrome') || errorMessage.includes('Extension'))
      ) {
        console.error('Extension Error (not sent in dev):', event);
        return null;
      }

      return event;
    },
  });
};

/**
 * Capture exception in browser extension
 */
export const captureExtensionException = (
  error: Error,
  context?: {
    user?: { id?: string; email?: string };
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void => {
  if (context?.user) {
    Sentry.setUser(context.user);
  }
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }
  if (context?.extra) {
    Sentry.setContext('extra', context.extra);
  }

  Sentry.captureException(error);
};

/**
 * Capture message in browser extension
 */
export const captureExtensionMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void => {
  if (context) {
    Sentry.setContext('extra', context);
  }

  Sentry.captureMessage(message, level);
};

// Re-export browser-specific Sentry functions
export { Sentry };

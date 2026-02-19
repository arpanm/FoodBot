import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export interface SentryReactConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  debug?: boolean;
}

/**
 * Initialize Sentry for React applications
 */
export const initSentryReact = (config: SentryReactConfig): void => {
  const {
    dsn,
    environment = process.env.NODE_ENV || 'development',
    release = process.env.npm_package_version,
    tracesSampleRate = 0.1,
    replaysSessionSampleRate = 0.1,
    replaysOnErrorSampleRate = 1.0,
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
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    beforeSend: (event) => {
      // Filter out known non-critical errors
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit')) {
        return null;
      }

      // Don't send errors from development
      if (environment === 'development') {
        console.error('Sentry Error (not sent in dev):', event);
        return null;
      }

      return event;
    },
  });
};

/**
 * React Error Boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Create React Router integration
 */
export const createReactRouterIntegration = (
  history: any
): Sentry.BrowserTracing => {
  return new BrowserTracing({
    routingInstrumentation: Sentry.reactRouterV6Instrumentation(
      React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes
    ),
  });
};

/**
 * React hooks for Sentry
 */
export const useSentry = () => {
  return {
    captureException: Sentry.captureException,
    captureMessage: Sentry.captureMessage,
    setUser: Sentry.setUser,
    setTag: Sentry.setTag,
    setContext: Sentry.setContext,
    addBreadcrumb: Sentry.addBreadcrumb,
  };
};

// Re-export React-specific Sentry functions
export { Sentry };

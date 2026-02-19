import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { CaptureContext } from '@sentry/types';

export interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
  attachStacktrace?: boolean;
  integrations?: Sentry.Integration[];
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
}

export interface SentryContext {
  user?: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
}

/**
 * Sentry error tracking and performance monitoring service
 * Provides centralized error tracking, performance monitoring, and user feedback
 */
export class SentryService {
  private initialized = false;

  constructor(config: SentryConfig) {
    this.initialize(config);
  }

  /**
   * Initialize Sentry
   */
  private initialize(config: SentryConfig): void {
    const {
      dsn,
      environment = process.env.NODE_ENV || 'development',
      release = process.env.npm_package_version,
      tracesSampleRate = 0.1,
      profilesSampleRate = 0.1,
      debug = false,
      attachStacktrace = true,
      integrations = [],
      beforeSend,
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
      profilesSampleRate,
      debug,
      attachStacktrace,
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
        ...integrations,
      ],
      beforeSend: (event, hint) => {
        // Filter out known non-critical errors
        const error = hint?.originalException;
        if (error instanceof Error) {
          // Don't send validation errors
          if (error.name === 'ValidationError') {
            return null;
          }
          // Don't send 404 errors
          if (error.message?.includes('Not Found')) {
            return null;
          }
        }

        // Apply custom beforeSend if provided
        if (beforeSend) {
          return beforeSend(event);
        }

        return event;
      },
    });

    this.initialized = true;
  }

  /**
   * Check if Sentry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture exception
   */
  captureException(error: Error | unknown, context?: SentryContext): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.captureException(error, this.buildCaptureContext(context));
  }

  /**
   * Capture message
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: SentryContext
  ): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.captureMessage(
      message,
      this.buildCaptureContext({ ...context, level })
    );
  }

  /**
   * Set user context
   */
  setUser(user: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  }): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set tags
   */
  setTags(tags: Record<string, string>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setTags(tags);
  }

  /**
   * Set context
   */
  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setContext(name, context);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Start transaction for performance monitoring
   */
  startTransaction(
    name: string,
    op: string,
    tags?: Record<string, string>
  ): Sentry.Transaction | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.startTransaction({ name, op, tags });
  }

  /**
   * Start span for performance monitoring
   */
  startSpan(transaction: Sentry.Transaction, op: string, description?: string): Sentry.Span {
    return transaction.startChild({ op, description });
  }

  /**
   * Wrap async function with error tracking
   */
  wrapAsync<T>(fn: () => Promise<T>, context?: SentryContext): Promise<T> {
    if (!this.initialized) {
      return fn();
    }

    return Sentry.withScope(async (scope) => {
      if (context?.user) {
        scope.setUser(context.user);
      }
      if (context?.tags) {
        scope.setTags(context.tags);
      }
      if (context?.extra) {
        scope.setExtras(context.extra);
      }
      if (context?.level) {
        scope.setLevel(context.level);
      }

      try {
        return await fn();
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  }

  /**
   * Build capture context from SentryContext
   */
  private buildCaptureContext(context?: SentryContext): CaptureContext {
    const captureContext: CaptureContext = {};

    if (context?.user) {
      captureContext.user = context.user;
    }
    if (context?.tags) {
      captureContext.tags = context.tags;
    }
    if (context?.extra) {
      captureContext.extra = context.extra;
    }
    if (context?.level) {
      captureContext.level = context.level;
    }

    return captureContext;
  }

  /**
   * Flush pending events (useful for serverless or before shutdown)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    return Sentry.close(timeout);
  }

  /**
   * Get Sentry hub
   */
  getHub(): typeof Sentry {
    return Sentry;
  }
}

/**
 * Create Sentry instance (exported for initialization)
 */
export const createSentryService = (config: SentryConfig): SentryService => {
  return new SentryService(config);
};

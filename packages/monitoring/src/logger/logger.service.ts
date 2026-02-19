import pino, { Logger as PinoLogger } from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  level?: string;
  pretty?: boolean;
  redactPaths?: string[];
  destination?: string;
}

/**
 * Production-grade structured logger using Pino
 * Features:
 * - Correlation ID tracking via AsyncLocalStorage
 * - User context tracking
 * - PII redaction
 * - JSON structured logging
 * - Performance optimized
 */
export class LoggerService {
  private logger: PinoLogger;
  private asyncLocalStorage = new AsyncLocalStorage<LogContext>();

  constructor(config: LoggerConfig = {}) {
    const {
      level = process.env.LOG_LEVEL || 'info',
      pretty = process.env.NODE_ENV === 'development',
      redactPaths = [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        'creditCard',
        'ssn',
      ],
      destination,
    } = config;

    this.logger = pino(
      {
        level,
        redact: {
          paths: redactPaths,
          censor: '[REDACTED]',
        },
        formatters: {
          level: (label) => {
            return { level: label.toUpperCase() };
          },
          bindings: (bindings) => {
            return {
              pid: bindings.pid,
              hostname: bindings.hostname,
              node_env: process.env.NODE_ENV,
            };
          },
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            path: req.path,
            parameters: req.parameters,
            headers: {
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
            },
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: {
              'content-type': res.getHeader('content-type'),
            },
          }),
          err: pino.stdSerializers.err,
        },
      },
      pretty
        ? pino.destination({
            sync: false,
            dest: destination || 1, // stdout
          })
        : pino.destination({
            sync: false,
            dest: destination || 1,
          })
    );
  }

  /**
   * Get current context from AsyncLocalStorage
   */
  private getContext(): LogContext {
    return this.asyncLocalStorage.getStore() || {};
  }

  /**
   * Merge context with additional fields
   */
  private mergeContext(context?: Partial<LogContext>): LogContext {
    return {
      ...this.getContext(),
      ...context,
    };
  }

  /**
   * Set correlation ID for current async context
   */
  setCorrelationId(correlationId: string): void {
    const context = this.getContext();
    this.asyncLocalStorage.enterWith({ ...context, correlationId });
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.getContext().correlationId;
  }

  /**
   * Set user ID for current async context
   */
  setUserId(userId: string): void {
    const context = this.getContext();
    this.asyncLocalStorage.enterWith({ ...context, userId });
  }

  /**
   * Get current user ID
   */
  getUserId(): string | undefined {
    return this.getContext().userId;
  }

  /**
   * Run code with correlation context
   */
  withCorrelation<T>(correlationId: string, fn: () => T): T {
    return this.asyncLocalStorage.run({ correlationId }, fn);
  }

  /**
   * Generate new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Partial<LogContext>): void {
    this.logger.debug(this.mergeContext(context), message);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Partial<LogContext>): void {
    this.logger.info(this.mergeContext(context), message);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Partial<LogContext>): void {
    this.logger.warn(this.mergeContext(context), message);
  }

  /**
   * Error level logging with error object
   */
  error(message: string, error?: Error | unknown, context?: Partial<LogContext>): void {
    const errorContext = error instanceof Error ? { err: error } : { error };
    this.logger.error({ ...this.mergeContext(context), ...errorContext }, message);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error | unknown, context?: Partial<LogContext>): void {
    const errorContext = error instanceof Error ? { err: error } : { error };
    this.logger.fatal({ ...this.mergeContext(context), ...errorContext }, message);
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): LoggerService {
    const childLogger = new LoggerService({
      level: this.logger.level,
    });
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Get underlying Pino logger instance
   */
  getPinoLogger(): PinoLogger {
    return this.logger;
  }

  /**
   * Flush logs (useful for testing)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush(() => resolve());
    });
  }
}

/**
 * Global logger instance
 */
export const logger = new LoggerService();

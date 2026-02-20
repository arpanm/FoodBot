/**
 * Logger Utility
 * Centralized logging for the mobile app
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = __DEV__;

  private formatLogEntry(entry: LogEntry): string {
    const {level, timestamp, message, context, error} = entry;

    let formatted = `[${level.toUpperCase()}] ${timestamp} - ${message}`;

    if (context) {
      formatted += `\nContext: ${JSON.stringify(context, null, 2)}`;
    }

    if (error) {
      formatted += `\nError: ${error.message}`;
      if (error.stack) {
        formatted += `\nStack: ${error.stack}`;
      }
    }

    return formatted;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;

    const entry: LogEntry = {
      level: 'debug',
      timestamp: new Date().toISOString(),
      message,
      context,
    };

    console.debug(this.formatLogEntry(entry));
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      context,
    };

    console.info(this.formatLogEntry(entry));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      context,
    };

    console.warn(this.formatLogEntry(entry));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error,
      context,
    };

    console.error(this.formatLogEntry(entry));

    // TODO: Send to error tracking service (Sentry, etc.)
  }
}

export const logger = new Logger();

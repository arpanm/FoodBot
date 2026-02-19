/**
 * Retry manager with exponential backoff for transient failures.
 */

import type { ProviderName } from '../types/common.types.js';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2.0,
  maxDelayMs: 5_000,
  retryableErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'NETWORK_ERROR',
    'TIMEOUT',
  ],
};

export class RetryManager {
  private readonly config: RetryConfig;
  private readonly providerName: ProviderName;

  constructor(providerName: ProviderName, config?: Partial<RetryConfig>) {
    this.providerName = providerName;
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic.
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt >= this.config.maxRetries) {
          break;
        }

        if (!this.isRetryable(lastError)) {
          throw lastError;
        }

        const delayMs = this.calculateDelay(attempt);
        await this.delay(delayMs);
      }
    }

    throw new RetryExhaustedError(
      this.providerName,
      this.config.maxRetries,
      lastError,
      context
    );
  }

  /**
   * Check if an error is retryable.
   */
  isRetryable(error: Error): boolean {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode && this.config.retryableErrors.includes(errorCode)) {
      return true;
    }

    // Check for HTTP status codes (in error message)
    const statusMatch = error.message.match(/status[:\s]*(\d{3})/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1] ?? '0', 10);
      return status >= 500 && status <= 599;
    }

    // Check error name
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    const jitter = delay * 0.1 * Math.random();
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class RetryExhaustedError extends Error {
  readonly provider: ProviderName;
  readonly attempts: number;
  readonly lastError: Error | undefined;

  constructor(
    provider: ProviderName,
    attempts: number,
    lastError: Error | undefined,
    context?: string
  ) {
    const contextStr = context ? ` (${context})` : '';
    super(
      `Retry exhausted for provider "${provider}"${contextStr} ` +
        `after ${attempts} attempts. Last error: ${lastError?.message ?? 'unknown'}`
    );
    this.name = 'RetryExhaustedError';
    this.provider = provider;
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

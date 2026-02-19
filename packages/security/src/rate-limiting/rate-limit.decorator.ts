import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../types';

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate Limit Decorator
 * Apply rate limiting to specific endpoints
 *
 * @example
 * @RateLimit({ windowMs: 60000, maxRequests: 10 })
 * @Post('login')
 * async login() {}
 */
export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

/**
 * Common rate limit presets
 */
export const RateLimitPresets = {
  /**
   * Strict: 5 requests per minute
   * Use for: Login, password reset, account creation
   */
  STRICT: { windowMs: 60 * 1000, maxRequests: 5 } as RateLimitConfig,

  /**
   * Standard: 100 requests per minute
   * Use for: General API endpoints
   */
  STANDARD: { windowMs: 60 * 1000, maxRequests: 100 } as RateLimitConfig,

  /**
   * Relaxed: 1000 requests per minute
   * Use for: Read-only endpoints
   */
  RELAXED: { windowMs: 60 * 1000, maxRequests: 1000 } as RateLimitConfig,

  /**
   * Per Hour: 1000 requests per hour
   * Use for: Resource-intensive operations
   */
  PER_HOUR: { windowMs: 60 * 60 * 1000, maxRequests: 1000 } as RateLimitConfig,

  /**
   * Per Day: 10000 requests per day
   * Use for: Daily quotas
   */
  PER_DAY: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 10000 } as RateLimitConfig,
};

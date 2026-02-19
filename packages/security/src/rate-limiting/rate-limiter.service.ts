import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimitConfig } from '../types';

/**
 * Rate Limiter Service
 * OWASP A05: Security Misconfiguration Protection
 *
 * Provides flexible rate limiting using Redis for distributed systems
 */
@Injectable()
export class RateLimiterService {
  private redis: Redis | null = null;
  private localCache = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.redis = null; // Fall back to local cache
      });
    }
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier (e.g., user ID, IP address)
   * @param config - Rate limit configuration
   * @returns Object with allowed status and remaining requests
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;

    if (this.redis) {
      return this.checkLimitRedis(key, windowMs, maxRequests);
    } else {
      return this.checkLimitLocal(key, windowMs, maxRequests, now);
    }
  }

  /**
   * Rate limiting using Redis (sliding window log)
   */
  private async checkLimitRedis(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.redis) {
      throw new Error('Redis not available');
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);

      // Count entries in current window
      pipeline.zcard(redisKey);

      // Add current request
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Pipeline execution failed');
      }

      const count = (results[1][1] as number) || 0;
      const remaining = Math.max(0, maxRequests - count - 1);
      const resetTime = now + windowMs;

      return {
        allowed: count < maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fall back to local cache
      return this.checkLimitLocal(key, windowMs, maxRequests, now);
    }
  }

  /**
   * Rate limiting using local memory (fixed window)
   */
  private checkLimitLocal(
    key: string,
    windowMs: number,
    maxRequests: number,
    now: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    let record = this.localCache.get(key);

    // Reset if window expired
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    record.count++;
    this.localCache.set(key, record);

    const remaining = Math.max(0, maxRequests - record.count);

    return {
      allowed: record.count <= maxRequests,
      remaining,
      resetTime: record.resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`ratelimit:${key}`);
    } else {
      this.localCache.delete(key);
    }
  }

  /**
   * Get current usage for a key
   */
  async getUsage(key: string, windowMs: number): Promise<number> {
    if (this.redis) {
      const now = Date.now();
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;

      try {
        const count = await this.redis.zcount(redisKey, windowStart, now);
        return count;
      } catch {
        return 0;
      }
    } else {
      const record = this.localCache.get(key);
      const now = Date.now();

      if (!record || now >= record.resetTime) {
        return 0;
      }

      return record.count;
    }
  }

  /**
   * Clean up expired entries (local cache only)
   */
  cleanupExpiredEntries(): void {
    if (this.redis) return; // Redis handles expiry automatically

    const now = Date.now();
    for (const [key, record] of this.localCache.entries()) {
      if (now >= record.resetTime) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

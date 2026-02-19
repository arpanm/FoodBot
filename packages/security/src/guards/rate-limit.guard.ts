import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from '../rate-limiting/rate-limiter.service';
import { RateLimitConfig } from '../types';
import { RATE_LIMIT_KEY } from '../rate-limiting/rate-limit.decorator';

/**
 * Rate Limit Guard
 * Enforces rate limiting on endpoints
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private rateLimiterService: RateLimiterService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rateLimitConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate rate limit key
    const key = this.getRateLimitKey(request, rateLimitConfig);

    // Check rate limit
    const result = await this.rateLimiterService.checkLimit(key, rateLimitConfig);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: rateLimitConfig.message || 'Too many requests',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getRateLimitKey(request: any, config: RateLimitConfig): string {
    // Use custom key generator if provided
    if (config.keyGenerator) {
      return config.keyGenerator(request);
    }

    // Default: use user ID if authenticated, otherwise IP address
    const userId = request.user?.sub;
    const ipAddress = request.ip || request.connection.remoteAddress;

    return userId ? `user:${userId}` : `ip:${ipAddress}`;
  }
}

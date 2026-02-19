import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Security Headers Interceptor
 * Adds security headers to all responses
 */
@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        // Add security headers
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('X-Frame-Options', 'DENY');
        response.setHeader('X-XSS-Protection', '1; mode=block');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // Remove server header
        response.removeHeader('X-Powered-By');
      })
    );
  }
}

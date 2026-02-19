import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Security Logging Interceptor
 * Logs security-relevant events
 */
@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = request.user?.sub || 'anonymous';
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      userId,
      method,
      url,
      ip,
      userAgent,
    };

    // Log request
    console.log('[Security] Request:', JSON.stringify(logEntry));

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          console.log('[Security] Response:', JSON.stringify({ ...logEntry, duration, status: 'success' }));
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          console.error('[Security] Error:', JSON.stringify({
            ...logEntry,
            duration,
            status: 'error',
            error: error.message,
          }));
        },
      })
    );
  }
}

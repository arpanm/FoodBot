/**
 * Logging Interceptor
 *
 * Logs all incoming requests and outgoing responses
 * Includes request ID tracking and performance metrics
 *
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate or retrieve request ID
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Log request
    if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
      this.logger.log({
        message: 'Incoming request',
        requestId,
        method,
        url,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          // Log response
          const logData = {
            message: 'Request completed',
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          };

          if (statusCode >= 500) {
            this.logger.error(logData);
          } else if (statusCode >= 400) {
            this.logger.warn(logData);
          } else if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
            this.logger.log(logData);
          }

          // Warn on slow requests
          if (duration > 1000) {
            this.logger.warn({
              message: 'Slow request detected',
              requestId,
              method,
              url,
              duration: `${duration}ms`,
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error({
            message: 'Request failed',
            requestId,
            method,
            url,
            duration: `${duration}ms`,
            error: error.message,
            stack: process.env.ENABLE_ERROR_STACK_TRACES === 'true' ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          });
        },
      })
    );
  }
}

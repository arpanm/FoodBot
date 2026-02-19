import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger';
import { MetricsService } from '../metrics';

/**
 * Middleware to log HTTP requests and collect metrics
 * Logs request start, end, and duration
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    // Log request start
    this.logger.info('HTTP Request Started', {
      method,
      url: originalUrl,
      ip,
      userAgent: req.headers['user-agent'],
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data): Response {
      res.send = originalSend;
      return res.send(data);
    };

    // Log when response finishes
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const { statusCode } = res;

      // Log request completion
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
      this.logger[logLevel]('HTTP Request Completed', {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration.toFixed(3)}s`,
        contentLength: res.getHeader('content-length'),
      });

      // Record metrics
      this.metrics.recordHttpRequest(method, originalUrl, statusCode, duration);

      // Record slow requests
      if (duration > 1) {
        this.logger.warn('Slow HTTP Request', {
          method,
          url: originalUrl,
          duration: `${duration.toFixed(3)}s`,
        });
      }

      // Record errors
      if (statusCode >= 500) {
        this.metrics.recordHttpError(method, originalUrl, 'server_error');
      } else if (statusCode >= 400) {
        this.metrics.recordHttpError(method, originalUrl, 'client_error');
      }
    });

    // Log errors
    res.on('error', (error: Error) => {
      this.logger.error('HTTP Request Error', error, {
        method,
        url: originalUrl,
      });
      this.metrics.recordHttpError(method, originalUrl, 'error');
    });

    next();
  }
}

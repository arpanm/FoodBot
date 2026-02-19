import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SentryService } from '../sentry';

/**
 * Middleware for performance monitoring with Sentry
 * Creates transactions and spans for request tracing
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  constructor(private readonly sentry: SentryService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.sentry.isInitialized()) {
      return next();
    }

    const { method, originalUrl } = req;

    // Start transaction for this request
    const transaction = this.sentry.startTransaction(
      `${method} ${originalUrl}`,
      'http.server',
      {
        'http.method': method,
        'http.url': originalUrl,
      }
    );

    // Store transaction in request for downstream use
    (req as any).sentryTransaction = transaction;

    // Add breadcrumb
    this.sentry.addBreadcrumb({
      category: 'http',
      message: `${method} ${originalUrl}`,
      level: 'info',
      data: {
        method,
        url: originalUrl,
      },
    });

    // Finish transaction when response completes
    res.on('finish', () => {
      if (transaction) {
        transaction.setHttpStatus(res.statusCode);
        transaction.finish();
      }
    });

    next();
  }
}

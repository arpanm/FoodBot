import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger';

/**
 * Middleware to add correlation IDs to requests
 * Enables request tracing across distributed systems
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Get correlation ID from header or generate new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      this.logger.generateCorrelationId();

    // Set correlation ID in logger context
    this.logger.setCorrelationId(correlationId);

    // Add to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Add to request object for downstream use
    (req as any).correlationId = correlationId;

    next();
  }
}

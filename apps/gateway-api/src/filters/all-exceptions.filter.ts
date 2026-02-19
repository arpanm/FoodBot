/**
 * All Exceptions Filter
 *
 * Global exception handler for production error responses
 *
 * @version 1.0.0
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = response.getHeader('X-Request-ID') as string;

    // Determine status code
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        process.env.NODE_ENV === 'production'
          ? this.getSafeErrorMessage(status)
          : message,
      requestId,
    };

    // Add error name in non-production
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error = error;
    }

    // Log the error
    this.logger.error({
      message: 'Exception caught',
      requestId,
      status,
      error,
      errorMessage: message,
      path: request.url,
      method: request.method,
      stack:
        process.env.ENABLE_ERROR_STACK_TRACES === 'true' && exception instanceof Error
          ? exception.stack
          : undefined,
    });

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Get safe error message for production
   * Prevents leaking sensitive information
   */
  private getSafeErrorMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Resource not found';
      case HttpStatus.REQUEST_TIMEOUT:
        return 'Request timeout';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too many requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal server error';
      case HttpStatus.BAD_GATEWAY:
        return 'Bad gateway';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service unavailable';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'Gateway timeout';
      default:
        return 'An error occurred';
    }
  }
}

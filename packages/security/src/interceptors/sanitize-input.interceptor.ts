import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SanitizerService } from '../validation/sanitizer.service';

/**
 * Sanitize Input Interceptor
 * Automatically sanitizes incoming request data
 */
@Injectable()
export class SanitizeInputInterceptor implements NestInterceptor {
  constructor(private sanitizerService: SanitizerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      request.query = this.sanitizeObject(request.query);
    }

    // Sanitize URL parameters
    if (request.params && typeof request.params === 'object') {
      request.params = this.sanitizeObject(request.params);
    }

    return next.handle();
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizerService.stripHtml(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }
}

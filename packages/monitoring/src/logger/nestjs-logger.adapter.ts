import { LoggerService as NestLoggerService } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Adapter to make LoggerService compatible with NestJS LoggerService interface
 */
export class NestJsLoggerAdapter implements NestLoggerService {
  constructor(private readonly loggerService: LoggerService) {}

  log(message: string, context?: string): void {
    this.loggerService.info(message, context ? { context } : undefined);
  }

  error(message: string, trace?: string, context?: string): void {
    this.loggerService.error(
      message,
      trace ? new Error(trace) : undefined,
      context ? { context } : undefined
    );
  }

  warn(message: string, context?: string): void {
    this.loggerService.warn(message, context ? { context } : undefined);
  }

  debug(message: string, context?: string): void {
    this.loggerService.debug(message, context ? { context } : undefined);
  }

  verbose(message: string, context?: string): void {
    this.loggerService.debug(message, context ? { context } : undefined);
  }
}

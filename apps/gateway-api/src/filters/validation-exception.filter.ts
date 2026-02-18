import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    let message: string;
    if (Array.isArray(exceptionResponse.message)) {
      message = exceptionResponse.message.join(', ');
    } else if (typeof exceptionResponse.message === 'string') {
      message = exceptionResponse.message;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else {
      message = 'Bad Request';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exceptionResponse.error || 'Bad Request',
    });
  }
}

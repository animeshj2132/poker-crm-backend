import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter for validation errors
 * Provides user-friendly error messages
 */
@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let error = 'Internal Server Error';

    // Handle known exception types
    if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = exception.message || 'Invalid request data';
    } else if (exception.status === HttpStatus.NOT_FOUND) {
      status = HttpStatus.NOT_FOUND;
      error = 'Not Found';
      message = exception.message || 'Resource not found';
    } else if (exception.status === HttpStatus.FORBIDDEN) {
      status = HttpStatus.FORBIDDEN;
      error = 'Forbidden';
      message = exception.message || 'Access denied';
    } else if (exception.status === HttpStatus.UNAUTHORIZED) {
      status = HttpStatus.UNAUTHORIZED;
      error = 'Unauthorized';
      message = exception.message || 'Authentication required';
    } else if (exception.status === HttpStatus.CONFLICT) {
      status = HttpStatus.CONFLICT;
      error = 'Conflict';
      message = exception.message || 'Resource conflict';
    } else if (exception.code === '23505') {
      // PostgreSQL unique constraint violation
      status = HttpStatus.CONFLICT;
      error = 'Conflict';
      message = 'A record with this information already exists';
    } else if (exception.code === '23503') {
      // PostgreSQL foreign key constraint violation
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'Referenced resource does not exist';
    } else if (exception.code === '42703') {
      // PostgreSQL undefined column
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Internal Server Error';
      message = 'Database schema error. Please contact support.';
    } else if (exception.message) {
      message = exception.message;
    }

    // Log error for debugging (in production, use proper logging)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('Unhandled exception:', {
        message: exception.message,
        stack: exception.stack,
        path: request.url,
        method: request.method,
        body: request.body,
        headers: request.headers
      });
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}
































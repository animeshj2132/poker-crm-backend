import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse() as
        | { message?: string | string[]; error?: string; statusCode?: number }
        | string;
      const message = typeof res === 'string' ? res : res.message ?? exception.message;
      return response.status(status).json({
        statusCode: status,
        error: typeof res === 'string' ? undefined : res?.error,
        message,
        path: request.url,
        timestamp: new Date().toISOString()
      });
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return response.status(status).json({
      statusCode: status,
      message: 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}




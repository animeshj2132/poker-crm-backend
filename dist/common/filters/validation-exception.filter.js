"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let ValidationExceptionFilter = class ValidationExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'An unexpected error occurred';
        let error = 'Internal Server Error';
        if (exception instanceof common_1.BadRequestException) {
            status = common_1.HttpStatus.BAD_REQUEST;
            error = 'Bad Request';
            message = exception.message || 'Invalid request data';
        }
        else if (exception.status === common_1.HttpStatus.NOT_FOUND) {
            status = common_1.HttpStatus.NOT_FOUND;
            error = 'Not Found';
            message = exception.message || 'Resource not found';
        }
        else if (exception.status === common_1.HttpStatus.FORBIDDEN) {
            status = common_1.HttpStatus.FORBIDDEN;
            error = 'Forbidden';
            message = exception.message || 'Access denied';
        }
        else if (exception.status === common_1.HttpStatus.UNAUTHORIZED) {
            status = common_1.HttpStatus.UNAUTHORIZED;
            error = 'Unauthorized';
            message = exception.message || 'Authentication required';
        }
        else if (exception.status === common_1.HttpStatus.CONFLICT) {
            status = common_1.HttpStatus.CONFLICT;
            error = 'Conflict';
            message = exception.message || 'Resource conflict';
        }
        else if (exception.code === '23505') {
            status = common_1.HttpStatus.CONFLICT;
            error = 'Conflict';
            message = 'A record with this information already exists';
        }
        else if (exception.code === '23503') {
            status = common_1.HttpStatus.BAD_REQUEST;
            error = 'Bad Request';
            message = 'Referenced resource does not exist';
        }
        else if (exception.code === '42703') {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            error = 'Internal Server Error';
            message = 'Database schema error. Please contact support.';
        }
        else if (exception.message) {
            message = exception.message;
        }
        if (status === common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
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
};
exports.ValidationExceptionFilter = ValidationExceptionFilter;
exports.ValidationExceptionFilter = ValidationExceptionFilter = __decorate([
    (0, common_1.Catch)()
], ValidationExceptionFilter);
//# sourceMappingURL=validation-exception.filter.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
class ValidationUtils {
    static validateEmail(email) {
        if (!email || typeof email !== 'string')
            return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }
    static validateUUID(uuid) {
        if (!uuid || typeof uuid !== 'string')
            return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    static sanitizeString(input, maxLength) {
        if (input === null || input === undefined)
            return null;
        if (typeof input !== 'string')
            return String(input).trim();
        const sanitized = input.trim();
        if (maxLength && sanitized.length > maxLength) {
            return sanitized.substring(0, maxLength);
        }
        return sanitized;
    }
    static validateName(name, minLength = 2, maxLength = 100) {
        if (!name || typeof name !== 'string') {
            throw new Error('Name is required and must be a string');
        }
        const sanitized = name.trim();
        if (sanitized.length < minLength) {
            throw new Error(`Name must be at least ${minLength} characters long`);
        }
        if (sanitized.length > maxLength) {
            throw new Error(`Name cannot exceed ${maxLength} characters`);
        }
        if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
            throw new Error('Name contains invalid characters');
        }
        return sanitized;
    }
    static validateAmount(amount, min = 0, max) {
        if (amount === null || amount === undefined) {
            throw new Error('Amount is required');
        }
        const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        if (isNaN(num)) {
            throw new Error('Amount must be a valid number');
        }
        if (num < min) {
            throw new Error(`Amount must be at least ${min}`);
        }
        if (max !== undefined && num > max) {
            throw new Error(`Amount cannot exceed ${max}`);
        }
        return num;
    }
    static validatePhone(phone) {
        if (!phone || typeof phone !== 'string')
            return false;
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone.trim()) && phone.trim().length >= 10;
    }
    static validateURL(url) {
        if (!url || typeof url !== 'string')
            return false;
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    static validateDate(dateString) {
        if (!dateString || typeof dateString !== 'string')
            return null;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }
    static isEmpty(value) {
        if (value === null || value === undefined)
            return true;
        if (typeof value === 'string')
            return value.trim().length === 0;
        if (Array.isArray(value))
            return value.length === 0;
        if (typeof value === 'object')
            return Object.keys(value).length === 0;
        return false;
    }
    static validateEnum(value, enumObject, fieldName = 'Value') {
        if (!value || typeof value !== 'string') {
            throw new Error(`${fieldName} is required`);
        }
        const enumValues = Object.values(enumObject);
        if (!enumValues.includes(value)) {
            throw new Error(`Invalid ${fieldName}. Must be one of: ${enumValues.join(', ')}`);
        }
        return value;
    }
    static validatePagination(page, limit) {
        const pageNum = page && page > 0 ? Math.floor(page) : 1;
        const limitNum = limit && limit > 0 && limit <= 1000 ? Math.floor(limit) : 100;
        return { page: pageNum, limit: limitNum };
    }
    static validateEmployeeId(employeeId, maxLength = 50) {
        if (!employeeId)
            return null;
        const sanitized = this.sanitizeString(employeeId, maxLength);
        if (sanitized && sanitized.length > 0) {
            if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
                throw new Error('Employee ID can only contain letters, numbers, hyphens, and underscores');
            }
            return sanitized;
        }
        return null;
    }
}
exports.ValidationUtils = ValidationUtils;
//# sourceMappingURL=validation.utils.js.map
/**
 * Validation utilities for edge case handling
 */

export class ValidationUtils {
  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: any, maxLength?: number): string | null {
    if (input === null || input === undefined) return null;
    if (typeof input !== 'string') return String(input).trim();
    const sanitized = input.trim();
    if (maxLength && sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength);
    }
    return sanitized;
  }

  /**
   * Validate and sanitize name
   */
  static validateName(name: any, minLength = 2, maxLength = 100): string {
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
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
      throw new Error('Name contains invalid characters');
    }
    return sanitized;
  }

  /**
   * Validate amount (positive number)
   */
  static validateAmount(amount: any, min = 0, max?: number): number {
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

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    // Allow various phone formats
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone.trim()) && phone.trim().length >= 10;
  }

  /**
   * Validate URL
   */
  static validateURL(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate date string
   */
  static validateDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Check if value is empty
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Validate enum value
   */
  static validateEnum<T extends string>(
    value: any,
    enumObject: Record<string, T>,
    fieldName = 'Value'
  ): T {
    if (!value || typeof value !== 'string') {
      throw new Error(`${fieldName} is required`);
    }
    const enumValues = Object.values(enumObject);
    if (!enumValues.includes(value as T)) {
      throw new Error(`Invalid ${fieldName}. Must be one of: ${enumValues.join(', ')}`);
    }
    return value as T;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const pageNum = page && page > 0 ? Math.floor(page) : 1;
    const limitNum = limit && limit > 0 && limit <= 1000 ? Math.floor(limit) : 100;
    return { page: pageNum, limit: limitNum };
  }

  /**
   * Validate and sanitize employee ID
   */
  static validateEmployeeId(employeeId: any, maxLength = 50): string | null {
    if (!employeeId) return null;
    const sanitized = this.sanitizeString(employeeId, maxLength);
    if (sanitized && sanitized.length > 0) {
      // Allow alphanumeric, hyphens, underscores
      if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
        throw new Error('Employee ID can only contain letters, numbers, hyphens, and underscores');
      }
      return sanitized;
    }
    return null;
  }
}




























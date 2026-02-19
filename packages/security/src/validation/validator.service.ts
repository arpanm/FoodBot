import { Injectable } from '@nestjs/common';
import { ValidationResult } from '../types';

/**
 * Validator Service
 * OWASP A03: Injection Protection
 * OWASP A04: Insecure Design Protection
 *
 * Provides comprehensive input validation
 */
@Injectable()
export class ValidatorService {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (international format)
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Validate UUID v4
   */
  isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate date format (ISO 8601)
   */
  isValidIsoDate(date: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!isoDateRegex.test(date)) return false;

    const timestamp = Date.parse(date);
    return !isNaN(timestamp);
  }

  /**
   * Validate credit card number (Luhn algorithm)
   */
  isValidCreditCard(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (!/^\d{13,19}$/.test(cleaned)) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate IP address (v4 and v6)
   */
  isValidIpAddress(ip: string): boolean {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Validate JWT token format (doesn't verify signature)
   */
  isValidJwtFormat(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const base64Regex = /^[A-Za-z0-9_-]+$/;
    return parts.every((part) => base64Regex.test(part));
  }

  /**
   * Validate file extension against whitelist
   */
  isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedExtensions.includes(extension) : false;
  }

  /**
   * Validate file size
   */
  isValidFileSize(sizeInBytes: number, maxSizeInMb: number): boolean {
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;
    return sizeInBytes > 0 && sizeInBytes <= maxSizeInBytes;
  }

  /**
   * Validate MIME type against whitelist
   */
  isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate alphanumeric string
   */
  isAlphanumeric(input: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(input);
  }

  /**
   * Validate numeric string
   */
  isNumeric(input: string): boolean {
    return /^\d+$/.test(input);
  }

  /**
   * Validate string length
   */
  isValidLength(input: string, min: number, max: number): boolean {
    return input.length >= min && input.length <= max;
  }

  /**
   * Validate no SQL injection patterns
   */
  containsSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bEXEC\b|\bEXECUTE\b)/i,
      /(--|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i,
    ];

    return sqlPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validate no XSS patterns
   */
  containsXss(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /eval\(/gi,
      /expression\(/gi,
    ];

    return xssPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validate no directory traversal patterns
   */
  containsDirectoryTraversal(input: string): boolean {
    const traversalPatterns = [/\.\./g, /\\/g, /\/\.\//g, /\/\/+/g];

    return traversalPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Comprehensive input validation
   */
  validateInput(input: string, rules: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
    allowSql?: boolean;
    allowHtml?: boolean;
    pattern?: RegExp;
  }): ValidationResult {
    const errors: string[] = [];

    // Length validation
    if (rules.minLength && input.length < rules.minLength) {
      errors.push(`Input must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Input must not exceed ${rules.maxLength} characters`);
    }

    // SQL injection check
    if (!rules.allowSql && this.containsSqlInjection(input)) {
      errors.push('Input contains potentially malicious SQL patterns');
    }

    // XSS check
    if (!rules.allowHtml && this.containsXss(input)) {
      errors.push('Input contains potentially malicious HTML/JavaScript');
    }

    // Custom pattern
    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push('Input does not match required pattern');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate object against schema
   */
  validateObject(obj: any, schema: Record<string, {
    type: string;
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
  }>): ValidationResult {
    const errors: string[] = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];

      // Required check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${key} is required`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type check
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
        continue;
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.min && value.length < rules.min) {
          errors.push(`${key} must be at least ${rules.min} characters`);
        }
        if (rules.max && value.length > rules.max) {
          errors.push(`${key} must not exceed ${rules.max} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${key} does not match required pattern`);
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key} must not exceed ${rules.max}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

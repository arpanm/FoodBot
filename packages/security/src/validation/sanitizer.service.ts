import { Injectable } from '@nestjs/common';

/**
 * Sanitizer Service
 * OWASP A03: Injection Protection
 *
 * Provides input sanitization to prevent XSS, SQL injection, and other injection attacks
 */
@Injectable()
export class SanitizerService {
  /**
   * Sanitize HTML input to prevent XSS
   * Removes potentially dangerous HTML tags and attributes
   */
  sanitizeHtml(input: string, allowedTags: string[] = []): string {
    if (!input) return '';

    // Remove script tags and their content
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    // If no tags are allowed, strip all HTML
    if (allowedTags.length === 0) {
      sanitized = this.stripHtml(sanitized);
    } else {
      // Remove all tags except allowed ones
      const allowedTagsRegex = new RegExp(
        `<(?!\/?(${allowedTags.join('|')})\s*\/?>)[^>]+>`,
        'gi'
      );
      sanitized = sanitized.replace(allowedTagsRegex, '');
    }

    return sanitized.trim();
  }

  /**
   * Strip all HTML tags
   */
  stripHtml(input: string): string {
    if (!input) return '';
    return input.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Sanitize SQL input (use with parameterized queries)
   * This is a backup measure; always use parameterized queries
   */
  sanitizeSql(input: string): string {
    if (!input) return '';

    // Remove SQL comment sequences
    let sanitized = input.replace(/--/g, '');
    sanitized = sanitized.replace(/\/\*/g, '');
    sanitized = sanitized.replace(/\*\//g, '');

    // Remove common SQL injection patterns
    sanitized = sanitized.replace(/;\s*DROP/gi, '');
    sanitized = sanitized.replace(/;\s*DELETE/gi, '');
    sanitized = sanitized.replace(/;\s*UPDATE/gi, '');
    sanitized = sanitized.replace(/;\s*INSERT/gi, '');
    sanitized = sanitized.replace(/UNION\s+SELECT/gi, '');
    sanitized = sanitized.replace(/EXEC\s*\(/gi, '');

    return sanitized.trim();
  }

  /**
   * Sanitize URL to prevent open redirect vulnerabilities
   */
  sanitizeUrl(url: string): string | null {
    if (!url) return null;

    try {
      const urlObj = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }

      // Prevent javascript: protocol
      if (urlObj.protocol === 'javascript:') {
        return null;
      }

      return urlObj.toString();
    } catch {
      // Invalid URL
      return null;
    }
  }

  /**
   * Sanitize file path to prevent directory traversal
   */
  sanitizeFilePath(path: string): string {
    if (!path) return '';

    // Remove directory traversal patterns
    let sanitized = path.replace(/\.\./g, '');
    sanitized = sanitized.replace(/\\/g, '/');

    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized.trim();
  }

  /**
   * Sanitize email address
   */
  sanitizeEmail(email: string): string {
    if (!email) return '';

    // Convert to lowercase and trim
    let sanitized = email.toLowerCase().trim();

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"]/g, '');

    return sanitized;
  }

  /**
   * Sanitize phone number (remove non-numeric characters)
   */
  sanitizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // Keep only digits, +, and spaces
    return phone.replace(/[^\d+\s-()]/g, '').trim();
  }

  /**
   * Sanitize JSON input
   */
  sanitizeJson(input: string): any {
    try {
      const parsed = JSON.parse(input);
      return this.sanitizeObject(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.stripHtml(obj);
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

  /**
   * Escape special characters for HTML context
   */
  escapeHtml(input: string): string {
    if (!input) return '';

    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }

  /**
   * Validate and sanitize base64 input
   */
  sanitizeBase64(input: string): string | null {
    if (!input) return null;

    // Remove whitespace
    const cleaned = input.replace(/\s/g, '');

    // Check if valid base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  /**
   * Remove control characters
   */
  removeControlCharacters(input: string): string {
    if (!input) return '';

    // Remove all control characters except newline and tab
    return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Sanitize MongoDB operator injection
   */
  sanitizeMongoOperators(input: any): any {
    if (typeof input === 'string') {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeMongoOperators(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const key in input) {
        // Remove keys starting with $ (MongoDB operators)
        if (!key.startsWith('$')) {
          sanitized[key] = this.sanitizeMongoOperators(input[key]);
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate and sanitize UUID
   */
  sanitizeUuid(uuid: string): string | null {
    if (!uuid) return null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleaned = uuid.trim().toLowerCase();

    return uuidRegex.test(cleaned) ? cleaned : null;
  }
}

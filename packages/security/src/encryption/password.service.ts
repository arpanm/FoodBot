import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { PasswordPolicy, ValidationResult } from '../types';

/**
 * Password Service
 * OWASP A07: Identification and Authentication Failures Protection
 *
 * Provides secure password hashing, validation, and policy enforcement
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds = 12; // Recommended by OWASP
  private readonly commonPasswords = new Set([
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
  ]);

  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
    preventReuse: 5,
  };

  /**
   * Hash password using bcrypt with salt
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify password against hash
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate password against policy
   * @param password - Password to validate
   * @param policy - Optional custom policy
   * @returns Validation result with errors
   */
  validatePassword(password: string, policy: Partial<PasswordPolicy> = {}): ValidationResult {
    const activePolicy = { ...this.defaultPolicy, ...policy };
    const errors: string[] = [];

    // Length checks
    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`);
    }

    if (password.length > activePolicy.maxLength) {
      errors.push(`Password must not exceed ${activePolicy.maxLength} characters`);
    }

    // Character requirements
    if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (activePolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (activePolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common password check
    if (activePolicy.preventCommon && this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a more unique password');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password is in common passwords list
   */
  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password.toLowerCase());
  }

  /**
   * Generate a strong random password
   * @param length - Password length (default: 16)
   * @returns Random password meeting policy requirements
   */
  generatePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check password strength (0-5)
   * 0: Very Weak, 1: Weak, 2: Fair, 3: Good, 4: Strong, 5: Very Strong
   */
  calculatePasswordStrength(password: string): number {
    let strength = 0;

    // Length
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;

    // Character variety
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    // Patterns (reduce strength)
    if (/(.)\1{2,}/.test(password)) strength--; // Repeated characters
    if (/012|123|234|345|456|567|678|789/.test(password)) strength--; // Sequential numbers
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) strength--; // Sequential letters

    // Clamp between 0 and 5
    return Math.max(0, Math.min(5, strength));
  }

  /**
   * Check if password has been used before
   * @param password - Password to check
   * @param previousHashes - Array of previous password hashes
   * @returns True if password was used before
   */
  async isPasswordReused(password: string, previousHashes: string[]): Promise<boolean> {
    for (const hash of previousHashes) {
      if (await this.verifyPassword(password, hash)) {
        return true;
      }
    }
    return false;
  }
}

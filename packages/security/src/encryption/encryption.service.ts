import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { EncryptedData } from '../types';

/**
 * Encryption Service
 * OWASP A02: Cryptographic Failures Protection
 *
 * Provides AES-256-GCM encryption for sensitive data at rest
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits

  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Key should be 64 hex characters (32 bytes)
    if (key.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
    }

    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * Encrypt sensitive text data
   * @param plaintext - Text to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedText: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt encrypted data
   * @param encryptedData - Data to decrypt
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encryptedData.encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash data using SHA-256 (one-way)
   * Use for non-reversible hashing like API keys
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a cryptographically secure random token
   * @param length - Token length in bytes (default: 32)
   * @returns Hex-encoded random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate encryption key for new environments
   * Call this once during setup, store in secure vault
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  secureCompare(a: string, b: string): boolean {
    try {
      const bufferA = Buffer.from(a, 'utf8');
      const bufferB = Buffer.from(b, 'utf8');

      if (bufferA.length !== bufferB.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufferA, bufferB);
    } catch {
      return false;
    }
  }
}

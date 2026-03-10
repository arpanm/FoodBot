/**
 * Token Encryptor with AES-256-GCM and key rotation support.
 *
 * Features:
 * - AES-256-GCM encryption with unique IV per operation
 * - Authentication tag for integrity verification
 * - Versioned encryption keys for seamless rotation
 * - Format: version:iv:authTag:ciphertext (all hex-encoded)
 */

import * as crypto from 'crypto';
import type { VersionedEncryptionKey, EncryptedTokenPayload } from './auth.types.js';
import { EncryptionError, TokenDecryptionError } from './auth.errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SEPARATOR = ':';

export interface TokenEncryptorConfig {
  /** Primary encryption key (hex string, 64 chars) */
  primaryKeyHex: string;
  /** Primary key version number */
  primaryKeyVersion: number;
  /** Previous keys for decryption during rotation (hex string, 64 chars each) */
  previousKeys?: Array<{ keyHex: string; version: number }>;
}

export class TokenEncryptor {
  private readonly primaryKey: VersionedEncryptionKey;
  private readonly keyMap: Map<number, Buffer>;

  constructor(config: TokenEncryptorConfig) {
    this.primaryKey = {
      key: this.parseKey(config.primaryKeyHex),
      version: config.primaryKeyVersion,
    };

    this.keyMap = new Map<number, Buffer>();
    this.keyMap.set(this.primaryKey.version, this.primaryKey.key);

    if (config.previousKeys) {
      for (const prev of config.previousKeys) {
        const parsedKey = this.parseKey(prev.keyHex);
        this.keyMap.set(prev.version, parsedKey);
      }
    }
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   * Returns format: version:iv:authTag:ciphertext
   * Each encryption uses a unique random IV.
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.primaryKey.key, iv);

      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const payload: EncryptedTokenPayload = {
        version: this.primaryKey.version,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        ciphertext,
      };

      return [
        payload.version.toString(),
        payload.iv,
        payload.authTag,
        payload.ciphertext,
      ].join(SEPARATOR);
    } catch (error) {
      throw new EncryptionError(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { operation: 'encrypt' }
      );
    }
  }

  /**
   * Decrypt an encrypted string.
   * Supports decryption with any known key version for rotation.
   */
  decrypt(encrypted: string): string {
    try {
      const payload = this.parseEncryptedPayload(encrypted);
      const key = this.keyMap.get(payload.version);

      if (!key) {
        throw new TokenDecryptionError({
          reason: 'unknown_key_version',
          version: payload.version,
        });
      }

      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      if (error instanceof TokenDecryptionError) {
        throw error;
      }
      throw new TokenDecryptionError({
        reason: 'decryption_failed',
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Re-encrypt data with the current primary key.
   * Used during key rotation to migrate tokens.
   */
  reEncrypt(encrypted: string): string {
    const payload = this.parseEncryptedPayload(encrypted);

    // Already encrypted with current key
    if (payload.version === this.primaryKey.version) {
      return encrypted;
    }

    const plaintext = this.decrypt(encrypted);
    return this.encrypt(plaintext);
  }

  /**
   * Check if an encrypted payload needs re-encryption (old key version).
   */
  needsReEncryption(encrypted: string): boolean {
    const payload = this.parseEncryptedPayload(encrypted);
    return payload.version !== this.primaryKey.version;
  }

  /**
   * Get the current primary key version.
   */
  getCurrentKeyVersion(): number {
    return this.primaryKey.version;
  }

  /**
   * Parse and validate an encryption key from hex string.
   */
  private parseKey(keyHex: string): Buffer {
    if (keyHex.length !== KEY_LENGTH * 2) {
      throw new EncryptionError(
        `Encryption key must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes), got ${keyHex.length}`,
        { operation: 'parseKey' }
      );
    }

    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== KEY_LENGTH) {
      throw new EncryptionError(
        'Invalid hex encoding in encryption key.',
        { operation: 'parseKey' }
      );
    }

    return key;
  }

  /**
   * Parse the encrypted payload string into its components.
   */
  private parseEncryptedPayload(encrypted: string): EncryptedTokenPayload {
    const parts = encrypted.split(SEPARATOR);
    if (parts.length !== 4) {
      throw new TokenDecryptionError({
        reason: 'invalid_format',
        expectedParts: 4,
        actualParts: parts.length,
      });
    }

    const versionStr = parts[0];
    const iv = parts[1];
    const authTag = parts[2];
    const ciphertext = parts[3];

    if (!versionStr || !iv || !authTag || !ciphertext) {
      throw new TokenDecryptionError({
        reason: 'missing_payload_parts',
      });
    }

    const version = parseInt(versionStr, 10);
    if (isNaN(version)) {
      throw new TokenDecryptionError({
        reason: 'invalid_version',
        versionStr,
      });
    }

    return { version, iv, authTag, ciphertext };
  }
}

/**
 * Generate a random AES-256 encryption key.
 * Use this utility during setup to create new keys.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

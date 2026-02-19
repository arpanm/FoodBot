/**
 * AES-256-GCM encryption for platform tokens stored in Redis.
 * Ensures session tokens are encrypted at rest.
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export class TokenEncryption {
  private readonly key: Buffer;

  constructor(encryptionKey?: string) {
    const keySource =
      encryptionKey ?? process.env['TOKEN_ENCRYPTION_KEY'] ?? '';
    if (!keySource) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY environment variable is required for token encryption.'
      );
    }
    this.key = this.deriveKey(keySource);
  }

  /**
   * Encrypt a plaintext string.
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: encrypted,
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Decrypt an encrypted string.
   */
  decrypt(encryptedBase64: string): string {
    const payloadJson = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const payload: EncryptedPayload = JSON.parse(payloadJson) as EncryptedPayload;

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private deriveKey(source: string): Buffer {
    if (source.length === KEY_LENGTH * 2) {
      return Buffer.from(source, 'hex');
    }
    return crypto.scryptSync(source, 'foodbot-mcp-adapter-salt', KEY_LENGTH);
  }
}

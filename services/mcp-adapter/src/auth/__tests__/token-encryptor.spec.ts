/**
 * Unit tests for TokenEncryptor.
 * Tests encryption, decryption, unique IVs, tamper detection, and key rotation.
 */

import * as crypto from 'crypto';
import { TokenEncryptor, generateEncryptionKey } from '../token-encryptor';
import { TokenDecryptionError, EncryptionError } from '../auth.errors';

function createTestKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

describe('TokenEncryptor', () => {
  let encryptor: TokenEncryptor;
  let testKeyHex: string;

  beforeEach(() => {
    testKeyHex = createTestKey();
    encryptor = new TokenEncryptor({
      primaryKeyHex: testKeyHex,
      primaryKeyVersion: 1,
    });
  });

  describe('constructor', () => {
    it('should create with valid 64-char hex key', () => {
      const enc = new TokenEncryptor({
        primaryKeyHex: testKeyHex,
        primaryKeyVersion: 1,
      });
      expect(enc).toBeInstanceOf(TokenEncryptor);
    });

    it('should throw EncryptionError for key that is too short', () => {
      expect(
        () =>
          new TokenEncryptor({
            primaryKeyHex: 'abcd1234',
            primaryKeyVersion: 1,
          })
      ).toThrow(EncryptionError);
    });

    it('should throw EncryptionError for key that is too long', () => {
      expect(
        () =>
          new TokenEncryptor({
            primaryKeyHex: testKeyHex + 'aa',
            primaryKeyVersion: 1,
          })
      ).toThrow(EncryptionError);
    });

    it('should accept previous keys for rotation', () => {
      const prevKey = createTestKey();
      const enc = new TokenEncryptor({
        primaryKeyHex: testKeyHex,
        primaryKeyVersion: 2,
        previousKeys: [{ keyHex: prevKey, version: 1 }],
      });
      expect(enc).toBeInstanceOf(TokenEncryptor);
    });
  });

  describe('encrypt', () => {
    it('should encrypt a plaintext string', () => {
      const encrypted = encryptor.encrypt('hello world');
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce format version:iv:authTag:ciphertext', () => {
      const encrypted = encryptor.encrypt('test data');
      const parts = encrypted.split(':');
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('1'); // version
      expect(parts[1]!.length).toBe(32); // IV is 16 bytes = 32 hex chars
      expect(parts[2]!.length).toBe(32); // auth tag is 16 bytes = 32 hex chars
      expect(parts[3]!.length).toBeGreaterThan(0); // ciphertext
    });

    it('should generate unique IVs for each encryption', () => {
      const encrypted1 = encryptor.encrypt('same data');
      const encrypted2 = encryptor.encrypt('same data');

      const iv1 = encrypted1.split(':')[1];
      const iv2 = encrypted2.split(':')[1];

      expect(iv1).not.toBe(iv2);
    });

    it('should produce different ciphertexts for same plaintext (due to unique IV)', () => {
      const encrypted1 = encryptor.encrypt('same data');
      const encrypted2 = encryptor.encrypt('same data');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', () => {
      const encrypted = encryptor.encrypt('');
      expect(typeof encrypted).toBe('string');
      const parts = encrypted.split(':');
      expect(parts.length).toBe(4);
    });

    it('should encrypt unicode text', () => {
      const encrypted = encryptor.encrypt('Hello \u{1F600} World \u6D4B\u8BD5');
      const decrypted = encryptor.decrypt(encrypted);
      expect(decrypted).toBe('Hello \u{1F600} World \u6D4B\u8BD5');
    });

    it('should encrypt long text', () => {
      const longText = 'a'.repeat(10000);
      const encrypted = encryptor.encrypt(longText);
      const decrypted = encryptor.decrypt(encrypted);
      expect(decrypted).toBe(longText);
    });

    it('should encrypt JSON strings', () => {
      const jsonData = JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-456',
        expiresAt: 1700000000000,
      });

      const encrypted = encryptor.encrypt(jsonData);
      const decrypted = encryptor.decrypt(encrypted);
      expect(decrypted).toBe(jsonData);
    });

    it('should include key version in encrypted output', () => {
      const enc2 = new TokenEncryptor({
        primaryKeyHex: testKeyHex,
        primaryKeyVersion: 42,
      });
      const encrypted = enc2.encrypt('test');
      expect(encrypted.startsWith('42:')).toBe(true);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const plaintext = 'secret token data';
      const encrypted = encryptor.encrypt(plaintext);
      const decrypted = encryptor.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw TokenDecryptionError for invalid format', () => {
      expect(() => encryptor.decrypt('not:valid')).toThrow(TokenDecryptionError);
    });

    it('should throw TokenDecryptionError for empty string', () => {
      expect(() => encryptor.decrypt('')).toThrow(TokenDecryptionError);
    });

    it('should throw TokenDecryptionError for tampered ciphertext', () => {
      const encrypted = encryptor.encrypt('original');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[3] = 'ff'.repeat(16);
      const tampered = parts.join(':');

      expect(() => encryptor.decrypt(tampered)).toThrow(TokenDecryptionError);
    });

    it('should throw TokenDecryptionError for tampered IV', () => {
      const encrypted = encryptor.encrypt('original');
      const parts = encrypted.split(':');
      // Tamper with IV
      parts[1] = 'aa'.repeat(16);
      const tampered = parts.join(':');

      expect(() => encryptor.decrypt(tampered)).toThrow(TokenDecryptionError);
    });

    it('should throw TokenDecryptionError for tampered auth tag', () => {
      const encrypted = encryptor.encrypt('original');
      const parts = encrypted.split(':');
      // Tamper with auth tag
      parts[2] = 'bb'.repeat(16);
      const tampered = parts.join(':');

      expect(() => encryptor.decrypt(tampered)).toThrow(TokenDecryptionError);
    });

    it('should throw TokenDecryptionError for unknown key version', () => {
      const encrypted = encryptor.encrypt('test');
      const parts = encrypted.split(':');
      parts[0] = '999'; // Unknown version
      const modified = parts.join(':');

      expect(() => encryptor.decrypt(modified)).toThrow(TokenDecryptionError);
    });

    it('should throw TokenDecryptionError for non-numeric version', () => {
      const encrypted = encryptor.encrypt('test');
      const parts = encrypted.split(':');
      parts[0] = 'abc';
      const modified = parts.join(':');

      expect(() => encryptor.decrypt(modified)).toThrow(TokenDecryptionError);
    });
  });

  describe('key rotation', () => {
    it('should decrypt data encrypted with previous key version', () => {
      const oldKey = createTestKey();
      const newKey = createTestKey();

      // Encrypt with old key
      const oldEncryptor = new TokenEncryptor({
        primaryKeyHex: oldKey,
        primaryKeyVersion: 1,
      });
      const encrypted = oldEncryptor.encrypt('secret data');

      // Create new encryptor with new primary key but old key still available
      const newEncryptor = new TokenEncryptor({
        primaryKeyHex: newKey,
        primaryKeyVersion: 2,
        previousKeys: [{ keyHex: oldKey, version: 1 }],
      });

      const decrypted = newEncryptor.decrypt(encrypted);
      expect(decrypted).toBe('secret data');
    });

    it('should encrypt new data with new key version', () => {
      const oldKey = createTestKey();
      const newKey = createTestKey();

      const newEncryptor = new TokenEncryptor({
        primaryKeyHex: newKey,
        primaryKeyVersion: 2,
        previousKeys: [{ keyHex: oldKey, version: 1 }],
      });

      const encrypted = newEncryptor.encrypt('new data');
      expect(encrypted.startsWith('2:')).toBe(true);
    });

    it('should support multiple previous key versions', () => {
      const key1 = createTestKey();
      const key2 = createTestKey();
      const key3 = createTestKey();

      // Encrypt with key version 1
      const enc1 = new TokenEncryptor({ primaryKeyHex: key1, primaryKeyVersion: 1 });
      const encrypted1 = enc1.encrypt('data v1');

      // Encrypt with key version 2
      const enc2 = new TokenEncryptor({ primaryKeyHex: key2, primaryKeyVersion: 2 });
      const encrypted2 = enc2.encrypt('data v2');

      // Current encryptor knows all keys
      const current = new TokenEncryptor({
        primaryKeyHex: key3,
        primaryKeyVersion: 3,
        previousKeys: [
          { keyHex: key1, version: 1 },
          { keyHex: key2, version: 2 },
        ],
      });

      expect(current.decrypt(encrypted1)).toBe('data v1');
      expect(current.decrypt(encrypted2)).toBe('data v2');
    });
  });

  describe('reEncrypt', () => {
    it('should re-encrypt data from old key to current key', () => {
      const oldKey = createTestKey();
      const newKey = createTestKey();

      const oldEncryptor = new TokenEncryptor({
        primaryKeyHex: oldKey,
        primaryKeyVersion: 1,
      });
      const encrypted = oldEncryptor.encrypt('migrate me');

      const newEncryptor = new TokenEncryptor({
        primaryKeyHex: newKey,
        primaryKeyVersion: 2,
        previousKeys: [{ keyHex: oldKey, version: 1 }],
      });

      const reEncrypted = newEncryptor.reEncrypt(encrypted);
      expect(reEncrypted.startsWith('2:')).toBe(true);

      const decrypted = newEncryptor.decrypt(reEncrypted);
      expect(decrypted).toBe('migrate me');
    });

    it('should return same string if already encrypted with current key', () => {
      const encrypted = encryptor.encrypt('already current');
      const reEncrypted = encryptor.reEncrypt(encrypted);
      expect(reEncrypted).toBe(encrypted);
    });
  });

  describe('needsReEncryption', () => {
    it('should return false for current key version', () => {
      const encrypted = encryptor.encrypt('test');
      expect(encryptor.needsReEncryption(encrypted)).toBe(false);
    });

    it('should return true for old key version', () => {
      const oldKey = createTestKey();
      const newKey = createTestKey();

      const oldEncryptor = new TokenEncryptor({
        primaryKeyHex: oldKey,
        primaryKeyVersion: 1,
      });
      const encrypted = oldEncryptor.encrypt('old data');

      const newEncryptor = new TokenEncryptor({
        primaryKeyHex: newKey,
        primaryKeyVersion: 2,
        previousKeys: [{ keyHex: oldKey, version: 1 }],
      });

      expect(newEncryptor.needsReEncryption(encrypted)).toBe(true);
    });
  });

  describe('getCurrentKeyVersion', () => {
    it('should return the primary key version', () => {
      const enc = new TokenEncryptor({
        primaryKeyHex: testKeyHex,
        primaryKeyVersion: 5,
      });
      expect(enc.getCurrentKeyVersion()).toBe(5);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate keys that work with TokenEncryptor', () => {
      const key = generateEncryptionKey();
      const enc = new TokenEncryptor({
        primaryKeyHex: key,
        primaryKeyVersion: 1,
      });
      const encrypted = enc.encrypt('test');
      expect(enc.decrypt(encrypted)).toBe('test');
    });
  });
});

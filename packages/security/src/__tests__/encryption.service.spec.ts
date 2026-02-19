import { EncryptionService } from '../encryption/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeAll(() => {
    // Set test encryption key
    process.env.ENCRYPTION_KEY = EncryptionService.generateEncryptionKey();
  });

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text successfully', () => {
      const plaintext = 'Sensitive data 123!';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted.encryptedText).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different IV for each encryption', () => {
      const plaintext = 'Test data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedText).not.toBe(encrypted2.encryptedText);
    });

    it('should fail decryption with wrong auth tag', () => {
      const plaintext = 'Sensitive data';
      const encrypted = service.encrypt(plaintext);

      // Tamper with auth tag
      encrypted.authTag = 'tampered0123456789abcdef0123456789';

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should handle special characters', () => {
      const plaintext = 'Special: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Unicode: 你好世界 🔒 🛡️';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('hash', () => {
    it('should generate consistent hash', () => {
      const data = 'test-data';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const hash1 = service.hash('data1');
      const hash2 = service.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash', () => {
      const hash = service.hash('test');

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = service.generateSecureToken();

      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate token with custom length', () => {
      const token = service.generateSecureToken(16);

      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('secureCompare', () => {
    it('should return true for identical strings', () => {
      const result = service.secureCompare('secret123', 'secret123');

      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const result = service.secureCompare('secret123', 'secret456');

      expect(result).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      const result = service.secureCompare('short', 'longer string');

      expect(result).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate 64-character hex key', () => {
      const key = EncryptionService.generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = EncryptionService.generateEncryptionKey();
      const key2 = EncryptionService.generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});

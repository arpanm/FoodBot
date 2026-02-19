import { PasswordService } from '../encryption/password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);
      const isValid = await service.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);
      const isValid = await service.verifyPassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid password', () => {
      const result = service.validatePassword('ValidPass123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password too short', () => {
      const result = service.validatePassword('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = service.validatePassword('password123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = service.validatePassword('PASSWORD123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const result = service.validatePassword('PasswordTest!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const result = service.validatePassword('Password1234');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common password', () => {
      const result = service.validatePassword('password');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password is too common, please choose a more unique password'
      );
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should rate weak password as 0-2', () => {
      const strength = service.calculatePasswordStrength('pass');
      expect(strength).toBeLessThanOrEqual(2);
    });

    it('should rate medium password as 3', () => {
      const strength = service.calculatePasswordStrength('Password123');
      expect(strength).toBe(3);
    });

    it('should rate strong password as 4-5', () => {
      const strength = service.calculatePasswordStrength('StrongP@ssw0rd2024!');
      expect(strength).toBeGreaterThanOrEqual(4);
    });
  });

  describe('generatePassword', () => {
    it('should generate password with default length', () => {
      const password = service.generatePassword();

      expect(password).toHaveLength(16);
    });

    it('should generate password with custom length', () => {
      const password = service.generatePassword(24);

      expect(password).toHaveLength(24);
    });

    it('should generate password meeting policy requirements', () => {
      const password = service.generatePassword(16);
      const result = service.validatePassword(password);

      expect(result.isValid).toBe(true);
    });

    it('should generate different passwords', () => {
      const password1 = service.generatePassword();
      const password2 = service.generatePassword();

      expect(password1).not.toBe(password2);
    });
  });
});

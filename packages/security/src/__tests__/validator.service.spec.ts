import { ValidatorService } from '../validation/validator.service';

describe('ValidatorService', () => {
  let service: ValidatorService;

  beforeEach(() => {
    service = new ValidatorService();
  });

  describe('isValidEmail', () => {
    it('should accept valid email', () => {
      expect(service.isValidEmail('test@example.com')).toBe(true);
      expect(service.isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(service.isValidEmail('invalid')).toBe(false);
      expect(service.isValidEmail('invalid@')).toBe(false);
      expect(service.isValidEmail('@example.com')).toBe(false);
      expect(service.isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid HTTP URL', () => {
      expect(service.isValidUrl('http://example.com')).toBe(true);
    });

    it('should accept valid HTTPS URL', () => {
      expect(service.isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid protocol', () => {
      expect(service.isValidUrl('ftp://example.com')).toBe(false);
      expect(service.isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject malformed URL', () => {
      expect(service.isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('should accept valid UUID v4', () => {
      expect(service.isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(service.isValidUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // Not v4
      expect(service.isValidUuid('not-a-uuid')).toBe(false);
      expect(service.isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('isValidCreditCard', () => {
    it('should accept valid credit card (Luhn algorithm)', () => {
      expect(service.isValidCreditCard('4532015112830366')).toBe(true); // Visa
      expect(service.isValidCreditCard('5425233430109903')).toBe(true); // Mastercard
    });

    it('should reject invalid credit card', () => {
      expect(service.isValidCreditCard('1234567890123456')).toBe(false);
      expect(service.isValidCreditCard('123')).toBe(false);
    });

    it('should handle spaces', () => {
      expect(service.isValidCreditCard('4532 0151 1283 0366')).toBe(true);
    });
  });

  describe('isValidIpAddress', () => {
    it('should accept valid IPv4', () => {
      expect(service.isValidIpAddress('192.168.1.1')).toBe(true);
      expect(service.isValidIpAddress('10.0.0.1')).toBe(true);
    });

    it('should reject invalid IPv4', () => {
      expect(service.isValidIpAddress('256.1.1.1')).toBe(false);
      expect(service.isValidIpAddress('192.168.1')).toBe(false);
    });

    it('should accept valid IPv6', () => {
      expect(service.isValidIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });
  });

  describe('containsSqlInjection', () => {
    it('should detect SQL injection patterns', () => {
      expect(service.containsSqlInjection("' OR '1'='1")).toBe(true);
      expect(service.containsSqlInjection('UNION SELECT * FROM users')).toBe(true);
      expect(service.containsSqlInjection('DROP TABLE users')).toBe(true);
      expect(service.containsSqlInjection('-- comment')).toBe(true);
    });

    it('should not flag clean input', () => {
      expect(service.containsSqlInjection('John Doe')).toBe(false);
      expect(service.containsSqlInjection('test@example.com')).toBe(false);
    });
  });

  describe('containsXss', () => {
    it('should detect XSS patterns', () => {
      expect(service.containsXss('<script>alert(1)</script>')).toBe(true);
      expect(service.containsXss('javascript:alert(1)')).toBe(true);
      expect(service.containsXss('<img onerror="alert(1)">')).toBe(true);
      expect(service.containsXss('<iframe src="evil.com"></iframe>')).toBe(true);
    });

    it('should not flag clean input', () => {
      expect(service.containsXss('Hello World')).toBe(false);
      expect(service.containsXss('test@example.com')).toBe(false);
    });
  });

  describe('containsDirectoryTraversal', () => {
    it('should detect directory traversal patterns', () => {
      expect(service.containsDirectoryTraversal('../../../etc/passwd')).toBe(true);
      expect(service.containsDirectoryTraversal('..\\..\\windows\\system32')).toBe(true);
    });

    it('should not flag clean paths', () => {
      expect(service.containsDirectoryTraversal('documents/file.txt')).toBe(false);
      expect(service.containsDirectoryTraversal('folder/subfolder/file.pdf')).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should validate against multiple rules', () => {
      const result = service.validateInput('ValidInput123', {
        minLength: 5,
        maxLength: 20,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect length violations', () => {
      const result = service.validateInput('short', {
        minLength: 10,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('at least 10 characters');
    });

    it('should detect SQL injection in input', () => {
      const result = service.validateInput("' OR '1'='1", {
        allowSql: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('SQL');
    });

    it('should detect XSS in input', () => {
      const result = service.validateInput('<script>alert(1)</script>', {
        allowHtml: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('HTML/JavaScript');
    });
  });

  describe('validateObject', () => {
    it('should validate object against schema', () => {
      const obj = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const schema = {
        name: { type: 'string', required: true, min: 2, max: 50 },
        age: { type: 'number', required: true, min: 0, max: 120 },
        email: { type: 'string', required: true },
      };

      const result = service.validateObject(obj, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const obj = {
        name: 'John Doe',
      };

      const schema = {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
      };

      const result = service.validateObject(obj, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('email is required');
    });

    it('should detect type mismatches', () => {
      const obj = {
        age: '30', // Should be number
      };

      const schema = {
        age: { type: 'number', required: true },
      };

      const result = service.validateObject(obj, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be of type number');
    });

    it('should validate string length constraints', () => {
      const obj = {
        name: 'Jo',
      };

      const schema = {
        name: { type: 'string', required: true, min: 3, max: 50 },
      };

      const result = service.validateObject(obj, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('at least 3 characters');
    });
  });
});

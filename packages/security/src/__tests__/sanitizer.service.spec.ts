import { SanitizerService } from '../validation/sanitizer.service';

describe('SanitizerService', () => {
  let service: SanitizerService;

  beforeEach(() => {
    service = new SanitizerService();
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const result = service.sanitizeHtml(input);

      expect(result).toBe('Hello  World');
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="malicious()">Click</div>';
      const result = service.sanitizeHtml(input);

      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = service.sanitizeHtml(input);

      expect(result).not.toContain('javascript:');
    });

    it('should strip all HTML when no tags allowed', () => {
      const input = '<div><p>Text</p></div>';
      const result = service.sanitizeHtml(input);

      expect(result).toBe('Text');
    });

    it('should preserve allowed tags', () => {
      const input = '<div><p><b>Bold</b> text</p></div>';
      const result = service.sanitizeHtml(input, ['b']);

      expect(result).toContain('<b>');
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<p>');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URL', () => {
      const result = service.sanitizeUrl('http://example.com');

      expect(result).toBe('http://example.com/');
    });

    it('should accept valid HTTPS URL', () => {
      const result = service.sanitizeUrl('https://example.com');

      expect(result).toBe('https://example.com/');
    });

    it('should reject javascript: protocol', () => {
      const result = service.sanitizeUrl('javascript:alert(1)');

      expect(result).toBeNull();
    });

    it('should reject invalid URL', () => {
      const result = service.sanitizeUrl('not-a-url');

      expect(result).toBeNull();
    });

    it('should reject data: protocol', () => {
      const result = service.sanitizeUrl('data:text/html,<script>alert(1)</script>');

      expect(result).toBeNull();
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove directory traversal patterns', () => {
      const input = '../../../etc/passwd';
      const result = service.sanitizeFilePath(input);

      expect(result).not.toContain('..');
      expect(result).toBe('etc/passwd');
    });

    it('should normalize backslashes', () => {
      const input = 'folder\\subfolder\\file.txt';
      const result = service.sanitizeFilePath(input);

      expect(result).toBe('folder/subfolder/file.txt');
    });

    it('should remove leading slashes', () => {
      const input = '/absolute/path/file.txt';
      const result = service.sanitizeFilePath(input);

      expect(result).toBe('absolute/path/file.txt');
    });

    it('should remove null bytes', () => {
      const input = 'file\x00.txt';
      const result = service.sanitizeFilePath(input);

      expect(result).not.toContain('\x00');
    });
  });

  describe('sanitizeEmail', () => {
    it('should lowercase email', () => {
      const result = service.sanitizeEmail('Test@Example.COM');

      expect(result).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      const result = service.sanitizeEmail('test<script>@example.com');

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should trim whitespace', () => {
      const result = service.sanitizeEmail('  test@example.com  ');

      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should keep only valid phone characters', () => {
      const result = service.sanitizePhoneNumber('+1 (555) 123-4567');

      expect(result).toMatch(/^[\d+\s()-]+$/);
    });

    it('should remove letters', () => {
      const result = service.sanitizePhoneNumber('+1-555-CALL');

      expect(result).not.toContain('C');
      expect(result).not.toContain('A');
      expect(result).not.toContain('L');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<div>Test & "quoted" text</div>';
      const result = service.escapeHtml(input);

      expect(result).toBe('&lt;div&gt;Test &amp; &quot;quoted&quot; text&lt;&#x2F;div&gt;');
    });

    it('should escape all dangerous characters', () => {
      const input = '< > & " \' /';
      const result = service.escapeHtml(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('&');
      expect(result).not.toContain('"');
    });
  });

  describe('sanitizeUuid', () => {
    it('should accept valid UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = service.sanitizeUuid(uuid);

      expect(result).toBe(uuid);
    });

    it('should accept UUID in any case', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      const result = service.sanitizeUuid(uuid);

      expect(result).toBe(uuid.toLowerCase());
    });

    it('should reject invalid UUID', () => {
      const result = service.sanitizeUuid('not-a-uuid');

      expect(result).toBeNull();
    });

    it('should reject UUID with wrong format', () => {
      const result = service.sanitizeUuid('550e8400-e29b-41d4-a716');

      expect(result).toBeNull();
    });
  });

  describe('sanitizeMongoOperators', () => {
    it('should remove $ operators from object keys', () => {
      const input = { $where: 'malicious code', name: 'John' };
      const result = service.sanitizeMongoOperators(input);

      expect(result.$where).toBeUndefined();
      expect(result.name).toBe('John');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          $gt: 0,
          name: 'John',
        },
      };
      const result = service.sanitizeMongoOperators(input);

      expect(result.user.$gt).toBeUndefined();
      expect(result.user.name).toBe('John');
    });

    it('should handle arrays', () => {
      const input = [{ $where: 'bad' }, { name: 'good' }];
      const result = service.sanitizeMongoOperators(input);

      expect(result[0].$where).toBeUndefined();
      expect(result[1].name).toBe('good');
    });
  });
});

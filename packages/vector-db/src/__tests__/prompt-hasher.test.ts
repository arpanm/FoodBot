import {
  normalizePrompt,
  hashPrompt,
  hashRaw,
  arePromptsEquivalent,
} from '../cache/prompt-hasher';

describe('PromptHasher', () => {
  describe('normalizePrompt', () => {
    it('should lowercase text', () => {
      expect(normalizePrompt('HELLO WORLD')).toBe('hello world');
    });

    it('should strip extra whitespace', () => {
      expect(normalizePrompt('  hello   world  ')).toBe('hello world');
    });

    it('should remove stopwords', () => {
      const result = normalizePrompt('What is the best pizza in town');
      expect(result).not.toContain('what');
      expect(result).not.toContain('is');
      expect(result).not.toContain('the');
      expect(result).not.toContain('in');
      expect(result).toContain('best');
      expect(result).toContain('pizza');
      expect(result).toContain('town');
    });

    it('should remove punctuation', () => {
      const result = normalizePrompt('Hello, world! How are you?');
      expect(result).not.toContain(',');
      expect(result).not.toContain('!');
      expect(result).not.toContain('?');
    });

    it('should handle empty string', () => {
      expect(normalizePrompt('')).toBe('');
    });

    it('should handle string with only stopwords', () => {
      expect(normalizePrompt('the is a an')).toBe('');
    });

    it('should preserve meaningful words', () => {
      const result = normalizePrompt('Find me a good Italian restaurant nearby');
      expect(result).toContain('find');
      expect(result).toContain('good');
      expect(result).toContain('italian');
      expect(result).toContain('restaurant');
      expect(result).toContain('nearby');
    });
  });

  describe('hashPrompt', () => {
    it('should return a 64-character hex string', () => {
      const hash = hashPrompt('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce same hash for equivalent prompts', () => {
      const h1 = hashPrompt('What is the best pizza?');
      const h2 = hashPrompt('what is the best pizza');
      expect(h1).toBe(h2);
    });

    it('should produce different hash for different prompts', () => {
      const h1 = hashPrompt('best pizza');
      const h2 = hashPrompt('best burger');
      expect(h1).not.toBe(h2);
    });

    it('should normalize before hashing', () => {
      const h1 = hashPrompt('  FIND   me  a  PIZZA  ');
      const h2 = hashPrompt('find me a pizza');
      expect(h1).toBe(h2);
    });
  });

  describe('hashRaw', () => {
    it('should hash without normalization', () => {
      const h1 = hashRaw('Hello');
      const h2 = hashRaw('hello');
      expect(h1).not.toBe(h2);
    });

    it('should return consistent hash', () => {
      const h1 = hashRaw('test');
      const h2 = hashRaw('test');
      expect(h1).toBe(h2);
    });
  });

  describe('arePromptsEquivalent', () => {
    it('should return true for equivalent prompts', () => {
      expect(
        arePromptsEquivalent(
          'What is the best pizza?',
          'what is the best pizza'
        )
      ).toBe(true);
    });

    it('should return false for different prompts', () => {
      expect(
        arePromptsEquivalent('best pizza', 'best burger')
      ).toBe(false);
    });

    it('should handle case and whitespace differences', () => {
      expect(
        arePromptsEquivalent(
          '  FIND  Pizza  ',
          'find pizza'
        )
      ).toBe(true);
    });
  });
});

import { checkSpelling, levenshteinDistance } from '../query/spell-checker';

describe('SpellChecker', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('pizza', 'pizza')).toBe(0);
    });

    it('should return correct distance for single character difference', () => {
      expect(levenshteinDistance('pizza', 'pizzb')).toBe(1);
    });

    it('should return correct distance for insertion', () => {
      expect(levenshteinDistance('pizza', 'pizzza')).toBe(1);
    });

    it('should return correct distance for deletion', () => {
      expect(levenshteinDistance('pizza', 'piza')).toBe(1);
    });

    it('should return string length for empty comparison', () => {
      expect(levenshteinDistance('pizza', '')).toBe(5);
      expect(levenshteinDistance('', 'pizza')).toBe(5);
    });

    it('should return 0 for two empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should handle transpositions as distance 2', () => {
      expect(levenshteinDistance('ab', 'ba')).toBe(2);
    });
  });

  describe('checkSpelling', () => {
    it('should correct "birynai" to "biryani"', () => {
      const result = checkSpelling('birynai');
      expect(result.wasCorrected).toBe(true);
      expect(result.corrected).toBe('biryani');
    });

    it('should correct "pizzza" to "pizza"', () => {
      const result = checkSpelling('pizzza');
      expect(result.wasCorrected).toBe(true);
      expect(result.corrected).toBe('pizza');
    });

    it('should correct "burgar" to "burger"', () => {
      const result = checkSpelling('burgar');
      expect(result.wasCorrected).toBe(true);
      expect(result.corrected).toBe('burger');
    });

    it('should not correct already correct words', () => {
      const result = checkSpelling('pizza');
      expect(result.wasCorrected).toBe(false);
      expect(result.corrected).toBe('pizza');
    });

    it('should handle multiple words in query', () => {
      const result = checkSpelling('chickn birynai');
      expect(result.wasCorrected).toBe(true);
      expect(result.corrected).toContain('chicken');
      expect(result.corrected).toContain('biryani');
    });

    it('should not correct words far from any dictionary term', () => {
      const result = checkSpelling('xyzabc');
      expect(result.wasCorrected).toBe(false);
      expect(result.corrected).toBe('xyzabc');
    });

    it('should include correction details', () => {
      const result = checkSpelling('pizzza');
      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0]!.original).toBe('pizzza');
      expect(result.corrections[0]!.corrected).toBe('pizza');
      expect(result.corrections[0]!.distance).toBe(1);
    });

    it('should correct "sushy" to "sushi"', () => {
      const result = checkSpelling('sushy');
      expect(result.wasCorrected).toBe(true);
      expect(result.corrected).toBe('sushi');
    });

    it('should correct "taco" to "tacos"', () => {
      const result = checkSpelling('taco');
      expect(result.wasCorrected).toBe(true);
      expect(result.corrected).toBe('tacos');
    });

    it('should preserve correct food terms unchanged', () => {
      const correctTerms = ['biryani', 'sushi', 'ramen', 'curry', 'naan'];
      for (const term of correctTerms) {
        const result = checkSpelling(term);
        expect(result.corrected).toBe(term);
      }
    });
  });
});

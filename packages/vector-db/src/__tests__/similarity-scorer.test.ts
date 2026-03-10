import {
  cosineSimilarity,
  meetsThreshold,
  findBestMatch,
  rankBySimilarity,
} from '../cache/similarity-scorer';

describe('SimilarityScorer', () => {
  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const v = [1, 0, 0];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1.0, 5);
    });

    it('should handle normalized vectors correctly', () => {
      const a = [0.6, 0.8, 0];
      const b = [0.8, 0.6, 0];
      const sim = cosineSimilarity(a, b);
      expect(sim).toBeGreaterThan(0.9);
      expect(sim).toBeLessThan(1.0);
    });

    it('should throw for dimension mismatch', () => {
      expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(
        'Vector dimension mismatch'
      );
    });

    it('should return 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
    });

    it('should return 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('should handle high-dimensional vectors', () => {
      const dim = 384;
      const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
      const sim = cosineSimilarity(a, a);
      expect(sim).toBeCloseTo(1.0, 5);
    });
  });

  describe('meetsThreshold', () => {
    it('should return true when similarity equals threshold', () => {
      expect(meetsThreshold(0.92, 0.92)).toBe(true);
    });

    it('should return true when similarity exceeds threshold', () => {
      expect(meetsThreshold(0.95, 0.92)).toBe(true);
    });

    it('should return false when similarity is below threshold', () => {
      expect(meetsThreshold(0.91, 0.92)).toBe(false);
    });

    it('should handle edge case of 0 threshold', () => {
      expect(meetsThreshold(0, 0)).toBe(true);
    });

    it('should handle edge case of 1.0 threshold', () => {
      expect(meetsThreshold(1.0, 1.0)).toBe(true);
      expect(meetsThreshold(0.999, 1.0)).toBe(false);
    });
  });

  describe('findBestMatch', () => {
    const candidates = [
      { vector: [1, 0, 0], data: 'a' },
      { vector: [0, 1, 0], data: 'b' },
      { vector: [0.9, 0.1, 0], data: 'c' },
    ];

    it('should find the best matching candidate', () => {
      const result = findBestMatch([1, 0, 0], candidates, 0.5);
      expect(result).not.toBeNull();
      expect(result?.data).toBe('a');
      expect(result?.score).toBeCloseTo(1.0, 5);
    });

    it('should return null when no candidate meets threshold', () => {
      const result = findBestMatch([0, 0, 1], candidates, 0.99);
      expect(result).toBeNull();
    });

    it('should handle empty candidates', () => {
      const result = findBestMatch([1, 0, 0], [], 0.5);
      expect(result).toBeNull();
    });

    it('should find second-best when best is exact opposite', () => {
      const result = findBestMatch([0, 1, 0], candidates, 0.5);
      expect(result?.data).toBe('b');
    });
  });

  describe('rankBySimilarity', () => {
    const candidates = [
      { vector: [1, 0, 0], data: 'exact' },
      { vector: [0.7, 0.7, 0], data: 'partial' },
      { vector: [0, 1, 0], data: 'orthogonal' },
    ];

    it('should rank by descending similarity', () => {
      const ranked = rankBySimilarity([1, 0, 0], candidates, 3);
      expect(ranked[0]?.data).toBe('exact');
      expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    });

    it('should respect limit', () => {
      const ranked = rankBySimilarity([1, 0, 0], candidates, 2);
      expect(ranked).toHaveLength(2);
    });

    it('should handle empty candidates', () => {
      const ranked = rankBySimilarity([1, 0, 0], [], 5);
      expect(ranked).toHaveLength(0);
    });

    it('should return all items when limit exceeds count', () => {
      const ranked = rankBySimilarity([1, 0, 0], candidates, 10);
      expect(ranked).toHaveLength(3);
    });
  });
});

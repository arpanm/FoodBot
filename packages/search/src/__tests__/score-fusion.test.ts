import { fuseResults } from '../engine/score-fusion';
import type { SearchResult, SearchDocument } from '../types/search.types';

function makeDoc(id: string, name: string): SearchDocument {
  return {
    id,
    name,
    description: `${name} description`,
    cuisine: 'Test',
    price: 100,
    rating: 4.0,
    dietary: [],
    deliveryTime: 30,
  };
}

function makeResult(
  id: string,
  name: string,
  score: number,
  source: 'keyword' | 'semantic'
): SearchResult {
  return { document: makeDoc(id, name), score, source };
}

describe('ScoreFusion', () => {
  const keywordResults: SearchResult[] = [
    makeResult('doc-1', 'Biryani', 10, 'keyword'),
    makeResult('doc-2', 'Pizza', 8, 'keyword'),
    makeResult('doc-3', 'Burger', 5, 'keyword'),
  ];

  const semanticResults: SearchResult[] = [
    makeResult('doc-2', 'Pizza', 0.95, 'semantic'),
    makeResult('doc-4', 'Pasta', 0.8, 'semantic'),
    makeResult('doc-1', 'Biryani', 0.7, 'semantic'),
  ];

  describe('Reciprocal Rank Fusion (RRF)', () => {
    it('should fuse keyword and semantic results', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
      });

      expect(fused.length).toBeGreaterThanOrEqual(1);
    });

    it('should include documents from both result sets', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
      });

      const ids = fused.map((r) => r.document.id);
      expect(ids).toContain('doc-1');
      expect(ids).toContain('doc-2');
      expect(ids).toContain('doc-3');
      expect(ids).toContain('doc-4');
    });

    it('should rank doc-2 higher (appears in both lists)', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
        keywordWeight: 0.5,
        semanticWeight: 0.5,
      });

      const doc2 = fused.find((r) => r.document.id === 'doc-2');
      const doc3 = fused.find((r) => r.document.id === 'doc-3');
      expect(doc2).toBeDefined();
      expect(doc3).toBeDefined();
      expect(doc2!.fusedScore).toBeGreaterThan(doc3!.fusedScore);
    });

    it('should assign keyword and semantic ranks', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
      });

      const doc1 = fused.find((r) => r.document.id === 'doc-1');
      expect(doc1).toBeDefined();
      expect(doc1!.keywordRank).toBe(1);
      expect(doc1!.semanticRank).toBe(3);
    });

    it('should use configurable k parameter', () => {
      const fusedK10 = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
        rrfK: 10,
      });

      const fusedK100 = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
        rrfK: 100,
      });

      expect(fusedK10[0]!.fusedScore).not.toBe(fusedK100[0]!.fusedScore);
    });

    it('should respect keyword vs semantic weights', () => {
      const keywordHeavy = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
        keywordWeight: 0.9,
        semanticWeight: 0.1,
      });

      const semanticHeavy = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
        keywordWeight: 0.1,
        semanticWeight: 0.9,
      });

      expect(keywordHeavy[0]!.document.id).not.toBe(
        semanticHeavy[0]!.document.id
      );
    });

    it('should sort results by fused score descending', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'rrf',
      });

      for (let i = 1; i < fused.length; i++) {
        expect(fused[i - 1]!.fusedScore).toBeGreaterThanOrEqual(
          fused[i]!.fusedScore
        );
      }
    });
  });

  describe('Linear Combination', () => {
    it('should fuse results using linear combination', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'linear',
      });

      expect(fused.length).toBeGreaterThanOrEqual(1);
    });

    it('should include documents from both result sets', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'linear',
      });

      const ids = fused.map((r) => r.document.id);
      expect(ids).toContain('doc-1');
      expect(ids).toContain('doc-2');
    });

    it('should have positive fused scores', () => {
      const fused = fuseResults(keywordResults, semanticResults, {
        method: 'linear',
      });

      for (const result of fused) {
        expect(result.fusedScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty keyword results', () => {
      const fused = fuseResults([], semanticResults, { method: 'rrf' });
      expect(fused.length).toBe(semanticResults.length);
    });

    it('should handle empty semantic results', () => {
      const fused = fuseResults(keywordResults, [], { method: 'rrf' });
      expect(fused.length).toBe(keywordResults.length);
    });

    it('should handle both empty', () => {
      const fused = fuseResults([], [], { method: 'rrf' });
      expect(fused).toHaveLength(0);
    });
  });
});

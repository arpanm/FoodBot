import { HybridSearch, createHybridSearch } from '../search/hybrid-search';
import type { HybridSearchResult, KeywordSearchFn } from '../search/hybrid-search';
import { InMemoryVectorStore } from '../vector-store/vector-store.client';
import { LocalEmbedder } from '../embedding/local-embedder';
import type { SearchResult } from '../types/vector-store.types';

describe('HybridSearch', () => {
  let store: InMemoryVectorStore;
  let embedder: LocalEmbedder;
  let hybrid: HybridSearch;
  const collection = 'test-hybrid';

  beforeEach(async () => {
    store = new InMemoryVectorStore();
    embedder = new LocalEmbedder();
    await store.createCollection({
      name: collection,
      dimension: 384,
      distance: 'cosine',
    });

    hybrid = createHybridSearch(store, embedder, {
      keywordWeight: 0.4,
      semanticWeight: 0.6,
    });
  });

  describe('fuseResults (RRF algorithm)', () => {
    const keywordResults: SearchResult[] = [
      { id: 'a', score: 0.9, payload: { name: 'A' } },
      { id: 'b', score: 0.8, payload: { name: 'B' } },
      { id: 'c', score: 0.7, payload: { name: 'C' } },
    ];

    const semanticResults: SearchResult[] = [
      { id: 'b', score: 0.95, payload: { name: 'B' } },
      { id: 'c', score: 0.85, payload: { name: 'C' } },
      { id: 'd', score: 0.75, payload: { name: 'D' } },
    ];

    it('should combine keyword and semantic results', () => {
      const fused = hybrid.fuseResults(keywordResults, semanticResults, 10);
      const ids = fused.map((r) => r.id);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).toContain('d');
    });

    it('should rank items appearing in both lists higher', () => {
      const fused = hybrid.fuseResults(keywordResults, semanticResults, 10);
      const bResult = fused.find((r) => r.id === 'b');
      const aResult = fused.find((r) => r.id === 'a');
      const dResult = fused.find((r) => r.id === 'd');

      // 'b' appears in both lists so should have higher score
      expect(bResult!.score).toBeGreaterThan(dResult!.score);
      expect(bResult!.keywordRank).not.toBeNull();
      expect(bResult!.semanticRank).not.toBeNull();
    });

    it('should respect limit', () => {
      const fused = hybrid.fuseResults(keywordResults, semanticResults, 2);
      expect(fused).toHaveLength(2);
    });

    it('should include rank information', () => {
      const fused = hybrid.fuseResults(keywordResults, semanticResults, 10);
      const bResult = fused.find((r) => r.id === 'b');
      expect(bResult?.keywordRank).toBe(2);
      expect(bResult?.semanticRank).toBe(1);
    });

    it('should set null rank for items only in one list', () => {
      const fused = hybrid.fuseResults(keywordResults, semanticResults, 10);
      const aResult = fused.find((r) => r.id === 'a');
      const dResult = fused.find((r) => r.id === 'd');

      expect(aResult?.keywordRank).toBe(1);
      expect(aResult?.semanticRank).toBeNull();
      expect(dResult?.keywordRank).toBeNull();
      expect(dResult?.semanticRank).toBe(3);
    });

    it('should handle empty keyword results', () => {
      const fused = hybrid.fuseResults([], semanticResults, 10);
      expect(fused).toHaveLength(3);
      fused.forEach((r) => expect(r.keywordRank).toBeNull());
    });

    it('should handle empty semantic results', () => {
      const fused = hybrid.fuseResults(keywordResults, [], 10);
      expect(fused).toHaveLength(3);
      fused.forEach((r) => expect(r.semanticRank).toBeNull());
    });

    it('should handle both empty', () => {
      const fused = hybrid.fuseResults([], [], 10);
      expect(fused).toHaveLength(0);
    });

    it('should sort by descending RRF score', () => {
      const fused = hybrid.fuseResults(keywordResults, semanticResults, 10);
      for (let i = 1; i < fused.length; i++) {
        const prev = fused[i - 1];
        const curr = fused[i];
        if (prev && curr) {
          expect(prev.score).toBeGreaterThanOrEqual(curr.score);
        }
      }
    });
  });

  describe('search (full pipeline)', () => {
    it('should combine keyword and semantic search', async () => {
      // Seed the vector store with embeddings
      const texts = ['pizza margherita', 'chicken tikka', 'pasta carbonara'];
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i]!;
        const embedding = await embedder.embed(text);
        await store.upsertPoints(collection, [{
          id: `item-${i}`,
          vector: embedding.vector,
          payload: { name: text },
        }]);
      }

      const mockKeywordSearch: KeywordSearchFn = async (query, limit) => {
        return [
          { id: 'item-0', score: 0.9, payload: { name: 'pizza margherita' } },
        ];
      };

      const results = await hybrid.search(
        collection,
        'pizza',
        mockKeywordSearch,
        5
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.payload).toBeDefined();
    });

    it('should handle keyword search returning empty', async () => {
      const embedding = await embedder.embed('test dish');
      await store.upsertPoints(collection, [{
        id: 'item-1',
        vector: embedding.vector,
        payload: { name: 'test dish' },
      }]);

      const emptyKeywordSearch: KeywordSearchFn = async () => [];

      const results = await hybrid.search(
        collection,
        'test dish',
        emptyKeywordSearch,
        5
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('createHybridSearch factory', () => {
    it('should create instance with default config', () => {
      const instance = createHybridSearch(store, embedder);
      expect(instance).toBeInstanceOf(HybridSearch);
    });

    it('should create instance with custom config', () => {
      const instance = createHybridSearch(store, embedder, {
        keywordWeight: 0.3,
        semanticWeight: 0.7,
        rrfK: 30,
      });
      expect(instance).toBeInstanceOf(HybridSearch);
    });
  });

  describe('weight balance', () => {
    it('should favor semantic results with higher semantic weight', () => {
      const semanticHeavy = new HybridSearch({
        store,
        embedder,
        keywordWeight: 0.1,
        semanticWeight: 0.9,
        rrfK: 60,
        timeoutMs: 5000,
      });

      const keywordResults: SearchResult[] = [
        { id: 'k1', score: 0.9, payload: {} },
      ];
      const semanticResults: SearchResult[] = [
        { id: 's1', score: 0.95, payload: {} },
      ];

      const fused = semanticHeavy.fuseResults(
        keywordResults,
        semanticResults,
        10
      );
      const s1 = fused.find((r) => r.id === 's1');
      const k1 = fused.find((r) => r.id === 'k1');

      // Semantic-only result should score higher with 0.9 semantic weight
      expect(s1!.score).toBeGreaterThan(k1!.score);
    });

    it('should favor keyword results with higher keyword weight', () => {
      const keywordHeavy = new HybridSearch({
        store,
        embedder,
        keywordWeight: 0.9,
        semanticWeight: 0.1,
        rrfK: 60,
        timeoutMs: 5000,
      });

      const keywordResults: SearchResult[] = [
        { id: 'k1', score: 0.9, payload: {} },
      ];
      const semanticResults: SearchResult[] = [
        { id: 's1', score: 0.95, payload: {} },
      ];

      const fused = keywordHeavy.fuseResults(
        keywordResults,
        semanticResults,
        10
      );
      const s1 = fused.find((r) => r.id === 's1');
      const k1 = fused.find((r) => r.id === 'k1');

      expect(k1!.score).toBeGreaterThan(s1!.score);
    });
  });
});

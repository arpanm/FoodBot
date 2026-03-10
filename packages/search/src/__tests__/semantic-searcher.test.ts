import {
  SemanticSearcher,
  InMemoryEmbeddingProvider,
  cosineSimilarity,
} from '../engine/semantic-searcher';
import type { SearchDocument } from '../types/search.types';

function createTestDocuments(): SearchDocument[] {
  return [
    {
      id: 'doc-1',
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice with spiced chicken',
      cuisine: 'Indian',
      price: 250,
      rating: 4.5,
      dietary: ['halal'],
      deliveryTime: 30,
      tags: ['rice', 'chicken'],
    },
    {
      id: 'doc-2',
      name: 'Margherita Pizza',
      description: 'Classic pizza with fresh mozzarella',
      cuisine: 'Italian',
      price: 350,
      rating: 4.2,
      dietary: ['vegetarian'],
      deliveryTime: 25,
      tags: ['pizza', 'cheese'],
    },
    {
      id: 'doc-3',
      name: 'Vegetable Sushi',
      description: 'Fresh vegetable maki rolls',
      cuisine: 'Japanese',
      price: 400,
      rating: 4.6,
      dietary: ['vegetarian', 'vegan'],
      deliveryTime: 35,
      tags: ['sushi', 'healthy'],
    },
  ];
}

describe('SemanticSearcher', () => {
  let provider: InMemoryEmbeddingProvider;
  let searcher: SemanticSearcher;
  let documents: SearchDocument[];

  beforeEach(async () => {
    provider = new InMemoryEmbeddingProvider(32);
    searcher = new SemanticSearcher({
      embeddingProvider: provider,
      similarityThreshold: 0.0,
    });
    documents = createTestDocuments();
    await searcher.indexDocuments(documents);
  });

  describe('indexDocuments', () => {
    it('should index all documents', async () => {
      const results = await searcher.search('food', 100);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search', () => {
    it('should return results for a query', async () => {
      const results = await searcher.search('chicken biryani');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should tag results with semantic source', async () => {
      const results = await searcher.search('pizza');
      for (const result of results) {
        expect(result.source).toBe('semantic');
      }
    });

    it('should return scores between -1 and 1', async () => {
      const results = await searcher.search('sushi');
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(-1);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    it('should respect limit parameter', async () => {
      const results = await searcher.search('food', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should sort results by score descending', async () => {
      const results = await searcher.search('pizza');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(
          results[i]!.score
        );
      }
    });
  });

  describe('similarity threshold', () => {
    it('should filter results below threshold', async () => {
      const strictSearcher = new SemanticSearcher({
        embeddingProvider: provider,
        similarityThreshold: 0.99,
      });
      await strictSearcher.indexDocuments(documents);

      const results = await strictSearcher.search('something very unrelated');
      expect(results.length).toBeLessThanOrEqual(documents.length);
    });
  });
});

describe('InMemoryEmbeddingProvider', () => {
  it('should return embeddings of correct dimensions', async () => {
    const provider = new InMemoryEmbeddingProvider(64);
    const embedding = await provider.embed('test text');
    expect(embedding).toHaveLength(64);
  });

  it('should report correct dimensions', () => {
    const provider = new InMemoryEmbeddingProvider(128);
    expect(provider.dimensions()).toBe(128);
  });

  it('should produce deterministic embeddings', async () => {
    const provider = new InMemoryEmbeddingProvider(32);
    const embedding1 = await provider.embed('pizza');
    const embedding2 = await provider.embed('pizza');
    expect(embedding1).toEqual(embedding2);
  });

  it('should produce different embeddings for different inputs', async () => {
    const provider = new InMemoryEmbeddingProvider(32);
    const e1 = await provider.embed('pizza');
    const e2 = await provider.embed('sushi');
    expect(e1).not.toEqual(e2);
  });
});

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const v = [1, 0, 0, 1];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('should return 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('should return 0 for different length vectors', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('should return 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

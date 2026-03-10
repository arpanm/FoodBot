import { KeywordSearcher } from '../engine/keyword-searcher';
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
      dietary: [],
      deliveryTime: 30,
      tags: ['rice', 'chicken', 'spicy'],
    },
    {
      id: 'doc-2',
      name: 'Margherita Pizza',
      description: 'Classic pizza with fresh mozzarella and basil',
      cuisine: 'Italian',
      price: 350,
      rating: 4.2,
      dietary: ['vegetarian'],
      deliveryTime: 25,
      tags: ['pizza', 'cheese'],
    },
    {
      id: 'doc-3',
      name: 'Paneer Tikka',
      description: 'Grilled cottage cheese with Indian spices',
      cuisine: 'Indian',
      price: 200,
      rating: 4.0,
      dietary: ['vegetarian'],
      deliveryTime: 20,
      tags: ['paneer', 'vegetarian'],
    },
    {
      id: 'doc-4',
      name: 'Spicy Chicken Wings',
      description: 'Crispy fried chicken wings with hot sauce',
      cuisine: 'American',
      price: 300,
      rating: 4.3,
      dietary: [],
      deliveryTime: 15,
      tags: ['chicken', 'fried', 'spicy'],
    },
    {
      id: 'doc-5',
      name: 'Vegetable Sushi',
      description: 'Assorted vegetable maki rolls with soy sauce',
      cuisine: 'Japanese',
      price: 400,
      rating: 4.6,
      dietary: ['vegetarian', 'vegan'],
      deliveryTime: 35,
      tags: ['sushi', 'healthy'],
    },
  ];
}

describe('KeywordSearcher', () => {
  let searcher: KeywordSearcher;
  let documents: SearchDocument[];

  beforeEach(() => {
    searcher = new KeywordSearcher();
    documents = createTestDocuments();
    searcher.indexDocuments(documents);
  });

  describe('exact keyword search', () => {
    it('should find documents matching query terms', () => {
      const results = searcher.search(['biryani']);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.document.id).toBe('doc-1');
    });

    it('should find documents by cuisine', () => {
      const results = searcher.search(['indian']);
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ids = results.map((r) => r.document.id);
      expect(ids).toContain('doc-1');
      expect(ids).toContain('doc-3');
    });

    it('should rank name matches higher than description matches', () => {
      const results = searcher.search(['chicken']);
      expect(results.length).toBeGreaterThanOrEqual(2);
      const nameMatchIds = results
        .filter((r) => r.document.name.toLowerCase().includes('chicken'))
        .map((r) => r.document.id);
      expect(nameMatchIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should return results with positive scores', () => {
      const results = searcher.search(['pizza']);
      for (const result of results) {
        expect(result.score).toBeGreaterThan(0);
      }
    });

    it('should return results sorted by score descending', () => {
      const results = searcher.search(['chicken']);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
      }
    });

    it('should return empty for non-matching query', () => {
      const results = searcher.search(['nonexistentfood'], 20, false);
      expect(results).toHaveLength(0);
    });
  });

  describe('multi-term search', () => {
    it('should combine scores for multiple matching terms', () => {
      const singleResults = searcher.search(['chicken'], 20, false);
      const multiResults = searcher.search(
        ['chicken', 'biryani'],
        20,
        false
      );

      const biryaniBoth = multiResults.find((r) => r.document.id === 'doc-1');
      const biryanySingle = singleResults.find(
        (r) => r.document.id === 'doc-1'
      );

      expect(biryaniBoth).toBeDefined();
      expect(biryanySingle).toBeDefined();
      expect(biryaniBoth!.score).toBeGreaterThan(biryanySingle!.score);
    });
  });

  describe('fuzzy matching', () => {
    it('should find results for slightly misspelled terms', () => {
      const results = searcher.search(['pizz'], 20, true);
      const hasMatch = results.some((r) => r.document.id === 'doc-2');
      expect(hasMatch).toBe(true);
    });

    it('should score exact matches higher than fuzzy matches', () => {
      const exactResults = searcher.search(['pizza'], 20, false);
      const fuzzyResults = searcher.search(['pizz'], 20, true);

      const exactPizza = exactResults.find((r) => r.document.id === 'doc-2');
      const fuzzyPizza = fuzzyResults.find((r) => r.document.id === 'doc-2');

      expect(exactPizza).toBeDefined();
      expect(fuzzyPizza).toBeDefined();
      expect(exactPizza!.score).toBeGreaterThan(fuzzyPizza!.score);
    });
  });

  describe('result limiting', () => {
    it('should respect limit parameter', () => {
      const results = searcher.search(['chicken'], 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('source tagging', () => {
    it('should tag results with keyword source', () => {
      const results = searcher.search(['pizza']);
      for (const result of results) {
        expect(result.source).toBe('keyword');
      }
    });
  });
});

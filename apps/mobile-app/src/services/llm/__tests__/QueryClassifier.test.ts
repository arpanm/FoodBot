/**
 * Unit Tests for Query Classifier
 */

import { QueryClassifier } from '../QueryClassifier';

describe('QueryClassifier', () => {
  let classifier: QueryClassifier;

  beforeEach(() => {
    classifier = new QueryClassifier();
  });

  describe('Simple Queries', () => {
    const simpleQueries = [
      'Hi',
      'Hello',
      'Yes',
      'No',
      'Thanks',
      'What is AI?',
      'Hello there',
    ];

    simpleQueries.forEach((query) => {
      it(`should classify "${query}" as simple`, () => {
        const result = classifier.classify(query);
        expect(result.complexity).toBe('simple');
      });
    });
  });

  describe('Medium Queries', () => {
    const mediumQueries = [
      'What are the benefits of using TypeScript?',
      'How do I install React Native?',
      'Can you recommend a good restaurant nearby?',
      'What time does the store close today?',
    ];

    mediumQueries.forEach((query) => {
      it(`should classify "${query}" as medium or simple`, () => {
        const result = classifier.classify(query);
        expect(['simple', 'medium']).toContain(result.complexity);
      });
    });
  });

  describe('Complex Queries', () => {
    const complexQueries = [
      'Analyze the trade-offs between microservices and monolithic architectures',
      'Write a function to implement a balanced binary search tree in TypeScript',
      'Explain the differences between REST and GraphQL APIs and when to use each',
      'function test() { return 42; }',
      'const obj = { key: "value" };',
    ];

    complexQueries.forEach((query) => {
      it(`should classify as complex: "${query.substring(0, 50)}..."`, () => {
        const result = classifier.classify(query);
        expect(result.complexity).toBe('complex');
      });
    });
  });

  describe('Provider Recommendation', () => {
    it('should recommend cloud for complex queries', () => {
      const result = classifier.classify('Analyze this complex algorithm');
      expect(['cloud']).toContain(result.recommendedProvider);
    });

    it('should provide reasoning for classification', () => {
      const result = classifier.classify('Hello world');
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should provide confidence score between 0 and 1', () => {
      const result = classifier.classify('Test query');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

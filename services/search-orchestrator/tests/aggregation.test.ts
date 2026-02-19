/**
 * Unit tests for aggregation components:
 * - Deduplicator
 * - ScoreCalculator
 * - Ranker
 * - ResultAggregator
 */

import pino from 'pino';

import { Deduplicator } from '../src/aggregation/Deduplicator';
import { ScoreCalculator } from '../src/aggregation/ScoreCalculator';
import { Ranker } from '../src/aggregation/Ranker';
import { ResultAggregator } from '../src/aggregation/ResultAggregator';
import type { UnifiedSearchResult } from '../src/types/search.types';
import type { ScoringConfig, RankingContext } from '../src/types/result.types';
import type { SourceQueryResult } from '../src/types/source.types';

const logger = pino({ level: 'silent' });

function createRestaurantResult(
  id: string,
  name: string,
  source: string,
  overrides?: Partial<UnifiedSearchResult>,
): UnifiedSearchResult {
  return {
    id,
    type: 'restaurant',
    name,
    description: `${name} description`,
    score: 0.8,
    source,
    restaurant: {
      id,
      name,
      description: `${name} description`,
      cuisineTypes: ['Italian'],
      rating: 4.5,
      reviewCount: 100,
      priceRange: 'moderate',
      deliveryTime: 25,
      deliveryFee: 2.99,
      minimumOrder: 10,
      isAvailable: true,
      address: '123 Main St',
      location: { lat: 12.9716, lon: 77.5946 },
      tags: ['pizza'],
      features: [],
    },
    ...overrides,
  };
}

function createDishResult(
  id: string,
  name: string,
  source: string,
  restaurantId: string,
): UnifiedSearchResult {
  return {
    id,
    type: 'dish',
    name,
    description: `${name} description`,
    score: 0.7,
    source,
    dish: {
      id,
      restaurantId,
      name,
      description: `${name} description`,
      category: 'Main Course',
      price: 15.99,
      ingredients: ['cheese', 'tomato'],
      dietaryTags: ['vegetarian'],
      isAvailable: true,
      rating: 4.2,
    },
  };
}

const defaultScoringConfig: ScoringConfig = {
  weights: {
    relevance: 0.35,
    rating: 0.20,
    proximity: 0.15,
    availability: 0.10,
    deliveryTime: 0.08,
    userPreference: 0.07,
    popularity: 0.05,
  },
  boosts: {
    availableNow: 1.5,
    highRating: 1.3,
    nearbyDistance: 1.4,
    preferredCuisine: 1.2,
  },
  penalties: {
    longDeliveryTime: 0.7,
    lowRating: 0.5,
    farDistance: 0.6,
  },
};

describe('Deduplicator', () => {
  const deduplicator = new Deduplicator(logger);

  it('should remove exact ID duplicates', () => {
    const results: UnifiedSearchResult[] = [
      createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch'),
      createRestaurantResult('r1', 'Pizza Palace', 'mcp-adapter'),
    ];

    const deduped = deduplicator.deduplicate(results);

    expect(deduped.unique).toHaveLength(1);
    expect(deduped.duplicateCount).toBe(1);
    expect(deduped.mergedCount).toBe(1);
  });

  it('should keep unique results', () => {
    const results: UnifiedSearchResult[] = [
      createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch'),
      createRestaurantResult('r2', 'Burger King', 'mcp-adapter'),
      createRestaurantResult('r3', 'Sushi Express', 'database'),
    ];

    const deduped = deduplicator.deduplicate(results);

    expect(deduped.unique).toHaveLength(3);
    expect(deduped.duplicateCount).toBe(0);
  });

  it('should merge data from duplicate sources', () => {
    const result1 = createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch');
    result1.restaurant!.tags = ['pizza', 'italian'];
    result1.restaurant!.features = [];

    const result2 = createRestaurantResult('r1', 'Pizza Palace', 'mcp-adapter');
    result2.restaurant!.tags = ['italian'];
    result2.restaurant!.features = ['delivery', 'dine-in'];
    result2.score = 0.9;

    const deduped = deduplicator.deduplicate([result1, result2]);

    expect(deduped.unique).toHaveLength(1);
    const merged = deduped.unique[0]!;
    expect(merged.score).toBe(0.9); // Takes higher score
    expect(merged.restaurant!.tags).toContain('pizza');
    expect(merged.restaurant!.tags).toContain('italian');
    expect(merged.restaurant!.features).toContain('delivery');
    expect(merged.restaurant!.features).toContain('dine-in');
  });

  it('should detect similar names as duplicates', () => {
    const results: UnifiedSearchResult[] = [
      createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch'),
      createRestaurantResult('r99', 'Pizza Palace', 'mcp-adapter'),
    ];

    const deduped = deduplicator.deduplicate(results);

    expect(deduped.unique).toHaveLength(1);
    expect(deduped.duplicateCount).toBe(1);
  });

  it('should not merge results of different types', () => {
    const restaurant = createRestaurantResult('item1', 'Pizza Supreme', 'elasticsearch');
    const dish = createDishResult('item2', 'Pizza Supreme', 'mcp-adapter', 'r1');

    const deduped = deduplicator.deduplicate([restaurant, dish]);

    expect(deduped.unique).toHaveLength(2);
    expect(deduped.duplicateCount).toBe(0);
  });

  it('should handle empty input', () => {
    const deduped = deduplicator.deduplicate([]);

    expect(deduped.unique).toHaveLength(0);
    expect(deduped.duplicateCount).toBe(0);
  });

  it('should calculate name similarity correctly', () => {
    expect(deduplicator.calculateNameSimilarity('pizza', 'pizza')).toBe(1.0);
    expect(deduplicator.calculateNameSimilarity('', '')).toBe(0.0);
    expect(deduplicator.calculateNameSimilarity('pizza', 'pasta')).toBeLessThan(0.85);
    expect(deduplicator.calculateNameSimilarity('pizza palace', 'pizza palce')).toBeGreaterThan(0.85);
  });
});

describe('ScoreCalculator', () => {
  const calculator = new ScoreCalculator(defaultScoringConfig, logger);

  it('should calculate score for a high-rated nearby restaurant', () => {
    const result = createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch');
    result.restaurant!.rating = 4.8;
    result.restaurant!.isAvailable = true;
    result.restaurant!.deliveryTime = 15;

    const context: RankingContext = {
      userLocation: { lat: 12.9716, lon: 77.5946 },
    };

    const score = calculator.calculateScore(result, context);

    expect(score.finalScore).toBeGreaterThan(0);
    expect(score.finalScore).toBeLessThanOrEqual(1);
    expect(score.ratingBoost).toBe(defaultScoringConfig.boosts.highRating);
    expect(score.availabilityBoost).toBe(defaultScoringConfig.boosts.availableNow);
  });

  it('should penalize low-rated restaurants', () => {
    const highRated = createRestaurantResult('r1', 'Good Place', 'elasticsearch');
    highRated.restaurant!.rating = 4.8;

    const lowRated = createRestaurantResult('r2', 'Bad Place', 'elasticsearch');
    lowRated.restaurant!.rating = 2.5;

    const context: RankingContext = {};

    const highScore = calculator.calculateScore(highRated, context);
    const lowScore = calculator.calculateScore(lowRated, context);

    expect(highScore.ratingBoost).toBeGreaterThan(lowScore.ratingBoost);
  });

  it('should boost nearby restaurants', () => {
    const nearby = createRestaurantResult('r1', 'Nearby', 'elasticsearch');
    nearby.restaurant!.location = { lat: 12.9720, lon: 77.5950 };

    const faraway = createRestaurantResult('r2', 'Far Away', 'elasticsearch');
    faraway.restaurant!.location = { lat: 28.7041, lon: 77.1025 };

    const context: RankingContext = {
      userLocation: { lat: 12.9716, lon: 77.5946 },
    };

    const nearScore = calculator.calculateScore(nearby, context);
    const farScore = calculator.calculateScore(faraway, context);

    expect(nearScore.proximityBoost).toBeGreaterThan(farScore.proximityBoost);
  });

  it('should boost available restaurants', () => {
    const available = createRestaurantResult('r1', 'Open', 'elasticsearch');
    available.restaurant!.isAvailable = true;

    const unavailable = createRestaurantResult('r2', 'Closed', 'elasticsearch');
    unavailable.restaurant!.isAvailable = false;

    const context: RankingContext = {};

    const openScore = calculator.calculateScore(available, context);
    const closedScore = calculator.calculateScore(unavailable, context);

    expect(openScore.availabilityBoost).toBeGreaterThan(closedScore.availabilityBoost);
  });

  it('should boost user-preferred cuisines', () => {
    const italian = createRestaurantResult('r1', 'Italian Place', 'elasticsearch');
    italian.restaurant!.cuisineTypes = ['Italian'];

    const context: RankingContext = {
      userPreferences: { preferredCuisines: ['italian'] },
    };

    const score = calculator.calculateScore(italian, context);

    expect(score.userPreferenceBoost).toBe(defaultScoringConfig.boosts.preferredCuisine);
  });

  it('should handle dish scoring', () => {
    const dish = createDishResult('d1', 'Margherita Pizza', 'elasticsearch', 'r1');

    const score = calculator.calculateScore(dish, {});

    expect(score.finalScore).toBeGreaterThan(0);
    expect(score.finalScore).toBeLessThanOrEqual(1);
  });
});

describe('Ranker', () => {
  const ranker = new Ranker(defaultScoringConfig, logger);

  it('should rank results by final score descending', () => {
    const results: UnifiedSearchResult[] = [
      createRestaurantResult('r1', 'Low Rated', 'elasticsearch', {
        score: 0.3,
        restaurant: {
          id: 'r1',
          name: 'Low Rated',
          description: '',
          cuisineTypes: [],
          rating: 2.0,
          reviewCount: 5,
          priceRange: 'budget',
          deliveryTime: 60,
          deliveryFee: 5,
          minimumOrder: 20,
          isAvailable: false,
          address: '',
          tags: [],
          features: [],
        },
      }),
      createRestaurantResult('r2', 'High Rated', 'elasticsearch', {
        score: 0.9,
        restaurant: {
          id: 'r2',
          name: 'High Rated',
          description: '',
          cuisineTypes: [],
          rating: 4.9,
          reviewCount: 500,
          priceRange: 'moderate',
          deliveryTime: 15,
          deliveryFee: 0,
          minimumOrder: 0,
          isAvailable: true,
          address: '',
          tags: [],
          features: [],
        },
      }),
    ];

    const ranked = ranker.rank(results, {});

    expect(ranked[0]!.name).toBe('High Rated');
    expect(ranked[1]!.name).toBe('Low Rated');
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it('should handle empty input', () => {
    const ranked = ranker.rank([], {});
    expect(ranked).toHaveLength(0);
  });

  it('should handle single result', () => {
    const result = createRestaurantResult('r1', 'Only One', 'elasticsearch');
    const ranked = ranker.rank([result], {});

    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.name).toBe('Only One');
  });
});

describe('ResultAggregator', () => {
  const aggregator = new ResultAggregator(logger);

  it('should merge results from multiple sources', () => {
    const sourceResults: SourceQueryResult[] = [
      {
        source: 'elasticsearch',
        results: [
          createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch'),
          createRestaurantResult('r2', 'Burger Joint', 'elasticsearch'),
        ],
        totalCount: 2,
        latencyMs: 50,
      },
      {
        source: 'mcp-adapter',
        results: [
          createRestaurantResult('r3', 'Sushi Express', 'mcp-adapter'),
        ],
        totalCount: 1,
        latencyMs: 100,
      },
    ];

    const request = { query: 'food', page: 1, pageSize: 20 };
    const aggregated = aggregator.aggregate(sourceResults, request);

    expect(aggregated.results.length).toBe(3);
    expect(aggregated.totalFromAllSources).toBe(3);
  });

  it('should skip errored sources', () => {
    const sourceResults: SourceQueryResult[] = [
      {
        source: 'elasticsearch',
        results: [createRestaurantResult('r1', 'Pizza', 'elasticsearch')],
        totalCount: 1,
        latencyMs: 50,
      },
      {
        source: 'mcp-adapter',
        results: [],
        totalCount: 0,
        latencyMs: 200,
        error: {
          code: 'TIMEOUT',
          message: 'Timeout',
          source: 'mcp-adapter',
          retryable: true,
          timestamp: new Date(),
        },
      },
    ];

    const request = { query: 'pizza', page: 1, pageSize: 20 };
    const aggregated = aggregator.aggregate(sourceResults, request);

    expect(aggregated.results.length).toBe(1);
  });

  it('should apply cuisine filter during aggregation', () => {
    const sourceResults: SourceQueryResult[] = [
      {
        source: 'elasticsearch',
        results: [
          createRestaurantResult('r1', 'Pizza Palace', 'elasticsearch'),
          {
            ...createRestaurantResult('r2', 'Sushi Bar', 'elasticsearch'),
            restaurant: {
              ...createRestaurantResult('r2', 'Sushi Bar', 'elasticsearch').restaurant!,
              cuisineTypes: ['Japanese'],
            },
          },
        ],
        totalCount: 2,
        latencyMs: 50,
      },
    ];

    const request = {
      query: 'food',
      page: 1,
      pageSize: 20,
      filters: { cuisines: ['Italian'] },
    };
    const aggregated = aggregator.aggregate(sourceResults, request);

    expect(aggregated.results.length).toBe(1);
    expect(aggregated.results[0]!.name).toBe('Pizza Palace');
  });

  it('should handle empty source results', () => {
    const aggregated = aggregator.aggregate([], { query: '', page: 1, pageSize: 20 });

    expect(aggregated.results).toHaveLength(0);
    expect(aggregated.totalFromAllSources).toBe(0);
  });
});

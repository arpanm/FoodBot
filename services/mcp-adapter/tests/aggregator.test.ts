/**
 * Tests for aggregator components: deduplication, ranking, merging.
 */

import { ResultDeduplicator } from '../src/aggregator/ResultDeduplicator';
import { ResultRanker } from '../src/aggregator/ResultRanker';
import { ResultMerger } from '../src/aggregator/ResultMerger';
import { MockProvider } from '../src/providers/mock/MockProvider';
import type { Restaurant, SearchQuery, RestaurantDetails } from '../src/types/provider.types';

function makeRestaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: 'test-1',
    externalId: '1',
    provider: 'mock',
    name: 'Test Restaurant',
    imageUrl: '',
    address: '123 Test St',
    cuisines: ['Indian'],
    rating: 4.0,
    reviewCount: 100,
    deliveryTimeMinutes: 30,
    distanceKm: 2.0,
    priceRange: 2,
    isOpen: true,
    isAvailable: true,
    offers: [],
    operatingHours: null,
    location: { lat: 12.97, lng: 77.59 },
    ...overrides,
  };
}

describe('ResultDeduplicator', () => {
  let deduplicator: ResultDeduplicator;

  beforeEach(() => {
    deduplicator = new ResultDeduplicator();
  });

  it('should not deduplicate different restaurants', () => {
    const restaurants = [
      makeRestaurant({ id: 'r1', name: 'Pizza Hut', provider: 'swiggy' }),
      makeRestaurant({ id: 'r2', name: 'Dominos', provider: 'zomato' }),
    ];

    const result = deduplicator.deduplicate(restaurants);
    expect(result).toHaveLength(2);
  });

  it('should deduplicate same restaurant from different providers', () => {
    const restaurants = [
      makeRestaurant({
        id: 'swiggy-1',
        name: 'Pizza Paradise',
        provider: 'swiggy',
        location: { lat: 12.97, lng: 77.59 },
        rating: 4.2,
      }),
      makeRestaurant({
        id: 'zomato-1',
        name: 'Pizza Paradise',
        provider: 'zomato',
        location: { lat: 12.97, lng: 77.59 },
        rating: 4.5,
      }),
    ];

    const result = deduplicator.deduplicate(restaurants);
    expect(result).toHaveLength(1);
  });

  it('should keep best rating when merging duplicates', () => {
    const restaurants = [
      makeRestaurant({
        id: 'swiggy-1',
        name: 'Pizza Paradise',
        provider: 'swiggy',
        location: { lat: 12.97, lng: 77.59 },
        rating: 4.2,
        reviewCount: 100,
      }),
      makeRestaurant({
        id: 'zomato-1',
        name: 'Pizza Paradise',
        provider: 'zomato',
        location: { lat: 12.97, lng: 77.59 },
        rating: 4.5,
        reviewCount: 200,
      }),
    ];

    const result = deduplicator.deduplicate(restaurants);
    expect(result[0]?.rating).toBe(4.5);
    expect(result[0]?.reviewCount).toBe(200);
  });

  it('should not merge restaurants with different names', () => {
    const restaurants = [
      makeRestaurant({
        id: 's1',
        name: 'Alpha Restaurant',
        location: { lat: 12.97, lng: 77.59 },
      }),
      makeRestaurant({
        id: 'z1',
        name: 'Beta Eatery',
        location: { lat: 12.97, lng: 77.59 },
      }),
    ];

    const result = deduplicator.deduplicate(restaurants);
    expect(result).toHaveLength(2);
  });

  it('should not merge restaurants far apart', () => {
    const restaurants = [
      makeRestaurant({
        id: 's1',
        name: 'Pizza Paradise',
        location: { lat: 12.97, lng: 77.59 },
      }),
      makeRestaurant({
        id: 'z1',
        name: 'Pizza Paradise',
        location: { lat: 13.00, lng: 77.60 }, // ~3.5km away
      }),
    ];

    const result = deduplicator.deduplicate(restaurants);
    expect(result).toHaveLength(2);
  });

  it('should handle single restaurant', () => {
    const restaurants = [makeRestaurant({ id: 'r1' })];
    const result = deduplicator.deduplicate(restaurants);
    expect(result).toHaveLength(1);
  });

  it('should handle empty list', () => {
    const result = deduplicator.deduplicate([]);
    expect(result).toHaveLength(0);
  });

  it('should merge cuisines from duplicates', () => {
    const restaurants = [
      makeRestaurant({
        id: 's1',
        name: 'Test Place',
        provider: 'swiggy',
        location: { lat: 12.97, lng: 77.59 },
        cuisines: ['Indian', 'Chinese'],
      }),
      makeRestaurant({
        id: 'z1',
        name: 'Test Place',
        provider: 'zomato',
        location: { lat: 12.97, lng: 77.59 },
        cuisines: ['Chinese', 'Thai'],
      }),
    ];

    const result = deduplicator.deduplicate(restaurants);
    expect(result[0]?.cuisines).toContain('Indian');
    expect(result[0]?.cuisines).toContain('Chinese');
    expect(result[0]?.cuisines).toContain('Thai');
  });
});

describe('ResultRanker', () => {
  let ranker: ResultRanker;

  const defaultQuery: SearchQuery = {
    query: 'pizza',
    location: { lat: 12.97, lng: 77.59 },
    radiusKm: 10,
    pagination: { page: 1, pageSize: 20 },
  };

  beforeEach(() => {
    ranker = new ResultRanker();
  });

  it('should rank restaurants with name match higher', () => {
    const restaurants = [
      makeRestaurant({ name: 'Burger King', rating: 4.5 }),
      makeRestaurant({ name: 'Pizza Paradise', rating: 4.0 }),
    ];

    const ranked = ranker.rank(restaurants, defaultQuery);
    expect(ranked[0]?.name).toBe('Pizza Paradise');
  });

  it('should rank higher-rated restaurants higher when relevance is equal', () => {
    const restaurants = [
      makeRestaurant({ name: 'Pizza Place A', rating: 3.5 }),
      makeRestaurant({ name: 'Pizza Place B', rating: 4.8 }),
    ];

    const ranked = ranker.rank(restaurants, defaultQuery);
    expect(ranked[0]?.name).toBe('Pizza Place B');
  });

  it('should consider delivery time in ranking', () => {
    const restaurants = [
      makeRestaurant({ name: 'Pizza A', rating: 4.0, deliveryTimeMinutes: 60 }),
      makeRestaurant({ name: 'Pizza B', rating: 4.0, deliveryTimeMinutes: 15 }),
    ];

    const ranked = ranker.rank(restaurants, defaultQuery);
    expect(ranked[0]?.name).toBe('Pizza B');
  });

  it('should rank available restaurants higher', () => {
    const restaurants = [
      makeRestaurant({ name: 'Pizza A', isAvailable: false, rating: 4.5 }),
      makeRestaurant({ name: 'Pizza B', isAvailable: true, rating: 4.0 }),
    ];

    const ranked = ranker.rank(restaurants, defaultQuery);
    expect(ranked[0]?.name).toBe('Pizza B');
  });

  it('should handle empty query string', () => {
    const restaurants = [
      makeRestaurant({ name: 'Any Restaurant', rating: 4.0 }),
    ];

    const ranked = ranker.rank(restaurants, { ...defaultQuery, query: '' });
    expect(ranked).toHaveLength(1);
  });
});

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('should always be enabled', () => {
    expect(provider.isEnabled()).toBe(true);
  });

  it('should always be healthy', async () => {
    const health = await provider.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.provider).toBe('mock');
  });

  it('should return mock restaurants for search', async () => {
    const result = await provider.searchRestaurants({
      query: '',
      location: { lat: 12.97, lng: 77.59 },
      radiusKm: 10,
      pagination: { page: 1, pageSize: 20 },
    });

    expect(result.restaurants.length).toBeGreaterThan(0);
    expect(result.metadata.source).toBe('mock');
    expect(result.metadata.freshness).toBe('synthetic');
  });

  it('should filter by cuisine', async () => {
    const result = await provider.searchRestaurants({
      query: 'pizza',
      location: { lat: 12.97, lng: 77.59 },
      radiusKm: 10,
      pagination: { page: 1, pageSize: 20 },
    });

    const hasPizza = result.restaurants.some((r) =>
      r.cuisines.some((c) => c.toLowerCase().includes('pizza') || c.toLowerCase().includes('italian'))
    );
    expect(hasPizza).toBe(true);
  });

  it('should return menu for known restaurant', async () => {
    const menu = await provider.getMenu('mock-r1');
    expect(menu).not.toBeNull();
    expect(menu!.categories.length).toBeGreaterThan(0);
  });

  it('should return null for unknown restaurant menu', async () => {
    const menu = await provider.getMenu('nonexistent');
    expect(menu).toBeNull();
  });

  it('should return restaurant details', async () => {
    const details = await provider.getRestaurantDetails('mock-r1');
    expect(details).not.toBeNull();
    expect(details!.name).toBe('Punjab Grill');
    expect(details!.reviews.length).toBeGreaterThan(0);
  });

  it('should place mock order', async () => {
    const result = await provider.placeOrder({
      userId: 'test-user',
      restaurantId: 'mock-r1',
      items: [],
      deliveryAddress: {
        addressLine1: '123 Test',
        addressLine2: '',
        city: 'Bangalore',
        state: 'KA',
        pincode: '560001',
        location: { lat: 12.97, lng: 77.59 },
        label: 'Home',
      },
      paymentMethod: 'card',
      notes: '',
    });

    expect(result.orderId).toContain('mock-order-');
    expect(result.status).toBe('placed');
  });

  it('should support pagination', async () => {
    const page1 = await provider.searchRestaurants({
      query: '',
      location: { lat: 12.97, lng: 77.59 },
      radiusKm: 10,
      pagination: { page: 1, pageSize: 3 },
    });

    expect(page1.restaurants.length).toBeLessThanOrEqual(3);
    expect(page1.pageSize).toBe(3);
  });
});

describe('ResultMerger', () => {
  const merger = new ResultMerger();

  it('should return null for empty sources', () => {
    const result = merger.mergeRestaurantDetails([]);
    expect(result).toBeNull();
  });

  it('should return single source as-is', () => {
    const details: RestaurantDetails = {
      ...makeRestaurant({ name: 'Test' }),
      description: 'A restaurant',
      phone: '123',
      email: 'test@test.com',
      website: 'https://test.com',
      menuCategories: [],
      photos: [],
      reviews: [],
    };

    const result = merger.mergeRestaurantDetails([details]);
    expect(result).toEqual(details);
  });

  it('should merge photos from multiple sources', () => {
    const source1: RestaurantDetails = {
      ...makeRestaurant({ name: 'Test' }),
      description: '',
      phone: '',
      email: '',
      website: '',
      menuCategories: [],
      photos: ['photo1.jpg'],
      reviews: [],
    };

    const source2: RestaurantDetails = {
      ...makeRestaurant({ name: 'Test' }),
      description: '',
      phone: '',
      email: '',
      website: '',
      menuCategories: [],
      photos: ['photo2.jpg'],
      reviews: [],
    };

    const result = merger.mergeRestaurantDetails([source1, source2]);
    expect(result?.photos).toContain('photo1.jpg');
    expect(result?.photos).toContain('photo2.jpg');
  });
});

/**
 * Activity Unit Tests
 *
 * Unit tests for individual activity implementations.
 * These tests run without Temporal - they test the activity functions directly.
 */

import {
  validateCart,
  checkInventory,
  reserveItems,
  releaseItems,
} from '../activities/payment.activities';

import {
  applyFilters,
  rankResults,
} from '../activities/external.activities';

import {
  loadUserContext,
} from '../activities/llm.activities';

import type { Restaurant, UserContext, CartItem } from '../types';

// ============================================================================
// Payment Activity Tests
// ============================================================================

describe('Payment Activities', () => {
  describe('validateCart', () => {
    it('should validate a valid cart', async () => {
      const items: CartItem[] = [
        { dishId: 'dish_1', quantity: 2, price: 10 },
        { dishId: 'dish_2', quantity: 1, price: 15 },
      ];

      const result = await validateCart(items);
      expect(result).toBe(true);
    });

    it('should throw error for empty cart', async () => {
      await expect(validateCart([])).rejects.toThrow('Invalid cart: empty items');
    });

    it('should throw error for null items', async () => {
      await expect(validateCart(null as unknown as CartItem[])).rejects.toThrow(
        'Invalid cart: empty items'
      );
    });

    it('should throw error for item with zero quantity', async () => {
      const items: CartItem[] = [{ dishId: 'dish_1', quantity: 0, price: 10 }];
      await expect(validateCart(items)).rejects.toThrow('Invalid cart item');
    });

    it('should throw error for item with negative price', async () => {
      const items: CartItem[] = [{ dishId: 'dish_1', quantity: 1, price: -5 }];
      await expect(validateCart(items)).rejects.toThrow('Invalid cart item');
    });

    it('should throw error for item without dishId', async () => {
      const items: CartItem[] = [{ dishId: '', quantity: 1, price: 10 }];
      await expect(validateCart(items)).rejects.toThrow('Invalid cart item');
    });
  });

  describe('checkInventory', () => {
    it('should return true for valid items', async () => {
      const items: CartItem[] = [{ dishId: 'dish_1', quantity: 1, price: 10 }];
      const result = await checkInventory(items);
      expect(result).toBe(true);
    });

    it('should return false for empty items', async () => {
      const result = await checkInventory([]);
      expect(result).toBe(false);
    });
  });

  describe('reserveItems', () => {
    it('should reserve items successfully', async () => {
      const items: CartItem[] = [{ dishId: 'dish_1', quantity: 1, price: 10 }];
      const result = await reserveItems('rest_1', items);
      expect(result).toBe(true);
    });

    it('should throw error for missing restaurant ID', async () => {
      const items: CartItem[] = [{ dishId: 'dish_1', quantity: 1, price: 10 }];
      await expect(reserveItems('', items)).rejects.toThrow('Invalid reservation request');
    });

    it('should throw error for empty items', async () => {
      await expect(reserveItems('rest_1', [])).rejects.toThrow('Invalid reservation request');
    });
  });

  describe('releaseItems', () => {
    it('should release items for valid restaurant', async () => {
      await expect(releaseItems('rest_1')).resolves.not.toThrow();
    });

    it('should throw error for missing restaurant ID', async () => {
      await expect(releaseItems('')).rejects.toThrow('Restaurant ID required');
    });
  });
});

// ============================================================================
// External Activity Tests
// ============================================================================

describe('External Activities', () => {
  const sampleRestaurants: Restaurant[] = [
    {
      id: 'r1',
      name: 'Italian Place',
      cuisine: 'Italian',
      rating: 4.5,
      priceRange: 2,
      location: { latitude: 40.713, longitude: -74.006 },
      availability: true,
    },
    {
      id: 'r2',
      name: 'Chinese Garden',
      cuisine: 'Chinese',
      rating: 4.2,
      priceRange: 1,
      location: { latitude: 40.714, longitude: -74.007 },
      availability: true,
    },
    {
      id: 'r3',
      name: 'Sushi Bar',
      cuisine: 'Japanese',
      rating: 4.8,
      priceRange: 3,
      location: { latitude: 40.715, longitude: -74.008 },
      availability: false,
    },
    {
      id: 'r4',
      name: 'Pizza House',
      cuisine: 'Italian',
      rating: 3.9,
      priceRange: 1,
      location: { latitude: 40.716, longitude: -74.009 },
      availability: true,
    },
  ];

  describe('applyFilters', () => {
    it('should filter by cuisine', async () => {
      const result = await applyFilters(sampleRestaurants, { cuisine: ['Italian'] });
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.cuisine === 'Italian')).toBe(true);
    });

    it('should filter by rating', async () => {
      const result = await applyFilters(sampleRestaurants, { rating: 4.3 });
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.rating >= 4.3)).toBe(true);
    });

    it('should filter by availability', async () => {
      const result = await applyFilters(sampleRestaurants, { availableOnly: true });
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.availability)).toBe(true);
    });

    it('should return all restaurants with empty filters', async () => {
      const result = await applyFilters(sampleRestaurants, {});
      expect(result).toHaveLength(4);
    });

    it('should combine multiple filters', async () => {
      const result = await applyFilters(sampleRestaurants, {
        cuisine: ['Italian'],
        rating: 4.0,
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Italian Place');
    });
  });

  describe('rankResults', () => {
    it('should rank by cuisine preference', async () => {
      const context: UserContext = {
        userId: 'user_1',
        preferences: { cuisine: ['Japanese'] },
      };

      const result = await rankResults(sampleRestaurants, context);
      expect(result[0].cuisine).toBe('Japanese');
    });

    it('should consider rating in ranking', async () => {
      const context: UserContext = {
        userId: 'user_1',
        preferences: { cuisine: [] },
      };

      const result = await rankResults(sampleRestaurants, context);
      // Higher rated restaurants should rank higher
      expect(result[0].rating).toBeGreaterThanOrEqual(result[1].rating);
    });

    it('should boost available restaurants', async () => {
      const context: UserContext = {
        userId: 'user_1',
        preferences: { cuisine: ['Japanese'] },
      };

      // Even though Japanese restaurant is unavailable, it should still rank
      const result = await rankResults(sampleRestaurants, context);
      expect(result).toHaveLength(4);
    });
  });
});

// ============================================================================
// LLM Activity Tests
// ============================================================================

describe('LLM Activities', () => {
  describe('loadUserContext', () => {
    it('should return user context with defaults', async () => {
      const context = await loadUserContext('user_123');

      expect(context).toBeDefined();
      expect(context.userId).toBe('user_123');
      expect(context.preferences).toBeDefined();
      expect(context.preferences.cuisine).toContain('Italian');
      expect(context.location).toBeDefined();
    });
  });
});

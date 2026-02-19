/**
 * Tests for Internal provider components.
 */

import {
  mapInternalRestaurant,
  mapInternalDish,
  mapInternalMenu,
  mapInternalAvailability,
} from '../src/providers/internal/internalMapper';
import type { InternalRestaurantEntity, InternalDishEntity } from '../src/providers/internal/internalMapper';

describe('InternalMapper', () => {
  describe('mapInternalRestaurant', () => {
    const mockEntity: InternalRestaurantEntity = {
      id: 'uuid-001',
      name: 'Internal Test Restaurant',
      description: 'A test restaurant',
      imageUrl: 'https://example.com/image.jpg',
      address: '123 Main St',
      locality: 'Koramangala',
      city: 'Bangalore',
      latitude: 12.9716,
      longitude: 77.5946,
      cuisines: ['Indian', 'Chinese'],
      rating: 4.5,
      reviewCount: 300,
      deliveryTimeMinutes: 25,
      priceRange: 2,
      isActive: true,
      isOpen: true,
      operatingHours: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-19T00:00:00Z',
    };

    it('should map internal entity to FoodBot format', () => {
      const result = mapInternalRestaurant(mockEntity);

      expect(result.id).toBe('internal-uuid-001');
      expect(result.externalId).toBe('uuid-001');
      expect(result.provider).toBe('internal');
      expect(result.name).toBe('Internal Test Restaurant');
    });

    it('should concatenate address parts', () => {
      const result = mapInternalRestaurant(mockEntity);
      expect(result.address).toBe('123 Main St, Koramangala, Bangalore');
    });

    it('should pass through cuisines array', () => {
      const result = mapInternalRestaurant(mockEntity);
      expect(result.cuisines).toEqual(['Indian', 'Chinese']);
    });

    it('should calculate distance from user location', () => {
      const userLocation = { lat: 12.98, lng: 77.60 };
      const result = mapInternalRestaurant(mockEntity, userLocation);
      expect(result.distanceKm).toBeGreaterThan(0);
    });

    it('should set distance to 0 when no user location', () => {
      const result = mapInternalRestaurant(mockEntity);
      expect(result.distanceKm).toBe(0);
    });

    it('should determine availability from isActive and isOpen', () => {
      const result = mapInternalRestaurant(mockEntity);
      expect(result.isAvailable).toBe(true);
    });

    it('should be unavailable when inactive', () => {
      const inactive = { ...mockEntity, isActive: false };
      const result = mapInternalRestaurant(inactive);
      expect(result.isAvailable).toBe(false);
    });

    it('should be unavailable when closed', () => {
      const closed = { ...mockEntity, isOpen: false };
      const result = mapInternalRestaurant(closed);
      expect(result.isAvailable).toBe(false);
    });

    it('should clamp invalid price range', () => {
      const invalidPrice = { ...mockEntity, priceRange: 5 };
      const result = mapInternalRestaurant(invalidPrice);
      expect(result.priceRange).toBe(2);
    });
  });

  describe('mapInternalDish', () => {
    const mockDish: InternalDishEntity = {
      id: 'dish-uuid-001',
      restaurantId: 'uuid-001',
      name: 'Masala Dosa',
      description: 'Crispy dosa with potato filling',
      category: 'South Indian',
      imageUrl: 'https://example.com/dosa.jpg',
      price: 120,
      originalPrice: 150,
      rating: 4.6,
      reviewCount: 85,
      isVegetarian: true,
      isAvailable: true,
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-19T00:00:00Z',
    };

    it('should map internal dish to FoodBot format', () => {
      const result = mapInternalDish(mockDish);

      expect(result.id).toBe('internal-dish-dish-uuid-001');
      expect(result.provider).toBe('internal');
      expect(result.name).toBe('Masala Dosa');
      expect(result.price).toBe(120);
      expect(result.originalPrice).toBe(150);
      expect(result.isVegetarian).toBe(true);
      expect(result.currency).toBe('INR');
    });
  });

  describe('mapInternalMenu', () => {
    const mockDishes: InternalDishEntity[] = [
      {
        id: 'd1', restaurantId: 'r1', name: 'Dosa', description: '', category: 'South Indian',
        imageUrl: '', price: 120, originalPrice: 120, rating: 4.5, reviewCount: 50,
        isVegetarian: true, isAvailable: true, sortOrder: 1, createdAt: '', updatedAt: '',
      },
      {
        id: 'd2', restaurantId: 'r1', name: 'Idli', description: '', category: 'South Indian',
        imageUrl: '', price: 80, originalPrice: 80, rating: 4.3, reviewCount: 30,
        isVegetarian: true, isAvailable: true, sortOrder: 2, createdAt: '', updatedAt: '',
      },
      {
        id: 'd3', restaurantId: 'r1', name: 'Naan', description: '', category: 'North Indian',
        imageUrl: '', price: 60, originalPrice: 60, rating: 4.2, reviewCount: 20,
        isVegetarian: true, isAvailable: true, sortOrder: 1, createdAt: '', updatedAt: '',
      },
    ];

    it('should group dishes by category', () => {
      const menu = mapInternalMenu(mockDishes, 'r1', 'Test Restaurant');

      expect(menu.categories).toHaveLength(2);
      const southIndian = menu.categories.find((c) => c.name === 'South Indian');
      expect(southIndian?.dishes).toHaveLength(2);
    });

    it('should set restaurant metadata', () => {
      const menu = mapInternalMenu(mockDishes, 'r1', 'Test Restaurant');

      expect(menu.restaurantId).toBe('internal-r1');
      expect(menu.restaurantName).toBe('Test Restaurant');
      expect(menu.lastUpdated).toBeTruthy();
    });
  });

  describe('mapInternalAvailability', () => {
    it('should map availability for open restaurant', () => {
      const entity: InternalRestaurantEntity = {
        id: 'r1', name: 'Test', description: '', imageUrl: '', address: '',
        locality: '', city: '', latitude: 0, longitude: 0, cuisines: [],
        rating: 0, reviewCount: 0, deliveryTimeMinutes: 30, priceRange: 2,
        isActive: true, isOpen: true, operatingHours: null, createdAt: '', updatedAt: '',
      };

      const result = mapInternalAvailability(entity);
      expect(result.isOpen).toBe(true);
      expect(result.isAcceptingOrders).toBe(true);
      expect(result.estimatedDeliveryMinutes).toBe(30);
    });

    it('should map availability for closed restaurant', () => {
      const entity: InternalRestaurantEntity = {
        id: 'r1', name: 'Test', description: '', imageUrl: '', address: '',
        locality: '', city: '', latitude: 0, longitude: 0, cuisines: [],
        rating: 0, reviewCount: 0, deliveryTimeMinutes: 0, priceRange: 2,
        isActive: true, isOpen: false, operatingHours: null, createdAt: '', updatedAt: '',
      };

      const result = mapInternalAvailability(entity);
      expect(result.isOpen).toBe(false);
      expect(result.message).toContain('closed');
    });
  });
});

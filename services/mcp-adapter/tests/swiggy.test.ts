/**
 * Tests for Swiggy provider components.
 */

import { mapSwiggyRestaurant, mapSwiggyDish, mapSwiggyAvailability } from '../src/providers/swiggy/swiggyMapper';
import type { SwiggyRestaurantInfo, SwiggyDishInfo } from '../src/types/swiggy.types';

describe('SwiggyMapper', () => {
  describe('mapSwiggyRestaurant', () => {
    const mockRestaurantInfo: SwiggyRestaurantInfo = {
      id: '12345',
      name: 'Test Restaurant',
      cloudinaryImageId: 'abc123',
      locality: 'Koramangala',
      areaName: '5th Block',
      costForTwo: 'Rs. 400 for two',
      cuisines: ['North Indian', 'Chinese'],
      avgRating: 4.3,
      totalRatingsString: '1K+ ratings',
      sla: {
        deliveryTime: 35,
        lastMileTravel: 2.5,
        serviceability: 'SERVICEABLE',
        slaString: '35 mins',
        lastMileTravelString: '2.5 km',
        iconType: 'ICON_TYPE_EMPTY',
      },
      isOpen: true,
      availability: {
        nextCloseTime: '2026-02-19T23:00:00.000Z',
        opened: true,
      },
      aggregatedDiscountInfoV3: {
        header: '60% OFF',
        subHeader: 'UPTO Rs. 120',
      },
    };

    it('should map Swiggy restaurant to FoodBot format', () => {
      const result = mapSwiggyRestaurant(mockRestaurantInfo);

      expect(result.id).toBe('swiggy-12345');
      expect(result.externalId).toBe('12345');
      expect(result.provider).toBe('swiggy');
      expect(result.name).toBe('Test Restaurant');
      expect(result.cuisines).toEqual(['North Indian', 'Chinese']);
      expect(result.rating).toBe(4.3);
      expect(result.deliveryTimeMinutes).toBe(35);
      expect(result.isOpen).toBe(true);
      expect(result.isAvailable).toBe(true);
    });

    it('should parse review count from string', () => {
      const result = mapSwiggyRestaurant(mockRestaurantInfo);
      expect(result.reviewCount).toBe(1000);
    });

    it('should parse price range from costForTwo', () => {
      const result = mapSwiggyRestaurant(mockRestaurantInfo);
      expect(result.priceRange).toBe(2);
    });

    it('should construct image URL from cloudinaryImageId', () => {
      const result = mapSwiggyRestaurant(mockRestaurantInfo);
      expect(result.imageUrl).toContain('abc123');
      expect(result.imageUrl).toContain('swiggy.com');
    });

    it('should parse offers from discount info', () => {
      const result = mapSwiggyRestaurant(mockRestaurantInfo);
      expect(result.offers).toHaveLength(1);
      expect(result.offers[0]?.title).toBe('60% OFF');
      expect(result.offers[0]?.discountPercent).toBe(60);
      expect(result.offers[0]?.maxDiscount).toBe(120);
    });

    it('should handle missing discount info', () => {
      const noDiscount = { ...mockRestaurantInfo, aggregatedDiscountInfoV3: undefined };
      const result = mapSwiggyRestaurant(noDiscount);
      expect(result.offers).toHaveLength(0);
    });

    it('should mark unavailable when not serviceable', () => {
      const notServiceable = {
        ...mockRestaurantInfo,
        sla: { ...mockRestaurantInfo.sla, serviceability: 'NOT_SERVICEABLE' },
      };
      const result = mapSwiggyRestaurant(notServiceable);
      expect(result.isAvailable).toBe(false);
    });

    it('should mark unavailable when closed', () => {
      const closed = { ...mockRestaurantInfo, isOpen: false };
      const result = mapSwiggyRestaurant(closed);
      expect(result.isOpen).toBe(false);
      expect(result.isAvailable).toBe(false);
    });

    it('should use user location when provided', () => {
      const location = { lat: 12.97, lng: 77.59 };
      const result = mapSwiggyRestaurant(mockRestaurantInfo, location);
      expect(result.location).toEqual(location);
    });

    it('should handle high-value costForTwo as price range 4', () => {
      const expensive = { ...mockRestaurantInfo, costForTwo: 'Rs. 1200 for two' };
      const result = mapSwiggyRestaurant(expensive);
      expect(result.priceRange).toBe(4);
    });

    it('should handle low-value costForTwo as price range 1', () => {
      const cheap = { ...mockRestaurantInfo, costForTwo: 'Rs. 150 for two' };
      const result = mapSwiggyRestaurant(cheap);
      expect(result.priceRange).toBe(1);
    });
  });

  describe('mapSwiggyDish', () => {
    const mockDishInfo: SwiggyDishInfo = {
      id: 'dish-001',
      name: 'Butter Chicken',
      category: 'Main Course',
      description: 'Rich and creamy butter chicken',
      imageId: 'dish-img-001',
      inStock: 1,
      price: 35000,
      defaultPrice: 35000,
      ratings: {
        aggregatedRating: {
          rating: '4.5',
          ratingCount: '200',
          ratingCountV2: '200',
        },
      },
      isVeg: 0,
    };

    it('should map Swiggy dish to FoodBot format', () => {
      const result = mapSwiggyDish(mockDishInfo, '12345');

      expect(result.id).toBe('swiggy-dish-dish-001');
      expect(result.externalId).toBe('dish-001');
      expect(result.provider).toBe('swiggy');
      expect(result.name).toBe('Butter Chicken');
      expect(result.category).toBe('Main Course');
      expect(result.description).toBe('Rich and creamy butter chicken');
    });

    it('should convert price from paisa to rupees', () => {
      const result = mapSwiggyDish(mockDishInfo, '12345');
      expect(result.price).toBe(350);
      expect(result.originalPrice).toBe(350);
    });

    it('should parse rating correctly', () => {
      const result = mapSwiggyDish(mockDishInfo, '12345');
      expect(result.rating).toBe(4.5);
      expect(result.reviewCount).toBe(200);
    });

    it('should identify vegetarian dish', () => {
      const vegDish = { ...mockDishInfo, isVeg: 1 };
      const result = mapSwiggyDish(vegDish, '12345');
      expect(result.isVegetarian).toBe(true);
    });

    it('should identify non-vegetarian dish', () => {
      const result = mapSwiggyDish(mockDishInfo, '12345');
      expect(result.isVegetarian).toBe(false);
    });

    it('should mark dish as available when in stock', () => {
      const result = mapSwiggyDish(mockDishInfo, '12345');
      expect(result.isAvailable).toBe(true);
    });

    it('should mark dish as unavailable when out of stock', () => {
      const outOfStock = { ...mockDishInfo, inStock: 0 };
      const result = mapSwiggyDish(outOfStock, '12345');
      expect(result.isAvailable).toBe(false);
    });

    it('should set currency to INR', () => {
      const result = mapSwiggyDish(mockDishInfo, '12345');
      expect(result.currency).toBe('INR');
    });
  });

  describe('mapSwiggyAvailability', () => {
    it('should map open restaurant availability', () => {
      const info: SwiggyRestaurantInfo = {
        id: '12345',
        name: 'Test',
        cloudinaryImageId: '',
        locality: '',
        areaName: '',
        costForTwo: '',
        cuisines: [],
        avgRating: 0,
        totalRatingsString: '',
        sla: {
          deliveryTime: 30,
          lastMileTravel: 0,
          serviceability: 'SERVICEABLE',
          slaString: '',
          lastMileTravelString: '',
          iconType: '',
        },
        isOpen: true,
        availability: { nextCloseTime: '', opened: true },
      };

      const result = mapSwiggyAvailability(info);
      expect(result.restaurantId).toBe('swiggy-12345');
      expect(result.isOpen).toBe(true);
      expect(result.isAcceptingOrders).toBe(true);
      expect(result.estimatedDeliveryMinutes).toBe(30);
    });
  });
});

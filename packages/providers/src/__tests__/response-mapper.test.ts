import {
  mapSwiggyRestaurant,
  mapZomatoRestaurant,
  mapOndcCatalog,
  mapToInternalOrder,
} from '../mapping/response-mapper';
import type {
  SwiggyRawRestaurant,
  ZomatoRawRestaurant,
  OndcCatalogItem,
} from '../mapping/response-mapper';
import type { ProviderOrder } from '../types/provider.types';

describe('ResponseMapper', () => {
  describe('mapSwiggyRestaurant', () => {
    const rawSwiggy: SwiggyRawRestaurant = {
      restaurant_id: 'swg-123',
      restaurant_name: 'Biryani Palace',
      cuisine_types: ['Biryani', 'North Indian'],
      avg_rating: 4.3,
      delivery_eta_minutes: 35,
      min_order_value: 150,
      is_open: true,
      lat: 12.9716,
      lng: 77.5946,
    };

    it('should map Swiggy restaurant to standard format', () => {
      const result = mapSwiggyRestaurant(rawSwiggy);

      expect(result).toEqual({
        id: 'swg-123',
        name: 'Biryani Palace',
        cuisine: ['Biryani', 'North Indian'],
        rating: 4.3,
        deliveryTime: 35,
        minimumOrder: 150,
        isOpen: true,
        location: { latitude: 12.9716, longitude: 77.5946 },
      });
    });

    it('should handle closed restaurant', () => {
      const closedRaw = { ...rawSwiggy, is_open: false };
      const result = mapSwiggyRestaurant(closedRaw);
      expect(result.isOpen).toBe(false);
    });

    it('should preserve all cuisine types', () => {
      const multiCuisine = {
        ...rawSwiggy,
        cuisine_types: ['Indian', 'Chinese', 'Thai', 'Mexican'],
      };
      const result = mapSwiggyRestaurant(multiCuisine);
      expect(result.cuisine).toEqual(['Indian', 'Chinese', 'Thai', 'Mexican']);
    });
  });

  describe('mapZomatoRestaurant', () => {
    const rawZomato: ZomatoRawRestaurant = {
      res_id: 'zmt-456',
      name: 'Pizza Hub',
      cuisines: 'Italian, Pizza, Pasta',
      user_rating: { aggregate_rating: 4.5 },
      delivery_time: { estimated: 30 },
      minimum_order: 200,
      is_delivering: true,
      location: { latitude: 12.9352, longitude: 77.6245 },
    };

    it('should map Zomato restaurant to standard format', () => {
      const result = mapZomatoRestaurant(rawZomato);

      expect(result).toEqual({
        id: 'zmt-456',
        name: 'Pizza Hub',
        cuisine: ['Italian', 'Pizza', 'Pasta'],
        rating: 4.5,
        deliveryTime: 30,
        minimumOrder: 200,
        isOpen: true,
        location: { latitude: 12.9352, longitude: 77.6245 },
      });
    });

    it('should split comma-separated cuisines correctly', () => {
      const result = mapZomatoRestaurant(rawZomato);
      expect(result.cuisine).toHaveLength(3);
      expect(result.cuisine[0]).toBe('Italian');
      expect(result.cuisine[1]).toBe('Pizza');
      expect(result.cuisine[2]).toBe('Pasta');
    });

    it('should handle single cuisine', () => {
      const singleCuisine = { ...rawZomato, cuisines: 'Indian' };
      const result = mapZomatoRestaurant(singleCuisine);
      expect(result.cuisine).toEqual(['Indian']);
    });

    it('should map is_delivering to isOpen', () => {
      const notDelivering = { ...rawZomato, is_delivering: false };
      const result = mapZomatoRestaurant(notDelivering);
      expect(result.isOpen).toBe(false);
    });
  });

  describe('mapOndcCatalog', () => {
    const rawOndc: OndcCatalogItem = {
      provider_id: 'ondc-789',
      provider_name: 'Meal Express',
      categories: ['Thali', 'South Indian'],
      rating_value: 4.1,
      fulfillment_time: 25,
      min_order_amount: 100,
      store_open: true,
      gps: '12.9716,77.5946',
    };

    it('should map ONDC catalog item to standard format', () => {
      const result = mapOndcCatalog(rawOndc);

      expect(result).toEqual({
        id: 'ondc-789',
        name: 'Meal Express',
        cuisine: ['Thali', 'South Indian'],
        rating: 4.1,
        deliveryTime: 25,
        minimumOrder: 100,
        isOpen: true,
        location: { latitude: 12.9716, longitude: 77.5946 },
      });
    });

    it('should parse GPS coordinates correctly', () => {
      const result = mapOndcCatalog(rawOndc);
      expect(result.location.latitude).toBeCloseTo(12.9716);
      expect(result.location.longitude).toBeCloseTo(77.5946);
    });

    it('should handle closed store', () => {
      const closed = { ...rawOndc, store_open: false };
      const result = mapOndcCatalog(closed);
      expect(result.isOpen).toBe(false);
    });
  });

  describe('mapToInternalOrder', () => {
    const providerOrder: ProviderOrder = {
      id: 'ord-001',
      status: 'placed',
      items: [
        { menuItemId: 'item-1', name: 'Chicken Biryani', quantity: 2, price: 280 },
      ],
      total: 560,
      estimatedDelivery: 35,
      trackingUrl: 'https://example.com/track/ord-001',
    };

    it('should map to internal order with provider name', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = mapToInternalOrder(providerOrder, 'swiggy');

      expect(result.providerName).toBe('swiggy');
      expect(result.id).toBe('ord-001');
      expect(result.status).toBe('placed');
      expect(result.items).toEqual(providerOrder.items);
      expect(result.total).toBe(560);
      expect(result.createdAt).toBe(now);
    });

    it('should preserve all order fields', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);

      const result = mapToInternalOrder(providerOrder, 'zomato');

      expect(result.estimatedDelivery).toBe(35);
      expect(result.trackingUrl).toBe('https://example.com/track/ord-001');
    });

    it('should set correct provider name for each provider', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);

      const swiggyOrder = mapToInternalOrder(providerOrder, 'swiggy');
      const zomatoOrder = mapToInternalOrder(providerOrder, 'zomato');
      const ondcOrder = mapToInternalOrder(providerOrder, 'ondc');

      expect(swiggyOrder.providerName).toBe('swiggy');
      expect(zomatoOrder.providerName).toBe('zomato');
      expect(ondcOrder.providerName).toBe('ondc');
    });
  });
});

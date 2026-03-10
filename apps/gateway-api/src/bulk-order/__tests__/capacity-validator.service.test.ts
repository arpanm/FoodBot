import { BadRequestException } from '@nestjs/common';

import {
  CapacityValidatorService,
  ItemCapacityInput,
} from '../capacity-validator.service';

describe('CapacityValidatorService', () => {
  let service: CapacityValidatorService;

  beforeEach(() => {
    service = new CapacityValidatorService();
  });

  describe('validateCapacity', () => {
    it('should return available for items within capacity', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 50 },
        { restaurantId: 'rest-1', dishId: 'dish-2', quantity: 30 },
      ];

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(true);
      expect(result.totalQuantity).toBe(80);
      expect(result.maxCapacity).toBe(200);
      expect(result.uniqueDishes).toBe(2);
      expect(result.maxUniqueDishes).toBe(20);
      expect(result.reason).toBeNull();
    });

    it('should return unavailable when exceeding max items', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 150 },
        { restaurantId: 'rest-1', dishId: 'dish-2', quantity: 100 },
      ];

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(false);
      expect(result.totalQuantity).toBe(250);
      expect(result.reason).toContain('Exceeds max capacity');
    });

    it('should return unavailable when exceeding unique dish limit', () => {
      const items: ItemCapacityInput[] = [];
      for (let i = 0; i < 25; i++) {
        items.push({
          restaurantId: 'rest-1',
          dishId: `dish-${i}`,
          quantity: 5,
        });
      }

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(false);
      expect(result.uniqueDishes).toBe(25);
      expect(result.reason).toContain('Exceeds max');
      expect(result.reason).toContain('unique dishes');
    });

    it('should only check items for the specified restaurant', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 50 },
        { restaurantId: 'rest-2', dishId: 'dish-2', quantity: 300 },
      ];

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(true);
      expect(result.totalQuantity).toBe(50);
    });

    it('should handle empty items', () => {
      const result = service.validateCapacity('rest-1', []);

      expect(result.isAvailable).toBe(true);
      expect(result.totalQuantity).toBe(0);
      expect(result.uniqueDishes).toBe(0);
      expect(result.reason).toBeNull();
    });

    it('should return both reasons when both limits exceeded', () => {
      const items: ItemCapacityInput[] = [];
      for (let i = 0; i < 25; i++) {
        items.push({
          restaurantId: 'rest-1',
          dishId: `dish-${i}`,
          quantity: 10,
        });
      }

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(false);
      expect(result.totalQuantity).toBe(250);
      expect(result.uniqueDishes).toBe(25);
      expect(result.reason).toContain('Exceeds max capacity');
      expect(result.reason).toContain('unique dishes');
    });

    it('should return available at exact capacity limit', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 200 },
      ];

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(true);
      expect(result.totalQuantity).toBe(200);
    });

    it('should return available at exact unique dish limit', () => {
      const items: ItemCapacityInput[] = [];
      for (let i = 0; i < 20; i++) {
        items.push({
          restaurantId: 'rest-1',
          dishId: `dish-${i}`,
          quantity: 5,
        });
      }

      const result = service.validateCapacity('rest-1', items);

      expect(result.isAvailable).toBe(true);
      expect(result.uniqueDishes).toBe(20);
    });
  });

  describe('checkAvailability', () => {
    it('should check all unique restaurants', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 10 },
        { restaurantId: 'rest-2', dishId: 'dish-2', quantity: 20 },
        { restaurantId: 'rest-1', dishId: 'dish-3', quantity: 15 },
      ];

      const results = service.checkAvailability(items);

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.restaurantId === 'rest-1')).toBeDefined();
      expect(results.find((r) => r.restaurantId === 'rest-2')).toBeDefined();
    });

    it('should return empty array for no items', () => {
      const results = service.checkAvailability([]);
      expect(results).toHaveLength(0);
    });

    it('should return individual results per restaurant', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 50 },
        { restaurantId: 'rest-2', dishId: 'dish-2', quantity: 250 },
      ];

      const results = service.checkAvailability(items);

      const rest1 = results.find((r) => r.restaurantId === 'rest-1');
      const rest2 = results.find((r) => r.restaurantId === 'rest-2');

      expect(rest1?.isAvailable).toBe(true);
      expect(rest2?.isAvailable).toBe(false);
    });
  });

  describe('validateAllCapacity', () => {
    it('should not throw when all restaurants are within capacity', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 50 },
        { restaurantId: 'rest-2', dishId: 'dish-2', quantity: 30 },
      ];

      expect(() => service.validateAllCapacity(items)).not.toThrow();
    });

    it('should throw BadRequestException when any restaurant exceeds capacity', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-1', dishId: 'dish-1', quantity: 50 },
        { restaurantId: 'rest-2', dishId: 'dish-2', quantity: 250 },
      ];

      expect(() => service.validateAllCapacity(items)).toThrow(
        BadRequestException
      );
    });

    it('should include restaurant details in error message', () => {
      const items: ItemCapacityInput[] = [
        { restaurantId: 'rest-2', dishId: 'dish-1', quantity: 250 },
      ];

      expect(() => service.validateAllCapacity(items)).toThrow(
        /rest-2/
      );
    });

    it('should not throw for empty items', () => {
      expect(() => service.validateAllCapacity([])).not.toThrow();
    });
  });
});

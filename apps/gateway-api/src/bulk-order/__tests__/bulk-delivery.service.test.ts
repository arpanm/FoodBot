import { BadRequestException } from '@nestjs/common';

import { BulkDeliveryService } from '../bulk-delivery.service';

describe('BulkDeliveryService', () => {
  let service: BulkDeliveryService;

  beforeEach(() => {
    service = new BulkDeliveryService();
  });

  describe('validateDeliverySlot', () => {
    it('should accept a valid delivery slot 48 hours ahead at noon', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];

      expect(() =>
        service.validateDeliverySlot(dateStr, '12:00')
      ).not.toThrow();
    });

    it('should throw for delivery less than 24 hours ahead', () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 2);
      const dateStr = soonDate.toISOString().split('T')[0];
      const timeStr = `${String(soonDate.getHours()).padStart(2, '0')}:${String(soonDate.getMinutes()).padStart(2, '0')}`;

      expect(() =>
        service.validateDeliverySlot(dateStr, timeStr)
      ).toThrow(BadRequestException);
    });

    it('should throw for delivery before 8:00', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];

      expect(() =>
        service.validateDeliverySlot(dateStr, '06:00')
      ).toThrow(BadRequestException);
    });

    it('should throw for delivery at or after 22:00', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];

      expect(() =>
        service.validateDeliverySlot(dateStr, '22:00')
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid date format', () => {
      expect(() =>
        service.validateDeliverySlot('not-a-date', '12:00')
      ).toThrow(BadRequestException);
    });

    it('should accept delivery at 8:00', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];

      expect(() =>
        service.validateDeliverySlot(dateStr, '08:00')
      ).not.toThrow();
    });

    it('should accept delivery at 21:00', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];

      expect(() =>
        service.validateDeliverySlot(dateStr, '21:00')
      ).not.toThrow();
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should return 0 for zero restaurants', () => {
      expect(service.calculateDeliveryFee(0)).toBe(0);
    });

    it('should calculate fee for one restaurant', () => {
      // BASE_DELIVERY_FEE (10) + 1 * PER_RESTAURANT_FEE (5.99) = 15.99
      expect(service.calculateDeliveryFee(1)).toBe(15.99);
    });

    it('should calculate fee for multiple restaurants', () => {
      // 10 + 3 * 5.99 = 10 + 17.97 = 27.97
      expect(service.calculateDeliveryFee(3)).toBe(27.97);
    });

    it('should return 0 for negative restaurant count', () => {
      expect(service.calculateDeliveryFee(-1)).toBe(0);
    });
  });

  describe('estimateDeliveryTime', () => {
    it('should estimate delivery for single restaurant', () => {
      const result = service.estimateDeliveryTime(
        '2026-04-01',
        '12:00',
        1
      );

      // BASE (45) + 1 * PER_RESTAURANT (15) = 60 minutes
      expect(result.estimatedMinutes).toBe(60);
      expect(result.deliveryFee).toBe(15.99);
      expect(result.deliveryWindowStart).toBeDefined();
      expect(result.deliveryWindowEnd).toBeDefined();
    });

    it('should estimate delivery for multiple restaurants', () => {
      const result = service.estimateDeliveryTime(
        '2026-04-01',
        '12:00',
        3
      );

      // BASE (45) + 3 * PER_RESTAURANT (15) = 90 minutes
      expect(result.estimatedMinutes).toBe(90);
      expect(result.deliveryFee).toBe(27.97);
    });

    it('should calculate correct delivery window', () => {
      const result = service.estimateDeliveryTime(
        '2026-04-01',
        '12:00',
        1
      );

      const start = new Date(result.deliveryWindowStart);
      const end = new Date(result.deliveryWindowEnd);
      const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      expect(diffMinutes).toBe(60);
    });

    it('should handle zero restaurants', () => {
      const result = service.estimateDeliveryTime(
        '2026-04-01',
        '12:00',
        0
      );

      expect(result.estimatedMinutes).toBe(45);
      expect(result.deliveryFee).toBe(0);
    });
  });

  describe('getUniqueRestaurantCount', () => {
    it('should return unique count of restaurants', () => {
      const ids = ['rest-1', 'rest-2', 'rest-1', 'rest-3', 'rest-2'];
      expect(service.getUniqueRestaurantCount(ids)).toBe(3);
    });

    it('should return 0 for empty array', () => {
      expect(service.getUniqueRestaurantCount([])).toBe(0);
    });

    it('should return 1 for all same restaurant', () => {
      const ids = ['rest-1', 'rest-1', 'rest-1'];
      expect(service.getUniqueRestaurantCount(ids)).toBe(1);
    });
  });
});

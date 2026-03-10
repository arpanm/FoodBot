import { BadRequestException } from '@nestjs/common';

import { QuantityTier } from '../../entities/bulk-order-item.entity';
import { BulkPricingService } from '../bulk-pricing.service';

describe('BulkPricingService', () => {
  let service: BulkPricingService;

  beforeEach(() => {
    service = new BulkPricingService();
  });

  describe('getTierForQuantity', () => {
    it('should return STANDARD for quantity 1-9', () => {
      expect(service.getTierForQuantity(1)).toBe(QuantityTier.STANDARD);
      expect(service.getTierForQuantity(5)).toBe(QuantityTier.STANDARD);
      expect(service.getTierForQuantity(9)).toBe(QuantityTier.STANDARD);
    });

    it('should return BULK_10 for quantity 10-24', () => {
      expect(service.getTierForQuantity(10)).toBe(QuantityTier.BULK_10);
      expect(service.getTierForQuantity(15)).toBe(QuantityTier.BULK_10);
      expect(service.getTierForQuantity(24)).toBe(QuantityTier.BULK_10);
    });

    it('should return BULK_25 for quantity 25-49', () => {
      expect(service.getTierForQuantity(25)).toBe(QuantityTier.BULK_25);
      expect(service.getTierForQuantity(35)).toBe(QuantityTier.BULK_25);
      expect(service.getTierForQuantity(49)).toBe(QuantityTier.BULK_25);
    });

    it('should return BULK_50 for quantity 50-99', () => {
      expect(service.getTierForQuantity(50)).toBe(QuantityTier.BULK_50);
      expect(service.getTierForQuantity(75)).toBe(QuantityTier.BULK_50);
      expect(service.getTierForQuantity(99)).toBe(QuantityTier.BULK_50);
    });

    it('should return BULK_100 for quantity 100+', () => {
      expect(service.getTierForQuantity(100)).toBe(QuantityTier.BULK_100);
      expect(service.getTierForQuantity(500)).toBe(QuantityTier.BULK_100);
    });
  });

  describe('getTierDiscount', () => {
    it('should return 0% for standard tier (1-9)', () => {
      expect(service.getTierDiscount(1)).toBe(0);
      expect(service.getTierDiscount(9)).toBe(0);
    });

    it('should return 5% for bulk_10 tier (10-24)', () => {
      expect(service.getTierDiscount(10)).toBe(0.05);
      expect(service.getTierDiscount(24)).toBe(0.05);
    });

    it('should return 10% for bulk_25 tier (25-49)', () => {
      expect(service.getTierDiscount(25)).toBe(0.10);
      expect(service.getTierDiscount(49)).toBe(0.10);
    });

    it('should return 15% for bulk_50 tier (50-99)', () => {
      expect(service.getTierDiscount(50)).toBe(0.15);
      expect(service.getTierDiscount(99)).toBe(0.15);
    });

    it('should return 20% for bulk_100 tier (100+)', () => {
      expect(service.getTierDiscount(100)).toBe(0.20);
      expect(service.getTierDiscount(200)).toBe(0.20);
    });
  });

  describe('calculateBulkPrice', () => {
    it('should calculate standard price without discount', () => {
      const result = service.calculateBulkPrice(10, 5);

      expect(result.unitPrice).toBe(10);
      expect(result.quantity).toBe(5);
      expect(result.quantityTier).toBe(QuantityTier.STANDARD);
      expect(result.discountPercentage).toBe(0);
      expect(result.originalTotal).toBe(50);
      expect(result.discountedTotal).toBe(50);
      expect(result.savings).toBe(0);
    });

    it('should apply 5% discount for 10+ items', () => {
      const result = service.calculateBulkPrice(10, 15);

      expect(result.quantityTier).toBe(QuantityTier.BULK_10);
      expect(result.discountPercentage).toBe(5);
      expect(result.originalTotal).toBe(150);
      expect(result.discountedTotal).toBe(142.5);
      expect(result.savings).toBe(7.5);
    });

    it('should apply 10% discount for 25+ items', () => {
      const result = service.calculateBulkPrice(10, 30);

      expect(result.quantityTier).toBe(QuantityTier.BULK_25);
      expect(result.discountPercentage).toBe(10);
      expect(result.originalTotal).toBe(300);
      expect(result.discountedTotal).toBe(270);
      expect(result.savings).toBe(30);
    });

    it('should apply 15% discount for 50+ items', () => {
      const result = service.calculateBulkPrice(10, 50);

      expect(result.quantityTier).toBe(QuantityTier.BULK_50);
      expect(result.discountPercentage).toBe(15);
      expect(result.originalTotal).toBe(500);
      expect(result.discountedTotal).toBe(425);
      expect(result.savings).toBe(75);
    });

    it('should apply 20% discount for 100+ items', () => {
      const result = service.calculateBulkPrice(10, 100);

      expect(result.quantityTier).toBe(QuantityTier.BULK_100);
      expect(result.discountPercentage).toBe(20);
      expect(result.originalTotal).toBe(1000);
      expect(result.discountedTotal).toBe(800);
      expect(result.savings).toBe(200);
    });

    it('should handle fractional prices correctly', () => {
      const result = service.calculateBulkPrice(12.99, 25);

      expect(result.originalTotal).toBe(324.75);
      expect(result.discountedTotal).toBe(292.28);
      expect(result.savings).toBe(32.47);
    });
  });

  describe('validateMinimumOrder', () => {
    it('should not throw for valid item count', () => {
      expect(() => service.validateMinimumOrder(1)).not.toThrow();
      expect(() => service.validateMinimumOrder(100)).not.toThrow();
    });

    it('should throw BadRequestException for zero items', () => {
      expect(() => service.validateMinimumOrder(0)).toThrow(
        BadRequestException
      );
    });
  });

  describe('calculateTax', () => {
    it('should calculate 8% tax', () => {
      expect(service.calculateTax(100)).toBe(8);
      expect(service.calculateTax(250)).toBe(20);
    });

    it('should return 0 for zero subtotal', () => {
      expect(service.calculateTax(0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(service.calculateTax(33.33)).toBe(2.67);
    });
  });

  describe('getTaxRate', () => {
    it('should return 0.08', () => {
      expect(service.getTaxRate()).toBe(0.08);
    });
  });
});

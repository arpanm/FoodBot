import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { QuantityTier } from '../entities/bulk-order-item.entity';

const MINIMUM_BULK_ORDER_QUANTITY = 1;
const TAX_RATE = 0.08;

const TIER_THRESHOLDS: { tier: QuantityTier; minQuantity: number; discount: number }[] = [
  { tier: QuantityTier.BULK_100, minQuantity: 100, discount: 0.20 },
  { tier: QuantityTier.BULK_50, minQuantity: 50, discount: 0.15 },
  { tier: QuantityTier.BULK_25, minQuantity: 25, discount: 0.10 },
  { tier: QuantityTier.BULK_10, minQuantity: 10, discount: 0.05 },
  { tier: QuantityTier.STANDARD, minQuantity: 1, discount: 0 },
];

export interface BulkPriceResult {
  unitPrice: number;
  quantity: number;
  quantityTier: QuantityTier;
  discountPercentage: number;
  originalTotal: number;
  discountedTotal: number;
  savings: number;
}

@Injectable()
export class BulkPricingService {
  private readonly logger = new Logger(BulkPricingService.name);

  getTierForQuantity(quantity: number): QuantityTier {
    for (const threshold of TIER_THRESHOLDS) {
      if (quantity >= threshold.minQuantity) {
        return threshold.tier;
      }
    }
    return QuantityTier.STANDARD;
  }

  getTierDiscount(quantity: number): number {
    for (const threshold of TIER_THRESHOLDS) {
      if (quantity >= threshold.minQuantity) {
        return threshold.discount;
      }
    }
    return 0;
  }

  calculateBulkPrice(unitPrice: number, quantity: number): BulkPriceResult {
    const tier = this.getTierForQuantity(quantity);
    const discountPercentage = this.getTierDiscount(quantity);
    const originalTotal = this.round(unitPrice * quantity);
    const discountedTotal = this.round(originalTotal * (1 - discountPercentage));
    const savings = this.round(originalTotal - discountedTotal);

    this.logger.debug(
      `Bulk price: ${quantity} units at ${unitPrice}, tier=${tier}, discount=${discountPercentage * 100}%`
    );

    return {
      unitPrice,
      quantity,
      quantityTier: tier,
      discountPercentage: this.round(discountPercentage * 100),
      originalTotal,
      discountedTotal,
      savings,
    };
  }

  validateMinimumOrder(totalItems: number): void {
    if (totalItems < MINIMUM_BULK_ORDER_QUANTITY) {
      throw new BadRequestException(
        `Bulk order requires at least ${MINIMUM_BULK_ORDER_QUANTITY} item(s)`
      );
    }
  }

  calculateTax(subtotal: number): number {
    return this.round(subtotal * TAX_RATE);
  }

  getTaxRate(): number {
    return TAX_RATE;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

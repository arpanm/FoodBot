import { Injectable, Logger, BadRequestException } from '@nestjs/common';

const MAX_ITEMS_PER_RESTAURANT = 200;
const MAX_UNIQUE_DISHES_PER_RESTAURANT = 20;

export interface CapacityCheckResult {
  restaurantId: string;
  isAvailable: boolean;
  totalQuantity: number;
  maxCapacity: number;
  uniqueDishes: number;
  maxUniqueDishes: number;
  reason: string | null;
}

export interface ItemCapacityInput {
  restaurantId: string;
  dishId: string;
  quantity: number;
}

@Injectable()
export class CapacityValidatorService {
  private readonly logger = new Logger(CapacityValidatorService.name);

  validateCapacity(
    restaurantId: string,
    items: ItemCapacityInput[]
  ): CapacityCheckResult {
    const restaurantItems = items.filter(
      (item) => item.restaurantId === restaurantId
    );

    const totalQuantity = restaurantItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const uniqueDishes = new Set(
      restaurantItems.map((item) => item.dishId)
    ).size;

    const isWithinCapacity = totalQuantity <= MAX_ITEMS_PER_RESTAURANT;
    const isWithinDishLimit = uniqueDishes <= MAX_UNIQUE_DISHES_PER_RESTAURANT;
    const isAvailable = isWithinCapacity && isWithinDishLimit;

    const reason = this.buildReason(
      isWithinCapacity,
      isWithinDishLimit,
      totalQuantity,
      uniqueDishes
    );

    this.logger.debug(
      `Capacity check for restaurant ${restaurantId}: ` +
      `${totalQuantity}/${MAX_ITEMS_PER_RESTAURANT} items, ` +
      `${uniqueDishes}/${MAX_UNIQUE_DISHES_PER_RESTAURANT} dishes`
    );

    return {
      restaurantId,
      isAvailable,
      totalQuantity,
      maxCapacity: MAX_ITEMS_PER_RESTAURANT,
      uniqueDishes,
      maxUniqueDishes: MAX_UNIQUE_DISHES_PER_RESTAURANT,
      reason,
    };
  }

  checkAvailability(items: ItemCapacityInput[]): CapacityCheckResult[] {
    const restaurantIds = this.getUniqueRestaurantIds(items);
    return restaurantIds.map((restaurantId) =>
      this.validateCapacity(restaurantId, items)
    );
  }

  validateAllCapacity(items: ItemCapacityInput[]): void {
    const results = this.checkAvailability(items);
    const unavailable = results.filter((result) => !result.isAvailable);

    if (unavailable.length > 0) {
      const reasons = unavailable
        .map((result) => `Restaurant ${result.restaurantId}: ${result.reason}`)
        .join('; ');

      throw new BadRequestException(
        `Capacity validation failed: ${reasons}`
      );
    }
  }

  private getUniqueRestaurantIds(items: ItemCapacityInput[]): string[] {
    return [...new Set(items.map((item) => item.restaurantId))];
  }

  private buildReason(
    isWithinCapacity: boolean,
    isWithinDishLimit: boolean,
    totalQuantity: number,
    uniqueDishes: number
  ): string | null {
    const reasons: string[] = [];

    if (!isWithinCapacity) {
      reasons.push(
        `Exceeds max capacity of ${MAX_ITEMS_PER_RESTAURANT} items (requested: ${totalQuantity})`
      );
    }

    if (!isWithinDishLimit) {
      reasons.push(
        `Exceeds max ${MAX_UNIQUE_DISHES_PER_RESTAURANT} unique dishes (requested: ${uniqueDishes})`
      );
    }

    return reasons.length > 0 ? reasons.join('; ') : null;
  }
}

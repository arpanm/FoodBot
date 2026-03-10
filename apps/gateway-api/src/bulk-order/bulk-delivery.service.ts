import { Injectable, Logger, BadRequestException } from '@nestjs/common';

const BASE_DELIVERY_FEE = 10.00;
const PER_RESTAURANT_FEE = 5.99;
const MINIMUM_HOURS_AHEAD = 24;
const DELIVERY_START_HOUR = 8;
const DELIVERY_END_HOUR = 22;
const BASE_DELIVERY_MINUTES = 45;
const PER_RESTAURANT_MINUTES = 15;

export interface DeliveryEstimate {
  estimatedMinutes: number;
  deliveryFee: number;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
}

@Injectable()
export class BulkDeliveryService {
  private readonly logger = new Logger(BulkDeliveryService.name);

  validateDeliverySlot(deliveryDate: string, deliveryTime: string): void {
    const deliveryDateTime = new Date(`${deliveryDate}T${deliveryTime}`);

    if (isNaN(deliveryDateTime.getTime())) {
      throw new BadRequestException('Invalid delivery date or time format');
    }

    const now = new Date();
    const hoursUntilDelivery = this.getHoursUntilDelivery(now, deliveryDateTime);

    if (hoursUntilDelivery < MINIMUM_HOURS_AHEAD) {
      throw new BadRequestException(
        `Delivery must be scheduled at least ${MINIMUM_HOURS_AHEAD} hours in advance`
      );
    }

    const deliveryHour = deliveryDateTime.getHours();
    if (deliveryHour < DELIVERY_START_HOUR || deliveryHour >= DELIVERY_END_HOUR) {
      throw new BadRequestException(
        `Delivery time must be between ${DELIVERY_START_HOUR}:00 and ${DELIVERY_END_HOUR}:00`
      );
    }
  }

  calculateDeliveryFee(restaurantCount: number): number {
    if (restaurantCount <= 0) {
      return 0;
    }
    return this.round(BASE_DELIVERY_FEE + (restaurantCount * PER_RESTAURANT_FEE));
  }

  estimateDeliveryTime(
    deliveryDate: string,
    deliveryTime: string,
    restaurantCount: number
  ): DeliveryEstimate {
    const estimatedMinutes = BASE_DELIVERY_MINUTES + (restaurantCount * PER_RESTAURANT_MINUTES);
    const deliveryFee = this.calculateDeliveryFee(restaurantCount);

    const deliveryStart = new Date(`${deliveryDate}T${deliveryTime}`);
    const deliveryEnd = new Date(deliveryStart.getTime() + estimatedMinutes * 60 * 1000);

    this.logger.debug(
      `Delivery estimate: ${estimatedMinutes}min for ${restaurantCount} restaurants`
    );

    return {
      estimatedMinutes,
      deliveryFee,
      deliveryWindowStart: deliveryStart.toISOString(),
      deliveryWindowEnd: deliveryEnd.toISOString(),
    };
  }

  getUniqueRestaurantCount(restaurantIds: string[]): number {
    return new Set(restaurantIds).size;
  }

  private getHoursUntilDelivery(now: Date, deliveryDateTime: Date): number {
    return (deliveryDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

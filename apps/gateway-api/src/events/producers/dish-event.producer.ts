import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { KafkaService } from '../kafka.service';

const TOPICS = {
  DISH_CREATED: 'dish.created',
  DISH_UPDATED: 'dish.updated',
  DISH_AVAILABILITY_CHANGED: 'dish.availability.changed',
} as const;

/**
 * Produces dish domain events onto Kafka topics.
 *
 * Published events:
 * - dish.created              (partition key: dishId)
 * - dish.updated              (partition key: dishId)
 * - dish.availability.changed (partition key: dishId)
 */
@Injectable()
export class DishEventProducer {
  private readonly logger = new Logger(DishEventProducer.name);
  private readonly source = 'gateway-api';

  constructor(private readonly kafkaService: KafkaService) {}

  async publishDishCreated(dish: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    category: string;
    price: number;
    discountedPrice?: number;
    images: string[];
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    allergens: string[];
    spiceLevel: string;
    calories?: number;
    preparationTime: number;
    isAvailable: boolean;
    tags: string[];
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.DISH_CREATED,
      data: {
        dishId: dish.id,
        restaurantId: dish.restaurantId,
        name: dish.name,
        description: dish.description,
        category: dish.category,
        price: dish.price,
        discountedPrice: dish.discountedPrice,
        images: dish.images,
        isVegetarian: dish.isVegetarian,
        isVegan: dish.isVegan,
        isGlutenFree: dish.isGlutenFree,
        allergens: dish.allergens,
        spiceLevel: dish.spiceLevel,
        calories: dish.calories,
        preparationTime: dish.preparationTime,
        isAvailable: dish.isAvailable,
        tags: dish.tags,
      },
    };

    await this.kafkaService.publish(TOPICS.DISH_CREATED, dish.id, event);
    this.logger.log(`Published dish.created event for ${dish.id}`);
  }

  async publishDishUpdated(
    dishId: string,
    restaurantId: string,
    changes: Record<string, unknown>,
    updatedBy: string,
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.DISH_UPDATED,
      data: {
        dishId,
        restaurantId,
        changes,
        updatedBy,
      },
    };

    await this.kafkaService.publish(TOPICS.DISH_UPDATED, dishId, event);
    this.logger.log(`Published dish.updated event for ${dishId}`);
  }

  async publishDishAvailabilityChanged(
    dishId: string,
    restaurantId: string,
    isAvailable: boolean,
    changedBy: string,
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.DISH_AVAILABILITY_CHANGED,
      data: {
        dishId,
        restaurantId,
        isAvailable,
        changedBy,
      },
    };

    await this.kafkaService.publish(TOPICS.DISH_AVAILABILITY_CHANGED, dishId, event);
    this.logger.log(`Published dish.availability.changed event for ${dishId} -> ${isAvailable}`);
  }
}

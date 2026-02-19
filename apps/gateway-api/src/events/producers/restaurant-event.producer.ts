import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { KafkaService } from '../kafka.service';

const TOPICS = {
  RESTAURANT_CREATED: 'restaurant.created',
  RESTAURANT_UPDATED: 'restaurant.updated',
  RESTAURANT_DELETED: 'restaurant.deleted',
} as const;

/**
 * Produces restaurant domain events onto Kafka topics.
 *
 * Published events:
 * - restaurant.created  (partition key: restaurantId)
 * - restaurant.updated  (partition key: restaurantId)
 * - restaurant.deleted  (partition key: restaurantId)
 */
@Injectable()
export class RestaurantEventProducer {
  private readonly logger = new Logger(RestaurantEventProducer.name);
  private readonly source = 'gateway-api';

  constructor(private readonly kafkaService: KafkaService) {}

  async publishRestaurantCreated(restaurant: {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    cuisineTypes: string[];
    address: Record<string, unknown>;
    phoneNumber: string;
    email: string;
    rating: number;
    reviewCount: number;
    priceRange: string;
    isActive: boolean;
    isApproved: boolean;
    latitude: number;
    longitude: number;
    deliveryRadius: number;
    minimumOrder: number;
    deliveryFee: number;
    preparationTime: number;
  }): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.RESTAURANT_CREATED,
      data: {
        restaurantId: restaurant.id,
        ownerId: restaurant.ownerId,
        name: restaurant.name,
        description: restaurant.description,
        cuisineTypes: restaurant.cuisineTypes,
        address: restaurant.address,
        phoneNumber: restaurant.phoneNumber,
        email: restaurant.email,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        priceRange: restaurant.priceRange,
        isActive: restaurant.isActive,
        isApproved: restaurant.isApproved,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        deliveryRadius: restaurant.deliveryRadius,
        minimumOrder: restaurant.minimumOrder,
        deliveryFee: restaurant.deliveryFee,
        preparationTime: restaurant.preparationTime,
      },
    };

    await this.kafkaService.publish(TOPICS.RESTAURANT_CREATED, restaurant.id, event);
    this.logger.log(`Published restaurant.created event for ${restaurant.id}`);
  }

  async publishRestaurantUpdated(
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
      type: TOPICS.RESTAURANT_UPDATED,
      data: {
        restaurantId,
        changes,
        updatedBy,
      },
    };

    await this.kafkaService.publish(TOPICS.RESTAURANT_UPDATED, restaurantId, event);
    this.logger.log(`Published restaurant.updated event for ${restaurantId}`);
  }

  async publishRestaurantDeleted(
    restaurantId: string,
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.source,
      correlationId: uuidv4(),
      version: 1,
      type: TOPICS.RESTAURANT_DELETED,
      data: {
        restaurantId,
        deletedBy,
        reason,
      },
    };

    await this.kafkaService.publish(TOPICS.RESTAURANT_DELETED, restaurantId, event);
    this.logger.log(`Published restaurant.deleted event for ${restaurantId}`);
  }
}

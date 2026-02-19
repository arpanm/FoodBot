import { v4 as uuidv4 } from 'uuid';

import {
  RestaurantCreatedEventSchema,
  OrderStatusChangedEventSchema,
  PaymentCompletedEventSchema,
  DishAvailabilityChangedEventSchema,
  UserRegisteredEventSchema,
} from '../index';

describe('Event Schemas', () => {
  const baseEvent = () => ({
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    source: 'gateway-api',
    correlationId: uuidv4(),
    version: 1,
  });

  describe('RestaurantCreatedEventSchema', () => {
    it('should validate a valid restaurant.created event', () => {
      const event = {
        ...baseEvent(),
        type: 'restaurant.created' as const,
        data: {
          restaurantId: uuidv4(),
          ownerId: uuidv4(),
          name: 'Test Restaurant',
          description: 'A great restaurant',
          cuisineTypes: ['Italian'],
          address: { street: '123 Main St' },
          phoneNumber: '+11234567890',
          email: 'test@restaurant.com',
          rating: 4.5,
          reviewCount: 100,
          priceRange: 'moderate',
          isActive: true,
          isApproved: true,
          latitude: 37.7749,
          longitude: -122.4194,
          deliveryRadius: 10,
          minimumOrder: 15,
          deliveryFee: 3.99,
          preparationTime: 30,
        },
      };

      const result = RestaurantCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject event with missing required fields', () => {
      const event = {
        ...baseEvent(),
        type: 'restaurant.created' as const,
        data: {
          restaurantId: uuidv4(),
          // missing ownerId, name, etc.
        },
      };

      const result = RestaurantCreatedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('OrderStatusChangedEventSchema', () => {
    it('should validate a valid order.status.changed event', () => {
      const event = {
        ...baseEvent(),
        type: 'order.status.changed' as const,
        data: {
          orderId: uuidv4(),
          userId: uuidv4(),
          restaurantId: uuidv4(),
          oldStatus: 'pending' as const,
          newStatus: 'confirmed' as const,
        },
      };

      const result = OrderStatusChangedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid order status', () => {
      const event = {
        ...baseEvent(),
        type: 'order.status.changed' as const,
        data: {
          orderId: uuidv4(),
          userId: uuidv4(),
          restaurantId: uuidv4(),
          oldStatus: 'invalid_status',
          newStatus: 'confirmed',
        },
      };

      const result = OrderStatusChangedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('PaymentCompletedEventSchema', () => {
    it('should validate a valid payment.completed event', () => {
      const event = {
        ...baseEvent(),
        type: 'payment.completed' as const,
        data: {
          paymentId: uuidv4(),
          orderId: uuidv4(),
          userId: uuidv4(),
          amount: 32.05,
          paymentMethod: 'card',
        },
      };

      const result = PaymentCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('DishAvailabilityChangedEventSchema', () => {
    it('should validate a valid dish.availability.changed event', () => {
      const event = {
        ...baseEvent(),
        type: 'dish.availability.changed' as const,
        data: {
          dishId: uuidv4(),
          restaurantId: uuidv4(),
          isAvailable: false,
          changedBy: uuidv4(),
        },
      };

      const result = DishAvailabilityChangedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('UserRegisteredEventSchema', () => {
    it('should validate a valid user.registered event', () => {
      const event = {
        ...baseEvent(),
        type: 'user.registered' as const,
        data: {
          userId: uuidv4(),
          email: 'test@example.com',
          name: 'John Doe',
          role: 'customer',
        },
      };

      const result = UserRegisteredEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const event = {
        ...baseEvent(),
        type: 'user.registered' as const,
        data: {
          userId: uuidv4(),
          email: 'not-an-email',
          name: 'John Doe',
          role: 'customer',
        },
      };

      const result = UserRegisteredEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });
});

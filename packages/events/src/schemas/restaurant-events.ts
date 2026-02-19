import { z } from 'zod';

import { createEventSchema, BaseEventSchema } from './base-event';

// --- Data Schemas ---

const RestaurantDataSchema = z.object({
  restaurantId: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  cuisineTypes: z.array(z.string()),
  address: z.record(z.unknown()),
  phoneNumber: z.string(),
  email: z.string().email(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  priceRange: z.string(),
  isActive: z.boolean(),
  isApproved: z.boolean(),
  latitude: z.number(),
  longitude: z.number(),
  deliveryRadius: z.number(),
  minimumOrder: z.number(),
  deliveryFee: z.number(),
  preparationTime: z.number().int(),
});

const RestaurantUpdateDataSchema = z.object({
  restaurantId: z.string().uuid(),
  changes: z.record(z.unknown()),
  updatedBy: z.string().uuid(),
});

const RestaurantDeleteDataSchema = z.object({
  restaurantId: z.string().uuid(),
  deletedBy: z.string().uuid(),
  reason: z.string().optional(),
});

// --- Event Schemas ---

export const RestaurantCreatedEventSchema = createEventSchema(
  'restaurant.created',
  RestaurantDataSchema,
);

export const RestaurantUpdatedEventSchema = createEventSchema(
  'restaurant.updated',
  RestaurantUpdateDataSchema,
);

export const RestaurantDeletedEventSchema = createEventSchema(
  'restaurant.deleted',
  RestaurantDeleteDataSchema,
);

// --- Type Exports ---

export type RestaurantCreatedEvent = z.infer<typeof RestaurantCreatedEventSchema>;
export type RestaurantUpdatedEvent = z.infer<typeof RestaurantUpdatedEventSchema>;
export type RestaurantDeletedEvent = z.infer<typeof RestaurantDeletedEventSchema>;

export type RestaurantEvent =
  | RestaurantCreatedEvent
  | RestaurantUpdatedEvent
  | RestaurantDeletedEvent;

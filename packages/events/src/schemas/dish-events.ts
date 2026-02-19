import { z } from 'zod';

import { createEventSchema } from './base-event';

// --- Data Schemas ---

const DishDataSchema = z.object({
  dishId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  category: z.string(),
  price: z.number().min(0),
  discountedPrice: z.number().min(0).optional(),
  images: z.array(z.string()),
  isVegetarian: z.boolean(),
  isVegan: z.boolean(),
  isGlutenFree: z.boolean(),
  allergens: z.array(z.string()),
  spiceLevel: z.string(),
  calories: z.number().int().optional(),
  preparationTime: z.number().int(),
  isAvailable: z.boolean(),
  tags: z.array(z.string()),
});

const DishUpdateDataSchema = z.object({
  dishId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  changes: z.record(z.unknown()),
  updatedBy: z.string().uuid(),
});

const DishAvailabilityDataSchema = z.object({
  dishId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  isAvailable: z.boolean(),
  changedBy: z.string().uuid(),
});

// --- Event Schemas ---

export const DishCreatedEventSchema = createEventSchema(
  'dish.created',
  DishDataSchema,
);

export const DishUpdatedEventSchema = createEventSchema(
  'dish.updated',
  DishUpdateDataSchema,
);

export const DishAvailabilityChangedEventSchema = createEventSchema(
  'dish.availability.changed',
  DishAvailabilityDataSchema,
);

// --- Type Exports ---

export type DishCreatedEvent = z.infer<typeof DishCreatedEventSchema>;
export type DishUpdatedEvent = z.infer<typeof DishUpdatedEventSchema>;
export type DishAvailabilityChangedEvent = z.infer<typeof DishAvailabilityChangedEventSchema>;

export type DishEvent =
  | DishCreatedEvent
  | DishUpdatedEvent
  | DishAvailabilityChangedEvent;

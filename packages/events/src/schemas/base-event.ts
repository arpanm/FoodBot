import { z } from 'zod';

/**
 * Base event schema shared by all FoodBot domain events.
 * Every event carries a unique identifier, a creation timestamp,
 * the originating service name, and a correlation ID for tracing.
 */
export const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  source: z.string().min(1),
  correlationId: z.string().uuid(),
  version: z.number().int().positive().default(1),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

/**
 * Helper to create a typed event schema that extends the base.
 */
export function createEventSchema<T extends z.ZodRawShape>(
  type: string,
  dataSchema: z.ZodObject<T>,
) {
  return BaseEventSchema.extend({
    type: z.literal(type),
    data: dataSchema,
  });
}

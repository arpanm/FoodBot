import { z } from 'zod';

import { createEventSchema } from './base-event';

// --- Data Schemas ---

const UserRegisteredDataSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string(),
  phoneNumber: z.string().optional(),
});

// --- Event Schemas ---

export const UserRegisteredEventSchema = createEventSchema(
  'user.registered',
  UserRegisteredDataSchema,
);

// --- Type Exports ---

export type UserRegisteredEvent = z.infer<typeof UserRegisteredEventSchema>;

export type UserEvent = UserRegisteredEvent;

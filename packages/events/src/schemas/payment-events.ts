import { z } from 'zod';

import { createEventSchema } from './base-event';

// --- Enums ---

export const PaymentStatusEnum = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

// --- Data Schemas ---

const PaymentCompletedDataSchema = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().min(0),
  paymentMethod: z.string(),
  transactionId: z.string().optional(),
});

const PaymentFailedDataSchema = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().min(0),
  paymentMethod: z.string(),
  failureReason: z.string(),
});

const PaymentRefundedDataSchema = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  refundAmount: z.number().min(0),
  reason: z.string().optional(),
});

// --- Event Schemas ---

export const PaymentCompletedEventSchema = createEventSchema(
  'payment.completed',
  PaymentCompletedDataSchema,
);

export const PaymentFailedEventSchema = createEventSchema(
  'payment.failed',
  PaymentFailedDataSchema,
);

export const PaymentRefundedEventSchema = createEventSchema(
  'payment.refunded',
  PaymentRefundedDataSchema,
);

// --- Type Exports ---

export type PaymentCompletedEvent = z.infer<typeof PaymentCompletedEventSchema>;
export type PaymentFailedEvent = z.infer<typeof PaymentFailedEventSchema>;
export type PaymentRefundedEvent = z.infer<typeof PaymentRefundedEventSchema>;

export type PaymentEvent =
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent;

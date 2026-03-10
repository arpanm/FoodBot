/**
 * Scheduled Order Validator
 *
 * Pure validation functions for scheduled order operations.
 * Handles time-based validation rules, item validation, and
 * modification window checks.
 *
 * Key rules:
 * - Scheduled time must be at least 2 hours in the future
 * - Orders can be modified up to T-4h before scheduled time
 * - Availability is re-validated at T-2h before placement
 *
 * Extracted from ScheduledOrderService for file-length compliance.
 *
 * Implements FR-CA-ORDER-001.
 */

import { BadRequestException } from '@nestjs/common';

import { ScheduledOrderItem, ScheduledOrder } from './scheduled-order.types';

// ============================================================================
// Constants
// ============================================================================

const MIN_SCHEDULE_AHEAD_MS = 2 * 60 * 60 * 1000; // 2 hours
const MODIFICATION_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours before scheduled time

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that a scheduled time is at least 2 hours in the future.
 */
export function validateScheduledTime(scheduledTime: Date): void {
  const now = Date.now();
  const timeDiff = scheduledTime.getTime() - now;

  if (timeDiff < MIN_SCHEDULE_AHEAD_MS) {
    throw new BadRequestException(
      'Scheduled time must be at least 2 hours in the future'
    );
  }
}

/**
 * Validate order items (non-empty, positive quantity, non-negative price).
 */
export function validateItems(items: ScheduledOrderItem[]): void {
  if (!items || items.length === 0) {
    throw new BadRequestException('Order must contain at least one item');
  }

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new BadRequestException(
        `Invalid quantity for dish ${item.dishId}`
      );
    }
    if (item.price < 0) {
      throw new BadRequestException(
        `Invalid price for dish ${item.dishId}`
      );
    }
  }
}

/**
 * Check if the current time is within the modification window.
 * Returns true if the order can still be modified (more than 4 hours before scheduled time).
 */
export function isWithinModificationWindow(scheduledTime: Date): boolean {
  const now = Date.now();
  const timeUntilScheduled = scheduledTime.getTime() - now;
  return timeUntilScheduled > MODIFICATION_WINDOW_MS;
}

/**
 * Check if a scheduled order can still be modified.
 */
export function isModifiable(order: ScheduledOrder): boolean {
  return (
    (order.status === 'scheduled' || order.status === 'modified') &&
    isWithinModificationWindow(order.scheduledTime)
  );
}

/**
 * Get the modification deadline for a scheduled order.
 */
export function getModificationDeadline(scheduledTime: Date): Date {
  return new Date(
    scheduledTime.getTime() - MODIFICATION_WINDOW_MS
  );
}

/**
 * Cancel Order DTO
 *
 * Validated input for order cancellation with reason tracking.
 */

import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum CancellationReason {
  CHANGED_MIND = 'changed_mind',
  FOUND_BETTER_OPTION = 'found_better_option',
  DELIVERY_TOO_LONG = 'delivery_too_long',
  WRONG_ORDER = 'wrong_order',
  DUPLICATE_ORDER = 'duplicate_order',
  RESTAURANT_CLOSED = 'restaurant_closed',
  PRICE_ISSUE = 'price_issue',
  OTHER = 'other',
}

export class CancelOrderRequestDto {
  @IsEnum(CancellationReason, {
    message: 'reason must be a valid cancellation reason',
  })
  reason!: CancellationReason;

  @IsOptional()
  @IsString()
  details?: string;
}

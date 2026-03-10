/**
 * Canonical order status transition map.
 *
 * Single source of truth for which status transitions are allowed.
 * Both OrderService and OrderStatusService import from here to avoid
 * duplicate / divergent definitions.
 *
 * Lifecycle:
 *   PENDING -> CONFIRMED -> PREPARING -> READY -> PICKED_UP / OUT_FOR_DELIVERY -> DELIVERED
 *   Most active statuses -> CANCELLED (with restrictions defined per-consumer)
 *
 * NOTE: 'out-for-delivery' is kept as an alias of 'out_for_delivery' for
 * backward compatibility with existing order records that use the hyphenated form.
 */

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up', 'out_for_delivery', 'out-for-delivery', 'cancelled'],
  picked_up: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  'out-for-delivery': ['delivered'],
  delivered: [],
  cancelled: [],
};

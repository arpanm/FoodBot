/**
 * Order Tracking DTOs
 *
 * Response format for order tracking and status updates.
 */

export interface TrackingUpdateDto {
  status: string;
  message: string;
  timestamp: string;
}

export interface DeliveryLocationDto {
  latitude: number;
  longitude: number;
  heading?: number;
  updatedAt: string;
}

export interface OrderTrackingResponseDto {
  orderId: string;
  status: string;
  trackingUpdates: TrackingUpdateDto[];
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  currentLocation?: DeliveryLocationDto;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
}

export interface ReorderResponseDto {
  orderId: string;
  status: string;
  unavailableItems: string[];
  priceChanges: Array<{
    dishId: string;
    oldPrice: number;
    newPrice: number;
  }>;
}

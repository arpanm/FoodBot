import { BulkOrderStatus, BulkOrderType } from '../../entities/bulk-order.entity';
import { QuantityTier } from '../../entities/bulk-order-item.entity';

export interface BulkOrderItemResponse {
  id: string;
  bulkOrderId: string;
  restaurantId: string;
  restaurantName: string;
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  quantityTier: QuantityTier;
  discountPercentage: number;
  notes: string | null;
}

export interface BulkOrderResponse {
  id: string;
  userId: string;
  organizationName: string;
  orderType: BulkOrderType;
  status: BulkOrderStatus;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string | null;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  items: BulkOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PricingBreakdownResponse {
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  items: ItemPricingResponse[];
}

export interface ItemPricingResponse {
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  quantityTier: QuantityTier;
  discountPercentage: number;
  originalPrice: number;
  discountedPrice: number;
}

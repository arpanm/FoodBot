import type {
  CancelResult,
  DeliveryDetails,
  Location,
  OrderItem,
  ProviderMenuItem,
  ProviderOrder,
  ProviderRestaurant,
  ProviderStatus,
} from './provider.types.js';

export interface IFoodProvider {
  searchRestaurants(query: string, location: Location): Promise<ProviderRestaurant[]>;
  getMenu(restaurantId: string): Promise<ProviderMenuItem[]>;
  placeOrder(
    restaurantId: string,
    items: OrderItem[],
    delivery: DeliveryDetails
  ): Promise<ProviderOrder>;
  getOrderStatus(orderId: string): Promise<ProviderOrder>;
  cancelOrder(orderId: string): Promise<CancelResult>;
  getHealth(): Promise<ProviderStatus>;
}

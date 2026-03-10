import type { IFoodProvider } from '../types/provider-interface.js';
import type {
  CancelResult,
  DeliveryDetails,
  Location,
  OrderItem,
  ProviderMenuItem,
  ProviderOrder,
  ProviderRestaurant,
  ProviderStatus,
} from '../types/provider.types.js';
import { ONDC_RESTAURANTS } from '../mock/mock-restaurants.js';
import { ONDC_MENUS } from '../mock/mock-menus.js';

const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 500;

export type OndcFlowStep = 'search' | 'select' | 'init' | 'confirm';

export class OndcProvider implements IFoodProvider {
  private readonly orders: Map<string, ProviderOrder> = new Map();
  private orderCounter: number = 0;
  private readonly randomSeed: () => number;
  private readonly delayFn: (ms: number) => Promise<void>;

  constructor(
    randomFn?: () => number,
    delayFn?: (ms: number) => Promise<void>
  ) {
    this.randomSeed = randomFn ?? Math.random;
    this.delayFn = delayFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async searchRestaurants(query: string, _location: Location): Promise<ProviderRestaurant[]> {
    await this.simulateOndcFlow('search');

    const lowerQuery = query.toLowerCase();
    return ONDC_RESTAURANTS.filter((r) =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.cuisine.some((c) => c.toLowerCase().includes(lowerQuery))
    );
  }

  async getMenu(restaurantId: string): Promise<ProviderMenuItem[]> {
    await this.simulateOndcFlow('select');

    const menu = ONDC_MENUS[restaurantId];
    if (!menu) {
      throw new OndcProviderError(`Restaurant ${restaurantId} not found on ONDC network`);
    }
    return menu;
  }

  async placeOrder(
    restaurantId: string,
    items: OrderItem[],
    _delivery: DeliveryDetails
  ): Promise<ProviderOrder> {
    await this.simulateOndcFlow('init');
    await this.simulateOndcFlow('confirm');

    const restaurant = ONDC_RESTAURANTS.find((r) => r.id === restaurantId);
    if (!restaurant) {
      throw new OndcProviderError(`Restaurant ${restaurantId} not found on ONDC network`);
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    this.orderCounter += 1;

    const order: ProviderOrder = {
      id: `ondc-ord-${String(this.orderCounter).padStart(6, '0')}`,
      status: 'confirmed',
      items,
      total,
      estimatedDelivery: restaurant.deliveryTime,
      trackingUrl: `https://ondc.org/track/ondc-ord-${String(this.orderCounter).padStart(6, '0')}`,
    };

    this.orders.set(order.id, order);
    return order;
  }

  async getOrderStatus(orderId: string): Promise<ProviderOrder> {
    await this.simulateDelay();

    const order = this.orders.get(orderId);
    if (!order) {
      throw new OndcProviderError(`Order ${orderId} not found on ONDC network`);
    }
    return order;
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    await this.simulateDelay();

    const order = this.orders.get(orderId);
    if (!order) {
      throw new OndcProviderError(`Order ${orderId} not found on ONDC network`);
    }

    if (order.status !== 'placed' && order.status !== 'confirmed') {
      return {
        success: false,
        orderId,
        refundAmount: 0,
        reason: 'ONDC cancellation not allowed in current status',
      };
    }

    order.status = 'cancelled';
    this.orders.set(orderId, order);

    return {
      success: true,
      orderId,
      refundAmount: order.total,
    };
  }

  async getHealth(): Promise<ProviderStatus> {
    return 'active';
  }

  private async simulateOndcFlow(_step: OndcFlowStep): Promise<void> {
    await this.simulateDelay();
  }

  private async simulateDelay(): Promise<void> {
    const delay = MIN_DELAY_MS + this.randomSeed() * (MAX_DELAY_MS - MIN_DELAY_MS);
    await this.delayFn(delay);
  }
}

export class OndcProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OndcProviderError';
  }
}

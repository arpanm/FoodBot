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
import { SWIGGY_RESTAURANTS } from '../mock/mock-restaurants.js';
import { SWIGGY_MENUS } from '../mock/mock-menus.js';

const ERROR_RATE = 0.05;
const MIN_DELAY_MS = 50;
const MAX_DELAY_MS = 200;

export class SwiggyProvider implements IFoodProvider {
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
    await this.simulateDelay();
    this.maybeThrowError('searchRestaurants');

    const lowerQuery = query.toLowerCase();
    return SWIGGY_RESTAURANTS.filter((r) =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.cuisine.some((c) => c.toLowerCase().includes(lowerQuery))
    );
  }

  async getMenu(restaurantId: string): Promise<ProviderMenuItem[]> {
    await this.simulateDelay();
    this.maybeThrowError('getMenu');

    const menu = SWIGGY_MENUS[restaurantId];
    if (!menu) {
      throw new SwiggyProviderError(`Restaurant ${restaurantId} not found`);
    }
    return menu;
  }

  async placeOrder(
    restaurantId: string,
    items: OrderItem[],
    _delivery: DeliveryDetails
  ): Promise<ProviderOrder> {
    await this.simulateDelay();
    this.maybeThrowError('placeOrder');

    const restaurant = SWIGGY_RESTAURANTS.find((r) => r.id === restaurantId);
    if (!restaurant) {
      throw new SwiggyProviderError(`Restaurant ${restaurantId} not found`);
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    this.orderCounter += 1;

    const order: ProviderOrder = {
      id: `swiggy-ord-${String(this.orderCounter).padStart(6, '0')}`,
      status: 'placed',
      items,
      total,
      estimatedDelivery: restaurant.deliveryTime,
      trackingUrl: `https://swiggy.com/track/swiggy-ord-${String(this.orderCounter).padStart(6, '0')}`,
    };

    this.orders.set(order.id, order);
    return order;
  }

  async getOrderStatus(orderId: string): Promise<ProviderOrder> {
    await this.simulateDelay();
    this.maybeThrowError('getOrderStatus');

    const order = this.orders.get(orderId);
    if (!order) {
      throw new SwiggyProviderError(`Order ${orderId} not found`);
    }
    return order;
  }

  async cancelOrder(orderId: string): Promise<CancelResult> {
    await this.simulateDelay();
    this.maybeThrowError('cancelOrder');

    const order = this.orders.get(orderId);
    if (!order) {
      throw new SwiggyProviderError(`Order ${orderId} not found`);
    }

    if (order.status !== 'placed' && order.status !== 'confirmed') {
      return {
        success: false,
        orderId,
        refundAmount: 0,
        reason: 'Order cannot be cancelled in current status',
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

  private async simulateDelay(): Promise<void> {
    const delay = MIN_DELAY_MS + this.randomSeed() * (MAX_DELAY_MS - MIN_DELAY_MS);
    await this.delayFn(delay);
  }

  private maybeThrowError(operation: string): void {
    if (this.randomSeed() < ERROR_RATE) {
      throw new SwiggyProviderError(
        `Swiggy API error during ${operation}: Service temporarily unavailable`
      );
    }
  }
}

export class SwiggyProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwiggyProviderError';
  }
}

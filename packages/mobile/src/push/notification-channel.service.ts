import type { NotificationChannel } from '../types/mobile.types.js';
import type { PushNotificationService } from './push-notification.service.js';

const ORDER_CHANNEL: NotificationChannel = {
  id: 'foodbot-orders',
  name: 'Order Updates',
  description: 'Notifications about your order status, delivery tracking, and order confirmations',
  importance: 'high',
  sound: 'order_notification',
  vibration: true,
};

const PROMOTION_CHANNEL: NotificationChannel = {
  id: 'foodbot-promotions',
  name: 'Promotions & Offers',
  description: 'Special deals, discounts, and promotional offers from your favorite restaurants',
  importance: 'default',
  sound: undefined,
  vibration: false,
};

const DIET_PLAN_CHANNEL: NotificationChannel = {
  id: 'foodbot-diet-plans',
  name: 'Diet Plan Reminders',
  description: 'Meal reminders, diet plan updates, and nutritional insights',
  importance: 'default',
  sound: 'diet_reminder',
  vibration: true,
};

export class NotificationChannelService {
  private readonly pushService: PushNotificationService;

  constructor(pushService: PushNotificationService) {
    this.pushService = pushService;
  }

  async createOrderChannel(): Promise<void> {
    await this.pushService.createChannel(ORDER_CHANNEL);
  }

  async createPromotionChannel(): Promise<void> {
    await this.pushService.createChannel(PROMOTION_CHANNEL);
  }

  async createDietPlanChannel(): Promise<void> {
    await this.pushService.createChannel(DIET_PLAN_CHANNEL);
  }

  async listChannels(): Promise<NotificationChannel[]> {
    return this.pushService.listChannels();
  }

  async createAllChannels(): Promise<void> {
    await this.createOrderChannel();
    await this.createPromotionChannel();
    await this.createDietPlanChannel();
  }

  getOrderChannelId(): string {
    return ORDER_CHANNEL.id;
  }

  getPromotionChannelId(): string {
    return PROMOTION_CHANNEL.id;
  }

  getDietPlanChannelId(): string {
    return DIET_PLAN_CHANNEL.id;
  }
}

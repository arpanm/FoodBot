import type {
  Platform,
  PushRegistration,
  PushNotification,
  NotificationChannel,
  NotificationHandler,
  Unsubscribe,
} from '../types/mobile.types.js';

export class PushNotificationService {
  private readonly platform: Platform;
  private readonly receivedHandlers: Set<NotificationHandler> = new Set();
  private readonly tappedHandlers: Set<NotificationHandler> = new Set();
  private readonly deliveredNotifications: PushNotification[] = [];
  private readonly channels: Map<string, NotificationChannel> = new Map();
  private badgeCount = 0;
  private registered = false;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async register(): Promise<PushRegistration> {
    if (this.platform === 'web') {
      return {
        token: 'web-no-op-token',
        platform: this.platform,
      };
    }

    this.registered = true;
    const token = `${this.platform}-token-${Date.now()}`;
    return {
      token,
      platform: this.platform,
    };
  }

  isRegistered(): boolean {
    return this.registered;
  }

  onNotificationReceived(handler: NotificationHandler): Unsubscribe {
    this.receivedHandlers.add(handler);
    return (): void => {
      this.receivedHandlers.delete(handler);
    };
  }

  onNotificationTapped(handler: NotificationHandler): Unsubscribe {
    this.tappedHandlers.add(handler);
    return (): void => {
      this.tappedHandlers.delete(handler);
    };
  }

  simulateNotificationReceived(notification: PushNotification): void {
    this.deliveredNotifications.push(notification);
    for (const handler of this.receivedHandlers) {
      handler(notification);
    }
  }

  simulateNotificationTapped(notification: PushNotification): void {
    for (const handler of this.tappedHandlers) {
      handler(notification);
    }
  }

  async getDeliveredNotifications(): Promise<PushNotification[]> {
    return [...this.deliveredNotifications];
  }

  async clearNotifications(): Promise<void> {
    this.deliveredNotifications.length = 0;
    this.badgeCount = 0;
  }

  async createChannel(channel: NotificationChannel): Promise<void> {
    if (this.platform !== 'android') {
      return;
    }
    this.channels.set(channel.id, { ...channel });
  }

  async listChannels(): Promise<NotificationChannel[]> {
    return Array.from(this.channels.values());
  }

  async setBadgeCount(count: number): Promise<void> {
    if (count < 0) {
      throw new Error('Badge count cannot be negative');
    }
    this.badgeCount = count;
  }

  getBadgeCount(): number {
    return this.badgeCount;
  }

  getPlatform(): Platform {
    return this.platform;
  }
}

import { PushNotificationService } from '../push/push-notification.service';
import { NotificationChannelService } from '../push/notification-channel.service';
import type {
  PushNotification,
  NotificationChannel,
  Platform,
} from '../types/mobile.types';

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    service = new PushNotificationService('android');
  });

  describe('register', () => {
    it('should register and return a token for android', async () => {
      const result = await service.register();

      expect(result.token).toContain('android-token-');
      expect(result.platform).toBe('android');
    });

    it('should register and return a token for ios', async () => {
      const iosService = new PushNotificationService('ios');
      const result = await iosService.register();

      expect(result.token).toContain('ios-token-');
      expect(result.platform).toBe('ios');
    });

    it('should return a no-op token for web', async () => {
      const webService = new PushNotificationService('web');
      const result = await webService.register();

      expect(result.token).toBe('web-no-op-token');
      expect(result.platform).toBe('web');
    });

    it('should mark service as registered after registration', async () => {
      expect(service.isRegistered()).toBe(false);
      await service.register();
      expect(service.isRegistered()).toBe(true);
    });
  });

  describe('onNotificationReceived', () => {
    it('should invoke handler when notification is received', () => {
      const handler = jest.fn();
      service.onNotificationReceived(handler);

      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Order Ready',
        body: 'Your order is ready for pickup',
        data: { orderId: '123' },
        timestamp: Date.now(),
      };

      service.simulateNotificationReceived(notification);

      expect(handler).toHaveBeenCalledWith(notification);
    });

    it('should invoke multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.onNotificationReceived(handler1);
      service.onNotificationReceived(handler2);

      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Test',
        body: 'Test body',
        data: {},
        timestamp: Date.now(),
      };

      service.simulateNotificationReceived(notification);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe handler when unsubscribe is called', () => {
      const handler = jest.fn();
      const unsubscribe = service.onNotificationReceived(handler);

      unsubscribe();

      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Test',
        body: 'Test body',
        data: {},
        timestamp: Date.now(),
      };

      service.simulateNotificationReceived(notification);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onNotificationTapped', () => {
    it('should invoke handler when notification is tapped', () => {
      const handler = jest.fn();
      service.onNotificationTapped(handler);

      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Tapped',
        body: 'Tapped body',
        data: { action: 'open_order' },
        timestamp: Date.now(),
      };

      service.simulateNotificationTapped(notification);

      expect(handler).toHaveBeenCalledWith(notification);
    });

    it('should unsubscribe tapped handler', () => {
      const handler = jest.fn();
      const unsubscribe = service.onNotificationTapped(handler);
      unsubscribe();

      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Tapped',
        body: 'Tapped body',
        data: {},
        timestamp: Date.now(),
      };

      service.simulateNotificationTapped(notification);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getDeliveredNotifications', () => {
    it('should return empty array when no notifications delivered', async () => {
      const result = await service.getDeliveredNotifications();
      expect(result).toEqual([]);
    });

    it('should return delivered notifications', async () => {
      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Delivered',
        body: 'Test',
        data: {},
        timestamp: Date.now(),
      };

      service.simulateNotificationReceived(notification);
      const result = await service.getDeliveredNotifications();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(notification);
    });

    it('should return a copy of notifications', async () => {
      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Test',
        body: 'Test',
        data: {},
        timestamp: Date.now(),
      };

      service.simulateNotificationReceived(notification);
      const result1 = await service.getDeliveredNotifications();
      const result2 = await service.getDeliveredNotifications();

      expect(result1).not.toBe(result2);
    });
  });

  describe('clearNotifications', () => {
    it('should clear all delivered notifications', async () => {
      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Test',
        body: 'Test',
        data: {},
        timestamp: Date.now(),
      };

      service.simulateNotificationReceived(notification);
      await service.clearNotifications();
      const result = await service.getDeliveredNotifications();

      expect(result).toEqual([]);
    });

    it('should reset badge count', async () => {
      await service.setBadgeCount(5);
      await service.clearNotifications();

      expect(service.getBadgeCount()).toBe(0);
    });
  });

  describe('createChannel', () => {
    it('should create a channel on android', async () => {
      const channel: NotificationChannel = {
        id: 'test-channel',
        name: 'Test Channel',
        description: 'A test channel',
        importance: 'high',
        vibration: true,
      };

      await service.createChannel(channel);
      const channels = await service.listChannels();

      expect(channels).toHaveLength(1);
      expect(channels[0]?.id).toBe('test-channel');
    });

    it('should not create channel on non-android platforms', async () => {
      const iosService = new PushNotificationService('ios');
      const channel: NotificationChannel = {
        id: 'test-channel',
        name: 'Test Channel',
        description: 'A test channel',
        importance: 'high',
      };

      await iosService.createChannel(channel);
      const channels = await iosService.listChannels();

      expect(channels).toHaveLength(0);
    });
  });

  describe('setBadgeCount', () => {
    it('should set badge count', async () => {
      await service.setBadgeCount(3);
      expect(service.getBadgeCount()).toBe(3);
    });

    it('should throw for negative badge count', async () => {
      await expect(service.setBadgeCount(-1)).rejects.toThrow(
        'Badge count cannot be negative'
      );
    });

    it('should allow zero badge count', async () => {
      await service.setBadgeCount(0);
      expect(service.getBadgeCount()).toBe(0);
    });
  });

  describe('getPlatform', () => {
    it.each<Platform>(['ios', 'android', 'web'])(
      'should return platform %s',
      (platform) => {
        const svc = new PushNotificationService(platform);
        expect(svc.getPlatform()).toBe(platform);
      }
    );
  });
});

describe('NotificationChannelService', () => {
  let pushService: PushNotificationService;
  let channelService: NotificationChannelService;

  beforeEach(() => {
    pushService = new PushNotificationService('android');
    channelService = new NotificationChannelService(pushService);
  });

  describe('createOrderChannel', () => {
    it('should create the order updates channel', async () => {
      await channelService.createOrderChannel();
      const channels = await channelService.listChannels();

      expect(channels).toHaveLength(1);
      expect(channels[0]?.id).toBe('foodbot-orders');
      expect(channels[0]?.importance).toBe('high');
    });
  });

  describe('createPromotionChannel', () => {
    it('should create the promotions channel', async () => {
      await channelService.createPromotionChannel();
      const channels = await channelService.listChannels();

      expect(channels).toHaveLength(1);
      expect(channels[0]?.id).toBe('foodbot-promotions');
      expect(channels[0]?.importance).toBe('default');
    });
  });

  describe('createDietPlanChannel', () => {
    it('should create the diet plan channel', async () => {
      await channelService.createDietPlanChannel();
      const channels = await channelService.listChannels();

      expect(channels).toHaveLength(1);
      expect(channels[0]?.id).toBe('foodbot-diet-plans');
    });
  });

  describe('createAllChannels', () => {
    it('should create all three channels', async () => {
      await channelService.createAllChannels();
      const channels = await channelService.listChannels();

      expect(channels).toHaveLength(3);
    });
  });

  describe('channel id getters', () => {
    it('should return correct order channel id', () => {
      expect(channelService.getOrderChannelId()).toBe('foodbot-orders');
    });

    it('should return correct promotion channel id', () => {
      expect(channelService.getPromotionChannelId()).toBe(
        'foodbot-promotions'
      );
    });

    it('should return correct diet plan channel id', () => {
      expect(channelService.getDietPlanChannelId()).toBe('foodbot-diet-plans');
    });
  });
});

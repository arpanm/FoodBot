import { EmailChannel } from '../channels/email.channel';
import { PushChannel } from '../channels/push.channel';
import { SmsChannel } from '../channels/sms.channel';
import { WebSocketChannel } from '../channels/websocket.channel';
import { OrderEventConsumer } from '../consumers/order-event.consumer';

describe('OrderEventConsumer', () => {
  let consumer: OrderEventConsumer;
  let emailChannel: EmailChannel;
  let smsChannel: SmsChannel;
  let webSocketChannel: WebSocketChannel;
  let pushChannel: PushChannel;

  beforeEach(() => {
    emailChannel = new EmailChannel();
    smsChannel = new SmsChannel();
    webSocketChannel = new WebSocketChannel();
    pushChannel = new PushChannel();

    // Mock all channel methods
    jest.spyOn(emailChannel, 'send').mockResolvedValue(undefined);
    jest.spyOn(smsChannel, 'send').mockResolvedValue(undefined);
    jest.spyOn(webSocketChannel, 'broadcast').mockResolvedValue(undefined);
    jest.spyOn(pushChannel, 'send').mockResolvedValue(undefined);

    consumer = new OrderEventConsumer(
      emailChannel,
      smsChannel,
      webSocketChannel,
      pushChannel,
    );
  });

  describe('handleOrderCreated', () => {
    it('should send email and WebSocket notification', async () => {
      await consumer.handleOrderCreated({
        orderId: 'order-123',
        userId: 'user-456',
        restaurantId: 'rest-789',
        total: 32.05,
        estimatedDeliveryTime: '2026-02-19T12:00:00Z',
      });

      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      expect(webSocketChannel.broadcast).toHaveBeenCalledTimes(1);
      expect(webSocketChannel.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          event: 'order.created',
        }),
      );
    });
  });

  describe('handleOrderStatusChanged', () => {
    it('should broadcast WebSocket event for all status changes', async () => {
      await consumer.handleOrderStatusChanged({
        orderId: 'order-123',
        userId: 'user-456',
        restaurantId: 'rest-789',
        oldStatus: 'pending',
        newStatus: 'confirmed',
      });

      expect(webSocketChannel.broadcast).toHaveBeenCalledTimes(1);
    });

    it('should send push notification for preparing status', async () => {
      await consumer.handleOrderStatusChanged({
        orderId: 'order-123',
        userId: 'user-456',
        restaurantId: 'rest-789',
        oldStatus: 'confirmed',
        newStatus: 'preparing',
      });

      expect(pushChannel.send).toHaveBeenCalledTimes(1);
      expect(pushChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          title: 'Order Being Prepared',
        }),
      );
    });

    it('should send SMS and push for out_for_delivery status', async () => {
      await consumer.handleOrderStatusChanged({
        orderId: 'order-123',
        userId: 'user-456',
        restaurantId: 'rest-789',
        oldStatus: 'ready',
        newStatus: 'out_for_delivery',
      });

      expect(smsChannel.send).toHaveBeenCalledTimes(1);
      expect(pushChannel.send).toHaveBeenCalledTimes(1);
    });

    it('should send email and push for delivered status', async () => {
      await consumer.handleOrderStatusChanged({
        orderId: 'order-123',
        userId: 'user-456',
        restaurantId: 'rest-789',
        oldStatus: 'out_for_delivery',
        newStatus: 'delivered',
      });

      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      expect(pushChannel.send).toHaveBeenCalledTimes(1);
    });

    it('should send cancellation email with reason', async () => {
      await consumer.handleOrderStatusChanged({
        orderId: 'order-123',
        userId: 'user-456',
        restaurantId: 'rest-789',
        oldStatus: 'confirmed',
        newStatus: 'cancelled',
        reason: 'Restaurant closed early',
      });

      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      expect(emailChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Cancelled'),
        }),
      );
    });
  });
});

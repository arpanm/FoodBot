import pino from 'pino';

import { EmailChannel } from '../channels/email.channel';
import { PushChannel } from '../channels/push.channel';
import { SmsChannel } from '../channels/sms.channel';
import { WebSocketChannel } from '../channels/websocket.channel';

const logger = pino({ name: 'OrderEventConsumer' });

interface OrderCreatedData {
  orderId: string;
  userId: string;
  restaurantId: string;
  total: number;
  estimatedDeliveryTime: string;
}

interface OrderStatusChangedData {
  orderId: string;
  userId: string;
  restaurantId: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}

/**
 * Consumes order events and dispatches notifications.
 *
 * Topics:
 * - order.created        -> Email confirmation + WebSocket update
 * - order.status.changed -> SMS/push for delivery updates + WebSocket
 */
export class OrderEventConsumer {
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly webSocketChannel: WebSocketChannel,
    private readonly pushChannel: PushChannel,
  ) {}

  async handleOrderCreated(data: OrderCreatedData): Promise<void> {
    logger.info({ orderId: data.orderId }, 'Processing order.created notification');

    // Send order confirmation email
    await this.emailChannel.send({
      to: `user-${data.userId}@foodbot.com`, // Resolved via user service in production
      subject: `Order Confirmed - #${data.orderId.slice(0, 8)}`,
      body: `Your order of $${data.total.toFixed(2)} has been placed. Estimated delivery: ${data.estimatedDeliveryTime}`,
    });

    // Broadcast real-time update to the user
    await this.webSocketChannel.broadcast({
      userId: data.userId,
      event: 'order.created',
      data: {
        orderId: data.orderId,
        total: data.total,
        estimatedDeliveryTime: data.estimatedDeliveryTime,
      },
    });

    logger.info({ orderId: data.orderId }, 'Order created notifications dispatched');
  }

  async handleOrderStatusChanged(data: OrderStatusChangedData): Promise<void> {
    logger.info(
      { orderId: data.orderId, newStatus: data.newStatus },
      'Processing order.status.changed notification',
    );

    // Broadcast real-time status update
    await this.webSocketChannel.broadcast({
      userId: data.userId,
      event: 'order.status.changed',
      data: {
        orderId: data.orderId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
      },
    });

    // Status-specific notifications
    switch (data.newStatus) {
      case 'preparing':
        await this.pushChannel.send({
          userId: data.userId,
          title: 'Order Being Prepared',
          body: `Your order #${data.orderId.slice(0, 8)} is being prepared.`,
        });
        break;

      case 'out_for_delivery':
      case 'out-for-delivery':
        await this.smsChannel.send({
          phoneNumber: '', // Resolved via user service in production
          message: `Your FoodBot order #${data.orderId.slice(0, 8)} is out for delivery!`,
        });
        await this.pushChannel.send({
          userId: data.userId,
          title: 'Out for Delivery',
          body: `Your order #${data.orderId.slice(0, 8)} is on its way!`,
        });
        break;

      case 'delivered':
        await this.emailChannel.send({
          to: `user-${data.userId}@foodbot.com`,
          subject: `Order Delivered - #${data.orderId.slice(0, 8)}`,
          body: 'Your order has been delivered. Enjoy your meal! Please leave a review.',
        });
        await this.pushChannel.send({
          userId: data.userId,
          title: 'Order Delivered',
          body: 'Your order has arrived. Enjoy your meal!',
        });
        break;

      case 'cancelled':
        await this.emailChannel.send({
          to: `user-${data.userId}@foodbot.com`,
          subject: `Order Cancelled - #${data.orderId.slice(0, 8)}`,
          body: `Your order has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ''}`,
        });
        break;

      default:
        break;
    }

    logger.info(
      { orderId: data.orderId, newStatus: data.newStatus },
      'Order status change notifications dispatched',
    );
  }
}

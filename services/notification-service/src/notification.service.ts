import pino from 'pino';

import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { SmsChannel } from './channels/sms.channel';
import { WebSocketChannel } from './channels/websocket.channel';
import { OrderEventConsumer } from './consumers/order-event.consumer';
import { PaymentEventConsumer } from './consumers/payment-event.consumer';
import { UserEventConsumer } from './consumers/user-event.consumer';

const logger = pino({ name: 'NotificationService' });

/**
 * Orchestrates notification consumers and delivery channels.
 */
export class NotificationService {
  private readonly emailChannel: EmailChannel;
  private readonly smsChannel: SmsChannel;
  private readonly webSocketChannel: WebSocketChannel;
  private readonly pushChannel: PushChannel;

  private readonly orderConsumer: OrderEventConsumer;
  private readonly paymentConsumer: PaymentEventConsumer;
  private readonly userConsumer: UserEventConsumer;

  constructor() {
    this.emailChannel = new EmailChannel();
    this.smsChannel = new SmsChannel();
    this.webSocketChannel = new WebSocketChannel();
    this.pushChannel = new PushChannel();

    this.orderConsumer = new OrderEventConsumer(
      this.emailChannel,
      this.smsChannel,
      this.webSocketChannel,
      this.pushChannel,
    );
    this.paymentConsumer = new PaymentEventConsumer(this.emailChannel);
    this.userConsumer = new UserEventConsumer(this.emailChannel);
  }

  async start(): Promise<void> {
    logger.info('Starting notification service...');

    await this.webSocketChannel.start();

    logger.info('Notification service started - consumers ready');
    logger.info('Subscribed topics: order.created, order.status.changed, payment.completed, user.registered');
  }

  async stop(): Promise<void> {
    logger.info('Stopping notification service...');
    await this.webSocketChannel.stop();
    logger.info('Notification service stopped');
  }

  /** Expose consumers for testing */
  getOrderConsumer(): OrderEventConsumer {
    return this.orderConsumer;
  }

  getPaymentConsumer(): PaymentEventConsumer {
    return this.paymentConsumer;
  }

  getUserConsumer(): UserEventConsumer {
    return this.userConsumer;
  }
}

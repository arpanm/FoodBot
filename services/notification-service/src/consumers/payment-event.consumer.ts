import pino from 'pino';

import { EmailChannel } from '../channels/email.channel';

const logger = pino({ name: 'PaymentEventConsumer' });

interface PaymentCompletedData {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
}

/**
 * Consumes payment events and dispatches notifications.
 *
 * Topics:
 * - payment.completed -> Email receipt
 */
export class PaymentEventConsumer {
  constructor(private readonly emailChannel: EmailChannel) {}

  async handlePaymentCompleted(data: PaymentCompletedData): Promise<void> {
    logger.info(
      { paymentId: data.paymentId, orderId: data.orderId },
      'Processing payment.completed notification',
    );

    await this.emailChannel.send({
      to: `user-${data.userId}@foodbot.com`,
      subject: `Payment Receipt - Order #${data.orderId.slice(0, 8)}`,
      body: `Payment of $${data.amount.toFixed(2)} via ${data.paymentMethod} has been processed successfully. Payment ID: ${data.paymentId}`,
    });

    logger.info(
      { paymentId: data.paymentId },
      'Payment completed notification dispatched',
    );
  }
}

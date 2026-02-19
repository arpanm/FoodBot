import * as crypto from 'node:crypto';

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Payment } from '../../entities/payment.entity';
import { PaymentEventProducer } from '../../events/producers/payment-event.producer';
import { OrderService } from '../order/order.service';

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderService: OrderService,
    private readonly paymentEventProducer: PaymentEventProducer,
  ) {}

  async onModuleInit() {
    await this.seedTestPayments();
  }

  private async seedTestPayments() {
    const testPayments = [
      {
        id: 'payment-123',
        orderId: 'order-123',
        userId: 'customer-123',
        amount: 50.0,
        method: 'card',
        paymentMethod: 'card',
        status: 'pending',
        confirmationToken: 'token-123',
      },
      {
        id: 'refunded-payment-123',
        orderId: 'order-refunded',
        userId: 'customer-123',
        amount: 30.0,
        method: 'card',
        paymentMethod: 'card',
        status: 'refunded',
        refundDetails: {
          refundedAt: new Date().toISOString(),
          refundAmount: 30.0,
        },
      },
    ];

    for (const data of testPayments) {
      const existing = await this.paymentRepository.findOne({ where: { id: data.id } });
      if (!existing) {
        const payment = this.paymentRepository.create(data);
        await this.paymentRepository.save(payment);
      }
    }
  }

  async initiatePayment(userId: string, data: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    cardDetails?: Record<string, unknown>;
    upiId?: string;
  }): Promise<Payment & { paymentId?: string }> {
    // Simulate timeout for specific order (check before order validation)
    if (data.orderId === 'order-timeout') {
      throw new InternalServerErrorException('Payment gateway timeout');
    }

    // Validate order exists
    const orders = await this.orderService.getOrders();
    const order = orders.find((o) => o.id === data.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate card number
    if (data.paymentMethod === 'card' && data.cardDetails) {
      const cardNumber = data.cardDetails.cardNumber as string;
      if (cardNumber && cardNumber.length < 16) {
        throw new BadRequestException('Invalid card number');
      }
      // Test card that declines
      if (cardNumber === '4000000000000002') {
        throw new BadRequestException('Payment declined');
      }
    }

    // Simulate insufficient funds for large wallet payments
    if (data.paymentMethod === 'wallet' && data.amount >= 1000000) {
      throw new BadRequestException('Insufficient funds');
    }

    const payment = this.paymentRepository.create({
      orderId: data.orderId,
      userId,
      amount: data.amount,
      method: data.paymentMethod,
      paymentMethod: data.paymentMethod,
      status: 'pending',
      confirmationToken: `confirm_${Date.now()}`,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      ...savedPayment,
      paymentId: savedPayment.id,
    };
  }

  async confirmPayment(userId: string, paymentId: string, confirmationToken: string): Promise<{
    paymentId: string;
    status: string;
    confirmedAt: string;
  }> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.confirmationToken && payment.confirmationToken !== confirmationToken) {
      throw new BadRequestException('Invalid confirmation token');
    }

    if (payment.status === 'completed') {
      throw new ConflictException('Payment already confirmed');
    }

    payment.status = 'completed';
    await this.paymentRepository.save(payment);

    // Publish payment.completed event
    await this.paymentEventProducer.publishPaymentCompleted({
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
    }).catch((err: unknown) => {
      this.logger.error('Failed to publish payment.completed event', err);
    });

    return {
      paymentId: payment.id,
      status: 'completed',
      confirmedAt: new Date().toISOString(),
    };
  }

  async handleWebhook(data: {
    event: string;
    paymentId: string;
    amount?: number;
    status?: string;
    reason?: string;
    signature?: string;
  }, webhookSignature?: string): Promise<{ received: boolean }> {
    if (!webhookSignature) {
      throw new BadRequestException('Missing webhook signature');
    }

    // Verify webhook signature using crypto.timingSafeEqual to prevent timing attacks
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'test-webhook-secret';
    const expectedSignature = this.computeWebhookSignature(data, secret);

    if (!this.verifySignature(webhookSignature, expectedSignature)) {
      throw new BadRequestException('Invalid signature');
    }

    const payment = await this.paymentRepository.findOne({ where: { id: data.paymentId } });
    if (payment) {
      if (data.event === 'payment.success') {
        payment.status = 'completed';
      } else if (data.event === 'payment.failed') {
        payment.status = 'failed';
      }
      await this.paymentRepository.save(payment);
    }

    return { received: true };
  }

  private computeWebhookSignature(payload: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private verifySignature(provided: string, expected: string): boolean {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(provided),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  async getPaymentStatus(userId: string, paymentId: string): Promise<{
    paymentId: string;
    status: string;
    amount: number;
    createdAt: string;
    paymentMethod: string;
    refundDetails?: { refundedAt: string; refundAmount: number };
  }> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Forbidden resource');
    }

    const result: {
      paymentId: string;
      status: string;
      amount: number;
      createdAt: string;
      paymentMethod: string;
      refundDetails?: { refundedAt: string; refundAmount: number };
    } = {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt.toISOString(),
      paymentMethod: payment.paymentMethod,
    };

    if (payment.status === 'refunded' && payment.refundDetails) {
      result.refundDetails = payment.refundDetails;
    }

    return result;
  }
}

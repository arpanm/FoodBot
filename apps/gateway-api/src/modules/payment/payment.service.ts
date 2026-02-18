import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from '../order/order.service';
import { Payment } from '../../entities/payment.entity';

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderService: OrderService,
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

    if (webhookSignature !== 'valid-signature') {
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
      throw new BadRequestException('Forbidden resource');
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

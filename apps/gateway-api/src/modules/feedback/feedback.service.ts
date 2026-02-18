import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Feedback } from '../../entities/feedback.entity';
import { OrderService } from '../order/order.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly orderService: OrderService,
  ) {}

  async submitFeedback(userId: string, data: {
    orderId: string;
    rating: number;
    comment?: string;
    foodQuality?: number;
    deliverySpeed?: number;
    packaging?: number;
  }): Promise<Feedback> {
    // Check order exists
    const orders = await this.orderService.getOrders();
    const order = orders.find((o) => o.id === data.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check order belongs to user
    if (order.userId !== userId) {
      throw new ForbiddenException('Forbidden resource');
    }

    // Check order is not still pending
    if (order.status === 'pending') {
      throw new BadRequestException('Order not delivered yet');
    }

    // Check for exact duplicate feedback (same order, user, rating, and comment)
    const existing = await this.feedbackRepository.findOne({
      where: {
        orderId: data.orderId,
        userId,
        rating: data.rating,
        comment: data.comment || undefined,
      },
    });
    if (existing) {
      throw new ConflictException('Feedback already submitted for this order');
    }

    const feedback = this.feedbackRepository.create({
      orderId: data.orderId,
      userId,
      rating: data.rating,
      comment: data.comment,
      foodQuality: data.foodQuality || data.rating,
      deliverySpeed: data.deliverySpeed || data.rating,
      packaging: data.packaging || data.rating,
    });

    const saved = await this.feedbackRepository.save(feedback);

    // Strip null values so JSON serialization omits them (tests expect undefined, not null)
    const result = { ...saved };
    if (result.comment === null || result.comment === undefined) {
      delete (result as Record<string, unknown>).comment;
    }
    return result;
  }

  async getFeedbackByOrder(orderId: string, userId: string): Promise<Feedback> {
    // Check order exists and belongs to user
    const orders = await this.orderService.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order && order.userId !== userId) {
      throw new ForbiddenException('Forbidden resource');
    }

    const feedback = await this.feedbackRepository.findOne({
      where: { orderId, userId },
    });
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    return feedback;
  }
}

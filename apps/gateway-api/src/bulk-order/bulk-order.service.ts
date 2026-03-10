import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BulkOrderItem } from '../entities/bulk-order-item.entity';
import { BulkOrder, BulkOrderStatus } from '../entities/bulk-order.entity';

import { BulkDeliveryService } from './bulk-delivery.service';
import { BulkPricingService } from './bulk-pricing.service';
import { CapacityValidatorService } from './capacity-validator.service';
import { AddBulkItemDto } from './dto/add-bulk-item.dto';
import { CreateBulkOrderDto } from './dto/create-bulk-order.dto';
import {
  BulkOrderItemResponse,
  BulkOrderResponse,
  PricingBreakdownResponse,
  ItemPricingResponse,
} from './dto/bulk-order-response.dto';

@Injectable()
export class BulkOrderService {
  private readonly logger = new Logger(BulkOrderService.name);

  constructor(
    @InjectRepository(BulkOrder)
    private readonly orderRepository: Repository<BulkOrder>,
    @InjectRepository(BulkOrderItem)
    private readonly itemRepository: Repository<BulkOrderItem>,
    private readonly pricingService: BulkPricingService,
    private readonly deliveryService: BulkDeliveryService,
    private readonly capacityValidator: CapacityValidatorService,
  ) {}

  async create(
    userId: string,
    dto: CreateBulkOrderDto
  ): Promise<BulkOrderResponse> {
    const order = this.orderRepository.create({
      userId,
      organizationName: dto.organizationName,
      orderType: dto.orderType,
      deliveryAddress: dto.deliveryAddress,
      deliveryDate: dto.deliveryDate,
      deliveryTime: dto.deliveryTime,
      specialInstructions: dto.specialInstructions ?? null,
      status: BulkOrderStatus.DRAFT,
      totalItems: 0,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      deliveryFee: 0,
      totalAmount: 0,
    });

    const saved = await this.orderRepository.save(order);
    this.logger.log(`Bulk order ${saved.id} created by user ${userId}`);
    return this.toResponse(saved, []);
  }

  async findAll(userId: string): Promise<BulkOrderResponse[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const responses: BulkOrderResponse[] = [];
    for (const order of orders) {
      const items = await this.itemRepository.find({
        where: { bulkOrderId: order.id },
      });
      responses.push(this.toResponse(order, items));
    }

    return responses;
  }

  async findById(
    orderId: string,
    userId: string
  ): Promise<BulkOrderResponse> {
    const order = await this.getOrderWithAuth(orderId, userId);
    const items = await this.itemRepository.find({
      where: { bulkOrderId: order.id },
    });
    return this.toResponse(order, items);
  }

  async addItem(
    orderId: string,
    userId: string,
    dto: AddBulkItemDto
  ): Promise<BulkOrderResponse> {
    const order = await this.getOrderWithAuth(orderId, userId);
    this.validateDraftStatus(order);

    const priceResult = this.pricingService.calculateBulkPrice(
      dto.unitPrice,
      dto.quantity
    );

    const item = this.itemRepository.create({
      bulkOrderId: order.id,
      restaurantId: dto.restaurantId,
      restaurantName: dto.restaurantName,
      dishId: dto.dishId,
      dishName: dto.dishName,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      totalPrice: priceResult.discountedTotal,
      quantityTier: priceResult.quantityTier,
      discountPercentage: priceResult.discountPercentage,
      notes: dto.notes ?? null,
    });

    await this.itemRepository.save(item);
    return this.recalculateAndReturn(order);
  }

  async removeItem(
    orderId: string,
    userId: string,
    itemId: string
  ): Promise<BulkOrderResponse> {
    const order = await this.getOrderWithAuth(orderId, userId);
    this.validateDraftStatus(order);

    const item = await this.itemRepository.findOne({
      where: { id: itemId, bulkOrderId: orderId },
    });

    if (!item) {
      throw new NotFoundException('Item not found in this bulk order');
    }

    await this.itemRepository.remove(item);
    return this.recalculateAndReturn(order);
  }

  async confirmOrder(
    orderId: string,
    userId: string
  ): Promise<BulkOrderResponse> {
    const order = await this.getOrderWithAuth(orderId, userId);
    this.validateDraftStatus(order);

    const items = await this.itemRepository.find({
      where: { bulkOrderId: order.id },
    });

    if (items.length === 0) {
      throw new BadRequestException(
        'Cannot confirm an order with no items'
      );
    }

    this.pricingService.validateMinimumOrder(items.length);

    const capacityInputs = items.map((item) => ({
      restaurantId: item.restaurantId,
      dishId: item.dishId,
      quantity: item.quantity,
    }));
    this.capacityValidator.validateAllCapacity(capacityInputs);

    this.deliveryService.validateDeliverySlot(
      order.deliveryDate,
      order.deliveryTime
    );

    order.status = BulkOrderStatus.CONFIRMED;
    await this.orderRepository.save(order);

    this.logger.log(`Bulk order ${orderId} confirmed by user ${userId}`);
    return this.toResponse(order, items);
  }

  async cancelOrder(
    orderId: string,
    userId: string
  ): Promise<BulkOrderResponse> {
    const order = await this.getOrderWithAuth(orderId, userId);

    if (order.status === BulkOrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered order');
    }
    if (order.status === BulkOrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    order.status = BulkOrderStatus.CANCELLED;
    const saved = await this.orderRepository.save(order);

    const items = await this.itemRepository.find({
      where: { bulkOrderId: saved.id },
    });

    this.logger.log(`Bulk order ${orderId} cancelled by user ${userId}`);
    return this.toResponse(saved, items);
  }

  async getPricingBreakdown(
    orderId: string,
    userId: string
  ): Promise<PricingBreakdownResponse> {
    await this.getOrderWithAuth(orderId, userId);

    const items = await this.itemRepository.find({
      where: { bulkOrderId: orderId },
    });

    const itemPricings: ItemPricingResponse[] = items.map((item) =>
      this.buildItemPricing(item)
    );

    const subtotal = this.sumField(items, 'totalPrice');
    const originalTotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );
    const discountAmount = this.round(originalTotal - subtotal);
    const taxAmount = this.pricingService.calculateTax(subtotal);

    const restaurantIds = items.map((item) => item.restaurantId);
    const restaurantCount = this.deliveryService.getUniqueRestaurantCount(restaurantIds);
    const deliveryFee = this.deliveryService.calculateDeliveryFee(restaurantCount);

    const totalAmount = this.round(subtotal + taxAmount + deliveryFee);

    return {
      subtotal: this.round(subtotal),
      discountAmount,
      taxRate: this.pricingService.getTaxRate(),
      taxAmount,
      deliveryFee,
      totalAmount,
      items: itemPricings,
    };
  }

  async calculateTotals(order: BulkOrder): Promise<BulkOrder> {
    const items = await this.itemRepository.find({
      where: { bulkOrderId: order.id },
    });

    const subtotal = this.sumField(items, 'totalPrice');
    const originalTotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

    const restaurantIds = items.map((item) => item.restaurantId);
    const restaurantCount = this.deliveryService.getUniqueRestaurantCount(restaurantIds);

    order.totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    order.subtotal = this.round(subtotal);
    order.discountAmount = this.round(originalTotal - subtotal);
    order.taxAmount = this.pricingService.calculateTax(subtotal);
    order.deliveryFee = this.deliveryService.calculateDeliveryFee(restaurantCount);
    order.totalAmount = this.round(
      order.subtotal + order.taxAmount + order.deliveryFee
    );

    return this.orderRepository.save(order);
  }

  async getOrderWithAuth(
    orderId: string,
    userId: string
  ): Promise<BulkOrder> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Bulk order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this bulk order'
      );
    }

    return order;
  }

  private validateDraftStatus(order: BulkOrder): void {
    if (order.status !== BulkOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Can only modify orders in draft status'
      );
    }
  }

  private async recalculateAndReturn(
    order: BulkOrder
  ): Promise<BulkOrderResponse> {
    const updated = await this.calculateTotals(order);
    const items = await this.itemRepository.find({
      where: { bulkOrderId: updated.id },
    });
    return this.toResponse(updated, items);
  }

  private buildItemPricing(item: BulkOrderItem): ItemPricingResponse {
    const originalPrice = this.round(Number(item.unitPrice) * item.quantity);
    return {
      dishId: item.dishId,
      dishName: item.dishName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      quantityTier: item.quantityTier,
      discountPercentage: Number(item.discountPercentage),
      originalPrice,
      discountedPrice: Number(item.totalPrice),
    };
  }

  private sumField(
    items: BulkOrderItem[],
    field: 'totalPrice' | 'unitPrice'
  ): number {
    return items.reduce((sum, item) => sum + Number(item[field]), 0);
  }

  private toResponse(
    order: BulkOrder,
    items: BulkOrderItem[]
  ): BulkOrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      organizationName: order.organizationName,
      orderType: order.orderType,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      specialInstructions: order.specialInstructions,
      totalItems: order.totalItems,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      taxAmount: Number(order.taxAmount),
      deliveryFee: Number(order.deliveryFee),
      totalAmount: Number(order.totalAmount),
      items: items.map((item) => this.toItemResponse(item)),
      createdAt: order.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  private toItemResponse(item: BulkOrderItem): BulkOrderItemResponse {
    return {
      id: item.id,
      bulkOrderId: item.bulkOrderId,
      restaurantId: item.restaurantId,
      restaurantName: item.restaurantName,
      dishId: item.dishId,
      dishName: item.dishName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      quantityTier: item.quantityTier,
      discountPercentage: Number(item.discountPercentage),
      notes: item.notes,
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

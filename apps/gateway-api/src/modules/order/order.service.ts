import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrderItem } from '../../entities/order-item.entity';
import { Order } from '../../entities/order.entity';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'out-for-delivery'],
  'out_for_delivery': ['delivered'],
  'out-for-delivery': ['delivered'],
  delivered: [],
  cancelled: ['pending', 'confirmed', 'preparing'],
};

const VALID_PAYMENT_METHODS = ['card', 'cash', 'upi', 'wallet'];

@Injectable()
export class OrderService implements OnModuleInit {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async onModuleInit() {
    await this.seedTestOrders();
  }

  private async seedTestOrders() {
    const testOrders = [
      {
        id: 'order-123',
        userId: 'customer-123',
        restaurantId: 'restaurant-123',
        subtotal: 25.98,
        deliveryFee: 3.99,
        tax: 2.60,
        discount: 0,
        total: 32.57,
        status: 'confirmed',
        paymentMethod: 'card',
        paymentStatus: 'pending',
        deliveryAddress: { street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94105', country: 'USA' },
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
        trackingUpdates: [
          { status: 'pending', message: 'Order placed successfully', timestamp: new Date() },
        ],
      },
      {
        id: 'delivered-order-123',
        userId: 'customer-123',
        restaurantId: 'restaurant-123',
        subtotal: 12.99,
        deliveryFee: 3.99,
        tax: 1.30,
        discount: 0,
        total: 18.28,
        status: 'delivered',
        paymentMethod: 'card',
        paymentStatus: 'completed',
        deliveryAddress: { street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94105', country: 'USA' },
        estimatedDeliveryTime: new Date(Date.now() - 30 * 60 * 1000),
        actualDeliveryTime: new Date(),
        trackingUpdates: [
          { status: 'pending', message: 'Order placed', timestamp: new Date(Date.now() - 60 * 60 * 1000) },
          { status: 'delivered', message: 'Order delivered', timestamp: new Date() },
        ],
      },
      {
        id: 'pending-order-123',
        userId: 'customer-123',
        restaurantId: 'restaurant-123',
        subtotal: 12.99,
        deliveryFee: 3.99,
        tax: 1.30,
        discount: 0,
        total: 18.28,
        status: 'pending',
        paymentMethod: 'card',
        paymentStatus: 'pending',
        deliveryAddress: { street: '456 Elm St', city: 'SF', state: 'CA', zipCode: '94105', country: 'USA' },
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
        trackingUpdates: [
          { status: 'pending', message: 'Order placed', timestamp: new Date() },
        ],
      },
    ];

    const orderItems = [
      { orderId: 'order-123', dishId: 'dish-123', dishName: 'Pizza', quantity: 2, price: 12.99 },
      { orderId: 'delivered-order-123', dishId: 'dish-123', dishName: 'Pizza', quantity: 1, price: 12.99 },
      { orderId: 'pending-order-123', dishId: 'dish-123', dishName: 'Pizza', quantity: 1, price: 12.99 },
    ];

    for (const data of testOrders) {
      const existing = await this.orderRepository.findOne({ where: { id: data.id } });
      if (!existing) {
        const order = this.orderRepository.create(data);
        await this.orderRepository.save(order);
      }
    }

    for (const data of orderItems) {
      const existingItems = await this.orderItemRepository.find({ where: { orderId: data.orderId } });
      if (existingItems.length === 0) {
        const item = this.orderItemRepository.create(data);
        await this.orderItemRepository.save(item);
      }
    }
  }

  async getOrders(): Promise<Order[]> {
    return this.orderRepository.find({ relations: ['items'] });
  }

  async create(userId: string, data: {
    restaurantId: string;
    items: { dishId: string; dishName?: string; quantity: number; price: number; specialInstructions?: string }[];
    deliveryAddress: Record<string, unknown>;
    paymentMethod: string;
    specialInstructions?: string;
  }): Promise<Order> {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    if (!VALID_PAYMENT_METHODS.includes(data.paymentMethod)) {
      throw new BadRequestException('Invalid paymentMethod. Must be one of: card, cash, upi, wallet');
    }

    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = 3.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;

    const order = this.orderRepository.create({
      userId,
      restaurantId: data.restaurantId,
      subtotal,
      deliveryFee,
      tax,
      discount: 0,
      total: subtotal + deliveryFee + tax,
      status: 'pending',
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      deliveryAddress: data.deliveryAddress,
      specialInstructions: data.specialInstructions,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
      trackingUpdates: [
        { status: 'pending', message: 'Order placed successfully', timestamp: new Date() },
      ],
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    const items: OrderItem[] = [];
    for (const itemData of data.items) {
      const item = this.orderItemRepository.create({
        orderId: savedOrder.id,
        dishId: itemData.dishId,
        dishName: itemData.dishName || 'Unknown Dish',
        quantity: itemData.quantity,
        price: itemData.price,
        specialInstructions: itemData.specialInstructions,
      });
      const savedItem = await this.orderItemRepository.save(item);
      items.push(savedItem);
    }

    savedOrder.items = items;
    return savedOrder;
  }

  async findByUser(userId: string, filters: { status?: string; page?: number; limit?: number }): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    let allOrders = await this.orderRepository.find({
      where: { userId },
      relations: ['items'],
    });

    if (filters.status) {
      allOrders = allOrders.filter((o) => o.status === filters.status);
    }

    const total = allOrders.length;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;
    const paginated = allOrders.slice(start, start + limit);

    return { orders: paginated, total, page, limit };
  }

  async findById(id: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Forbidden resource');
    }
    return order;
  }

  async getTracking(id: string, userId: string): Promise<{
    orderId: string;
    status: string;
    trackingUpdates: Array<{ status: string; message: string; timestamp: Date }>;
    estimatedDeliveryTime: string;
    currentLocation?: { latitude: number; longitude: number };
  }> {
    const order = await this.findById(id, userId);
    const result: {
      orderId: string;
      status: string;
      trackingUpdates: Array<{ status: string; message: string; timestamp: Date }>;
      estimatedDeliveryTime: string;
      currentLocation?: { latitude: number; longitude: number };
    } = {
      orderId: order.id,
      status: order.status,
      trackingUpdates: order.trackingUpdates,
      estimatedDeliveryTime: order.estimatedDeliveryTime.toISOString(),
    };

    if (order.status === 'out-for-delivery' || order.status === 'out_for_delivery') {
      result.currentLocation = { latitude: 37.7749, longitude: -122.4194 };
    }

    return result;
  }

  async cancelOrder(id: string, userId: string, reason?: string): Promise<Order> {
    const order = await this.findById(id, userId);
    if (order.status === 'delivered') {
      throw new BadRequestException('Cannot cancel delivered order');
    }
    order.status = 'cancelled';
    order.trackingUpdates.push({
      status: 'cancelled',
      message: reason || 'Order cancelled by user',
      timestamp: new Date(),
    });
    return this.orderRepository.save(order);
  }

  async updateStatus(id: string, newStatus: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    order.status = newStatus;
    order.trackingUpdates.push({
      status: newStatus,
      message: `Order status updated to ${newStatus}`,
      timestamp: new Date(),
    });

    if (newStatus === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    return this.orderRepository.save(order);
  }

  async findByRestaurant(restaurantId: string, filters: { status?: string; page?: number; limit?: number }): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    let allOrders = await this.orderRepository.find({
      where: { restaurantId },
      relations: ['items'],
    });

    if (filters.status) {
      allOrders = allOrders.filter((o) => o.status === filters.status);
    }

    const total = allOrders.length;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;
    const paginated = allOrders.slice(start, start + limit);

    return { orders: paginated, total, page, limit };
  }
}

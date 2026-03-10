import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { BulkOrderItem, QuantityTier } from '../../entities/bulk-order-item.entity';
import { BulkOrder, BulkOrderStatus, BulkOrderType } from '../../entities/bulk-order.entity';
import { BulkDeliveryService } from '../bulk-delivery.service';
import { BulkOrderService } from '../bulk-order.service';
import { BulkPricingService } from '../bulk-pricing.service';
import { CapacityValidatorService } from '../capacity-validator.service';
import { CreateBulkOrderDto } from '../dto/create-bulk-order.dto';

describe('BulkOrderService', () => {
  let service: BulkOrderService;
  let mockOrderRepository: Record<string, jest.Mock>;
  let mockItemRepository: Record<string, jest.Mock>;
  let pricingService: BulkPricingService;
  let deliveryService: BulkDeliveryService;
  let capacityValidator: CapacityValidatorService;

  const userId = 'user-123';
  const otherUserId = 'user-456';
  const orderId = 'order-123';

  function buildMockOrder(overrides?: Partial<BulkOrder>): BulkOrder {
    return {
      id: orderId,
      userId,
      organizationName: 'Acme Corp',
      orderType: BulkOrderType.CORPORATE,
      status: BulkOrderStatus.DRAFT,
      deliveryAddress: '123 Main St',
      deliveryDate: '2026-04-01',
      deliveryTime: '12:00',
      specialInstructions: null,
      totalItems: 0,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      deliveryFee: 0,
      totalAmount: 0,
      items: [],
      createdAt: new Date('2026-02-20'),
      updatedAt: new Date('2026-02-20'),
      user: {} as BulkOrder['user'],
      ...overrides,
    };
  }

  function buildMockItem(overrides?: Partial<BulkOrderItem>): BulkOrderItem {
    return {
      id: 'item-1',
      bulkOrderId: orderId,
      restaurantId: 'rest-1',
      restaurantName: 'Test Restaurant',
      dishId: 'dish-1',
      dishName: 'Test Dish',
      quantity: 10,
      unitPrice: 10,
      totalPrice: 95,
      quantityTier: QuantityTier.BULK_10,
      discountPercentage: 5,
      notes: null,
      bulkOrder: {} as BulkOrderItem['bulkOrder'],
      ...overrides,
    };
  }

  beforeEach(() => {
    mockOrderRepository = {
      create: jest.fn((data: Partial<BulkOrder>) => ({
        ...data,
        id: orderId,
      })),
      save: jest.fn((entity: BulkOrder) =>
        Promise.resolve({
          ...entity,
          createdAt: new Date('2026-02-20'),
          updatedAt: new Date('2026-02-20'),
        })
      ),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
    };

    mockItemRepository = {
      create: jest.fn((data: Partial<BulkOrderItem>) => ({
        id: 'item-new',
        ...data,
      })),
      save: jest.fn((entity: BulkOrderItem) =>
        Promise.resolve({ ...entity })
      ),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
      remove: jest.fn(() => Promise.resolve(undefined)),
    };

    pricingService = new BulkPricingService();
    deliveryService = new BulkDeliveryService();
    capacityValidator = new CapacityValidatorService();

    service = new BulkOrderService(
      mockOrderRepository as never,
      mockItemRepository as never,
      pricingService,
      deliveryService,
      capacityValidator,
    );
  });

  describe('create', () => {
    const createDto: CreateBulkOrderDto = {
      organizationName: 'Acme Corp',
      orderType: BulkOrderType.CORPORATE,
      deliveryAddress: '123 Main St',
      deliveryDate: '2026-04-01',
      deliveryTime: '12:00',
    };

    it('should create a bulk order successfully', async () => {
      const result = await service.create(userId, createDto);

      expect(result.organizationName).toBe('Acme Corp');
      expect(result.userId).toBe(userId);
      expect(result.status).toBe(BulkOrderStatus.DRAFT);
      expect(result.items).toHaveLength(0);
      expect(mockOrderRepository.create).toHaveBeenCalledTimes(1);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should set specialInstructions to null if not provided', async () => {
      const result = await service.create(userId, createDto);
      expect(result.specialInstructions).toBeNull();
    });

    it('should include specialInstructions when provided', async () => {
      const dtoWithInstructions = {
        ...createDto,
        specialInstructions: 'Handle with care',
      };

      mockOrderRepository.save.mockImplementation(
        (entity: Partial<BulkOrder>) =>
          Promise.resolve({
            ...entity,
            createdAt: new Date('2026-02-20'),
            updatedAt: new Date('2026-02-20'),
          })
      );

      const result = await service.create(userId, dtoWithInstructions);
      expect(result.specialInstructions).toBe('Handle with care');
    });
  });

  describe('findAll', () => {
    it('should return all orders for a user', async () => {
      mockOrderRepository.find.mockResolvedValue([buildMockOrder()]);
      mockItemRepository.find.mockResolvedValue([]);

      const results = await service.findAll(userId);

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(userId);
      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no orders exist', async () => {
      mockOrderRepository.find.mockResolvedValue([]);
      const results = await service.findAll(userId);
      expect(results).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return an order when found and user authorized', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.find.mockResolvedValue([]);

      const result = await service.findById(orderId, userId);

      expect(result.id).toBe(orderId);
      expect(result.organizationName).toBe('Acme Corp');
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById('nonexistent', userId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());

      await expect(
        service.findById(orderId, otherUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addItem', () => {
    const addItemDto = {
      restaurantId: 'rest-1',
      restaurantName: 'Test Restaurant',
      dishId: 'dish-1',
      dishName: 'Burger',
      quantity: 15,
      unitPrice: 10,
    };

    it('should add an item to a draft order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.find.mockResolvedValue([buildMockItem()]);

      const result = await service.addItem(orderId, userId, addItemDto);

      expect(mockItemRepository.create).toHaveBeenCalledTimes(1);
      expect(mockItemRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for non-draft order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(
        buildMockOrder({ status: BulkOrderStatus.CONFIRMED })
      );

      await expect(
        service.addItem(orderId, userId, addItemDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());

      await expect(
        service.addItem(orderId, otherUserId, addItemDto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from a draft order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.findOne.mockResolvedValue(buildMockItem());
      mockItemRepository.find.mockResolvedValue([]);

      const result = await service.removeItem(orderId, userId, 'item-1');

      expect(mockItemRepository.remove).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when item not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem(orderId, userId, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-draft order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(
        buildMockOrder({ status: BulkOrderStatus.PROCESSING })
      );

      await expect(
        service.removeItem(orderId, userId, 'item-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmOrder', () => {
    it('should confirm a draft order with items', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateStr = futureDate.toISOString().split('T')[0];

      const order = buildMockOrder({
        deliveryDate: dateStr,
        deliveryTime: '12:00',
      });
      mockOrderRepository.findOne.mockResolvedValue(order);
      mockItemRepository.find.mockResolvedValue([buildMockItem()]);

      const result = await service.confirmOrder(orderId, userId);

      expect(result.status).toBe(BulkOrderStatus.CONFIRMED);
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for order with no items', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.find.mockResolvedValue([]);

      await expect(
        service.confirmOrder(orderId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-draft order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(
        buildMockOrder({ status: BulkOrderStatus.CONFIRMED })
      );

      await expect(
        service.confirmOrder(orderId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());

      await expect(
        service.confirmOrder(orderId, otherUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a draft order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.find.mockResolvedValue([]);

      const result = await service.cancelOrder(orderId, userId);

      expect(result.status).toBe(BulkOrderStatus.CANCELLED);
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('should cancel a confirmed order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(
        buildMockOrder({ status: BulkOrderStatus.CONFIRMED })
      );
      mockItemRepository.find.mockResolvedValue([]);

      const result = await service.cancelOrder(orderId, userId);
      expect(result.status).toBe(BulkOrderStatus.CANCELLED);
    });

    it('should throw BadRequestException for delivered order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(
        buildMockOrder({ status: BulkOrderStatus.DELIVERED })
      );

      await expect(
        service.cancelOrder(orderId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already cancelled order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(
        buildMockOrder({ status: BulkOrderStatus.CANCELLED })
      );

      await expect(
        service.cancelOrder(orderId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());

      await expect(
        service.cancelOrder(orderId, otherUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPricingBreakdown', () => {
    it('should return pricing breakdown with items', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.find.mockResolvedValue([
        buildMockItem({
          unitPrice: 10,
          quantity: 15,
          totalPrice: 142.5,
          quantityTier: QuantityTier.BULK_10,
          discountPercentage: 5,
        }),
      ]);

      const result = await service.getPricingBreakdown(orderId, userId);

      expect(result.subtotal).toBeDefined();
      expect(result.discountAmount).toBeDefined();
      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBeDefined();
      expect(result.deliveryFee).toBeDefined();
      expect(result.totalAmount).toBeDefined();
      expect(result.items).toHaveLength(1);
    });

    it('should return empty breakdown for no items', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());
      mockItemRepository.find.mockResolvedValue([]);

      const result = await service.getPricingBreakdown(orderId, userId);

      expect(result.subtotal).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should throw NotFoundException for missing order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getPricingBreakdown('nonexistent', userId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateTotals', () => {
    it('should recalculate totals based on items', async () => {
      const order = buildMockOrder();
      mockItemRepository.find.mockResolvedValue([
        buildMockItem({
          unitPrice: 10,
          quantity: 15,
          totalPrice: 142.5,
          restaurantId: 'rest-1',
        }),
        buildMockItem({
          id: 'item-2',
          unitPrice: 20,
          quantity: 10,
          totalPrice: 190,
          restaurantId: 'rest-2',
        }),
      ]);

      await service.calculateTotals(order);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalItems: 25,
        })
      );
    });

    it('should handle empty items', async () => {
      const order = buildMockOrder();
      mockItemRepository.find.mockResolvedValue([]);

      await service.calculateTotals(order);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalItems: 0,
          subtotal: 0,
        })
      );
    });
  });

  describe('getOrderWithAuth', () => {
    it('should return order for authorized user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());

      const order = await service.getOrderWithAuth(orderId, userId);
      expect(order.id).toBe(orderId);
    });

    it('should throw NotFoundException when order missing', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getOrderWithAuth('missing', userId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong user', async () => {
      mockOrderRepository.findOne.mockResolvedValue(buildMockOrder());

      await expect(
        service.getOrderWithAuth(orderId, otherUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

import { BadRequestException } from '@nestjs/common';

import { PartyPlanMenu, MenuCategory, DietaryType } from '../../entities/party-plan-menu.entity';
import { PartyPlan, PartyPlanStatus, EventType, ServiceType } from '../../entities/party-plan.entity';
import { OrderSchedulerService } from '../order-scheduler.service';

describe('OrderSchedulerService', () => {
  let service: OrderSchedulerService;
  let mockPlanRepository: Record<string, jest.Mock>;
  let mockMenuRepository: Record<string, jest.Mock>;

  function buildMockPlan(overrides?: Partial<PartyPlan>): PartyPlan {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    return {
      id: 'plan-123',
      userId: 'user-123',
      eventName: 'Birthday Party',
      eventDate: futureDate.toISOString().split('T')[0],
      eventTime: '18:00',
      venueAddress: '123 Party St',
      guestCount: { total: 50, veg: 20, nonVeg: 25, vegan: 5 },
      budget: { total: 5000, perPerson: 100 },
      cuisinePreferences: ['Indian'],
      coursePreferences: ['starter', 'main', 'dessert'],
      specialRequirements: null,
      eventType: EventType.BIRTHDAY,
      serviceType: ServiceType.DELIVERY,
      status: PartyPlanStatus.PLANNING,
      menuItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {} as PartyPlan['user'],
      ...overrides,
    };
  }

  function buildMenuItem(overrides?: Partial<PartyPlanMenu>): PartyPlanMenu {
    return {
      id: 'menu-1',
      partyPlanId: 'plan-123',
      dishId: 'dish-1',
      dishName: 'Butter Chicken',
      restaurantId: 'rest-1',
      restaurantName: 'Indian Kitchen',
      quantity: 50,
      pricePerUnit: 12.99,
      totalPrice: 649.50,
      category: MenuCategory.MAIN,
      dietaryType: DietaryType.NON_VEG,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      partyPlan: {} as PartyPlanMenu['partyPlan'],
      ...overrides,
    };
  }

  beforeEach(() => {
    mockPlanRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
      save: jest.fn((entity: PartyPlan) => Promise.resolve(entity)),
    };

    mockMenuRepository = {
      find: jest.fn(() => Promise.resolve([])),
    };

    service = new OrderSchedulerService(
      mockPlanRepository as any,
      mockMenuRepository as any,
    );
  });

  describe('confirmAndSchedule', () => {
    it('should confirm and schedule a plan with menu items', async () => {
      const plan = buildMockPlan();
      mockPlanRepository.findOne.mockResolvedValue(plan);
      mockMenuRepository.find.mockResolvedValue([
        buildMenuItem(),
        buildMenuItem({
          id: 'menu-2',
          restaurantId: 'rest-2',
          restaurantName: 'Pizza Place',
          totalPrice: 300,
        }),
      ]);

      const result = await service.confirmAndSchedule('plan-123');

      expect(result.partyPlanId).toBe('plan-123');
      expect(result.status).toBe('confirmed');
      expect(result.scheduledOrderTime).toBeDefined();
      expect(result.validationTime).toBeDefined();
      expect(result.restaurantOrders).toHaveLength(2);
      expect(mockPlanRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PartyPlanStatus.CONFIRMED })
      );
    });

    it('should throw when plan not found', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(
        service.confirmAndSchedule('nonexistent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when plan has no menu items', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());
      mockMenuRepository.find.mockResolvedValue([]);

      await expect(
        service.confirmAndSchedule('plan-123')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when plan is not in planning status', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.CONFIRMED })
      );

      await expect(
        service.confirmAndSchedule('plan-123')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when event is less than 24h away', async () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12);

      const plan = buildMockPlan({
        eventDate: soonDate.toISOString().split('T')[0],
        eventTime: `${String(soonDate.getHours()).padStart(2, '0')}:00`,
      });
      mockPlanRepository.findOne.mockResolvedValue(plan);

      await expect(
        service.confirmAndSchedule('plan-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelScheduledPlan', () => {
    it('should cancel a confirmed plan', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.CONFIRMED })
      );

      const result = await service.cancelScheduledPlan('plan-123');

      expect(result.status).toBe(PartyPlanStatus.CANCELLED);
    });

    it('should throw when plan not found', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelScheduledPlan('nonexistent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when cancelling a delivered plan', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.DELIVERED })
      );

      await expect(
        service.cancelScheduledPlan('plan-123')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when plan is already cancelled', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.CANCELLED })
      );

      await expect(
        service.cancelScheduledPlan('plan-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validatePlanForConfirmation', () => {
    it('should pass for valid planning status plan', () => {
      const plan = buildMockPlan();
      expect(() => service.validatePlanForConfirmation(plan)).not.toThrow();
    });

    it('should throw for non-planning status', () => {
      const plan = buildMockPlan({ status: PartyPlanStatus.CONFIRMED });
      expect(() => service.validatePlanForConfirmation(plan)).toThrow(
        BadRequestException
      );
    });
  });

  describe('calculateScheduledOrderTime', () => {
    it('should schedule 2 hours before event', () => {
      const plan = buildMockPlan({
        eventDate: '2026-03-15',
        eventTime: '18:00',
      });

      const result = service.calculateScheduledOrderTime(plan);
      const resultDate = new Date(result);
      const eventDate = new Date('2026-03-15T18:00');

      const diffMs = eventDate.getTime() - resultDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(2);
    });
  });

  describe('calculateValidationTime', () => {
    it('should set validation 24 hours before event', () => {
      const plan = buildMockPlan({
        eventDate: '2026-03-15',
        eventTime: '18:00',
      });

      const result = service.calculateValidationTime(plan);
      const resultDate = new Date(result);
      const eventDate = new Date('2026-03-15T18:00');

      const diffMs = eventDate.getTime() - resultDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(24);
    });
  });

  describe('buildRestaurantOrders', () => {
    it('should group items by restaurant', () => {
      const items = [
        buildMenuItem({ restaurantId: 'rest-1', restaurantName: 'R1', totalPrice: 200 }),
        buildMenuItem({ restaurantId: 'rest-1', restaurantName: 'R1', totalPrice: 100 }),
        buildMenuItem({ restaurantId: 'rest-2', restaurantName: 'R2', totalPrice: 150 }),
      ];

      const result = service.buildRestaurantOrders(items);

      expect(result).toHaveLength(2);
      const rest1 = result.find((r) => r.restaurantId === 'rest-1');
      expect(rest1?.itemCount).toBe(2);
      expect(rest1?.estimatedTotal).toBe(300);
    });

    it('should return empty for no items', () => {
      expect(service.buildRestaurantOrders([])).toHaveLength(0);
    });
  });
});

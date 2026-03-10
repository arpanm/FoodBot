import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { PartyPlanMenu } from '../../entities/party-plan-menu.entity';
import { PartyPlan, PartyPlanStatus, EventType, ServiceType } from '../../entities/party-plan.entity';
import { CreatePartyPlanDto } from '../dto/create-party-plan.dto';
import { UpdatePartyPlanDto } from '../dto/update-party-plan.dto';
import { PartyPlannerService } from '../party-planner.service';

describe('PartyPlannerService', () => {
  let service: PartyPlannerService;
  let mockPlanRepository: Record<string, jest.Mock>;
  let mockMenuRepository: Record<string, jest.Mock>;

  const userId = 'user-123';
  const otherUserId = 'user-456';
  const planId = 'plan-123';

  function buildMockPlan(overrides?: Partial<PartyPlan>): PartyPlan {
    return {
      id: planId,
      userId,
      eventName: 'Birthday Party',
      eventDate: '2026-03-15',
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
      createdAt: new Date('2026-02-20'),
      updatedAt: new Date('2026-02-20'),
      user: {} as PartyPlan['user'],
      ...overrides,
    };
  }

  beforeEach(() => {
    mockPlanRepository = {
      create: jest.fn((data: Partial<PartyPlan>) => ({ ...data, id: planId })),
      save: jest.fn((entity: PartyPlan) => Promise.resolve({
        ...entity,
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-02-20'),
      })),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(null)),
    };

    mockMenuRepository = {
      create: jest.fn((data: Partial<PartyPlanMenu>) => ({
        id: 'menu-1',
        version: 1,
        ...data,
      })),
      save: jest.fn((entity: PartyPlanMenu) => Promise.resolve({
        ...entity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      find: jest.fn(() => Promise.resolve([])),
      delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    };

    service = new PartyPlannerService(
      mockPlanRepository as any,
      mockMenuRepository as any,
    );
  });

  describe('create', () => {
    const createDto: CreatePartyPlanDto = {
      eventName: 'Birthday Party',
      eventDate: '2026-03-15',
      eventTime: '18:00',
      venueAddress: '123 Party St',
      guestCount: { total: 50, veg: 20, nonVeg: 25, vegan: 5 },
      budget: { total: 5000, perPerson: 100 },
      cuisinePreferences: ['Indian'],
      coursePreferences: ['starter', 'main', 'dessert'],
      eventType: EventType.BIRTHDAY,
      serviceType: ServiceType.DELIVERY,
    };

    it('should create a party plan successfully', async () => {
      const result = await service.create(userId, createDto);

      expect(result.eventName).toBe('Birthday Party');
      expect(result.userId).toBe(userId);
      expect(result.status).toBe(PartyPlanStatus.PLANNING);
      expect(mockPlanRepository.create).toHaveBeenCalledTimes(1);
      expect(mockPlanRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw when guest count subtotals exceed total', async () => {
      const invalidDto = {
        ...createDto,
        guestCount: { total: 10, veg: 5, nonVeg: 5, vegan: 5 },
      };

      await expect(service.create(userId, invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow specialRequirements to be optional', async () => {
      const result = await service.create(userId, createDto);
      expect(result.specialRequirements).toBeNull();
    });
  });

  describe('findAllByUser', () => {
    it('should return all plans for a user', async () => {
      mockPlanRepository.find.mockResolvedValue([buildMockPlan()]);
      mockMenuRepository.find.mockResolvedValue([]);

      const results = await service.findAllByUser(userId);

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(userId);
      expect(mockPlanRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no plans exist', async () => {
      mockPlanRepository.find.mockResolvedValue([]);
      const results = await service.findAllByUser(userId);
      expect(results).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return a plan when found and user authorized', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());
      mockMenuRepository.find.mockResolvedValue([]);

      const result = await service.findById(planId, userId);

      expect(result.id).toBe(planId);
      expect(result.eventName).toBe('Birthday Party');
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent', userId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      await expect(service.findById(planId, otherUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdatePartyPlanDto = {
      eventName: 'Updated Party',
    };

    it('should update a plan successfully', async () => {
      const plan = buildMockPlan();
      mockPlanRepository.findOne.mockResolvedValue(plan);
      mockMenuRepository.find.mockResolvedValue([]);

      const result = await service.update(planId, userId, updateDto);

      expect(mockPlanRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject update on non-planning status', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.CONFIRMED })
      );

      await expect(
        service.update(planId, userId, updateDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject update from unauthorized user', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      await expect(
        service.update(planId, otherUserId, updateDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate guest counts on update', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      const badUpdate: UpdatePartyPlanDto = {
        guestCount: { total: 5, veg: 10, nonVeg: 10, vegan: 10 },
      };

      await expect(
        service.update(planId, userId, badUpdate)
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply all update fields correctly', async () => {
      const plan = buildMockPlan();
      mockPlanRepository.findOne.mockResolvedValue(plan);
      mockMenuRepository.find.mockResolvedValue([]);

      const fullUpdate: UpdatePartyPlanDto = {
        eventName: 'New Name',
        eventDate: '2026-04-01',
        eventTime: '20:00',
        venueAddress: '456 New St',
        cuisinePreferences: ['Italian'],
        coursePreferences: ['main', 'dessert'],
        specialRequirements: 'No nuts',
        eventType: EventType.CORPORATE,
        serviceType: ServiceType.CATERING,
        guestCount: { total: 100, veg: 40, nonVeg: 50, vegan: 10 },
        budget: { total: 10000, perPerson: 100 },
      };

      await service.update(planId, userId, fullUpdate);

      expect(mockPlanRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'New Name',
          eventDate: '2026-04-01',
          eventTime: '20:00',
          venueAddress: '456 New St',
          cuisinePreferences: ['Italian'],
          coursePreferences: ['main', 'dessert'],
          specialRequirements: 'No nuts',
          eventType: EventType.CORPORATE,
          serviceType: ServiceType.CATERING,
        })
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a plan successfully', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());
      mockMenuRepository.find.mockResolvedValue([]);

      const result = await service.cancel(planId, userId);

      expect(result.status).toBe(PartyPlanStatus.CANCELLED);
      expect(mockPlanRepository.save).toHaveBeenCalled();
    });

    it('should throw when cancelling a delivered plan', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.DELIVERED })
      );

      await expect(service.cancel(planId, userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw when cancelling an already cancelled plan', async () => {
      mockPlanRepository.findOne.mockResolvedValue(
        buildMockPlan({ status: PartyPlanStatus.CANCELLED })
      );

      await expect(service.cancel(planId, userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw for unauthorized user', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      await expect(service.cancel(planId, otherUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('saveMenuItems', () => {
    it('should save menu items and replace existing ones', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      const items = [
        {
          dishId: 'dish-1',
          dishName: 'Butter Chicken',
          restaurantId: 'rest-1',
          restaurantName: 'Indian Kitchen',
          quantity: 50,
          pricePerUnit: 12.99,
          totalPrice: 649.50,
          category: 'main',
          dietaryType: 'non_veg',
        },
      ];

      const result = await service.saveMenuItems(planId, userId, items);

      expect(mockMenuRepository.delete).toHaveBeenCalledWith({
        partyPlanId: planId,
      });
      expect(mockMenuRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getPlanWithAuth', () => {
    it('should return plan for authorized user', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      const plan = await service.getPlanWithAuth(planId, userId);
      expect(plan.id).toBe(planId);
    });

    it('should throw NotFoundException when plan missing', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getPlanWithAuth('missing', userId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong user', async () => {
      mockPlanRepository.findOne.mockResolvedValue(buildMockPlan());

      await expect(
        service.getPlanWithAuth(planId, otherUserId)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

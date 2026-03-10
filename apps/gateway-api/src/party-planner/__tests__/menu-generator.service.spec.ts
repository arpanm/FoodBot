import { MenuCategory, DietaryType } from '../../entities/party-plan-menu.entity';
import { PartyPlan, PartyPlanStatus, EventType, ServiceType } from '../../entities/party-plan.entity';
import { GenerateMenuDto } from '../dto/generate-menu.dto';
import { MenuGeneratorService } from '../menu-generator.service';

describe('MenuGeneratorService', () => {
  let service: MenuGeneratorService;

  function buildMockPlan(overrides?: Partial<PartyPlan>): PartyPlan {
    return {
      id: 'plan-123',
      userId: 'user-123',
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
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {} as PartyPlan['user'],
      ...overrides,
    };
  }

  beforeEach(() => {
    service = new MenuGeneratorService();
  });

  describe('generateMenu', () => {
    it('should generate menu with default counts', () => {
      const plan = buildMockPlan();
      const preferences: GenerateMenuDto = {};

      const result = service.generateMenu(plan, preferences);

      // Default: 3 starters + 4 mains + 2 desserts + 2 beverages = 11
      expect(result).toHaveLength(11);
    });

    it('should generate menu with custom counts', () => {
      const plan = buildMockPlan();
      const preferences: GenerateMenuDto = {
        startersCount: 2,
        mainsCount: 3,
        dessertsCount: 1,
        beveragesCount: 1,
      };

      const result = service.generateMenu(plan, preferences);
      expect(result).toHaveLength(7);
    });

    it('should include items from all requested courses', () => {
      const plan = buildMockPlan();
      const preferences: GenerateMenuDto = {
        startersCount: 1,
        mainsCount: 1,
        dessertsCount: 1,
        beveragesCount: 1,
      };

      const result = service.generateMenu(plan, preferences);

      const categories = result.map((item) => item.category);
      expect(categories).toContain(MenuCategory.STARTER);
      expect(categories).toContain(MenuCategory.MAIN);
      expect(categories).toContain(MenuCategory.DESSERT);
      expect(categories).toContain(MenuCategory.BEVERAGE);
    });

    it('should use plan cuisine preferences when none provided', () => {
      const plan = buildMockPlan({ cuisinePreferences: ['Italian'] });
      const preferences: GenerateMenuDto = {};

      const result = service.generateMenu(plan, preferences);

      expect(result[0].dishName).toContain('Italian');
    });

    it('should use override cuisine preferences when provided', () => {
      const plan = buildMockPlan({ cuisinePreferences: ['Indian'] });
      const preferences: GenerateMenuDto = {
        cuisinePreferences: ['Mexican'],
      };

      const result = service.generateMenu(plan, preferences);
      expect(result[0].dishName).toContain('Mexican');
    });

    it('should have valid price calculations', () => {
      const plan = buildMockPlan();
      const preferences: GenerateMenuDto = { startersCount: 1 };

      const result = service.generateMenu(plan, preferences);
      const starter = result.find(
        (item) => item.category === MenuCategory.STARTER
      );

      expect(starter).toBeDefined();
      if (starter) {
        const expected = Math.round(
          starter.quantity * starter.pricePerUnit * 100
        ) / 100;
        expect(starter.totalPrice).toBe(expected);
      }
    });
  });

  describe('calculateQuantity', () => {
    it('should add 15% buffer to base quantity for starters', () => {
      // 50 guests * 1.5 servings per guest = 75 base
      // 75 * 1.15 = 86.25, ceil = 87
      const qty = service.calculateQuantity(50, MenuCategory.STARTER);
      expect(qty).toBe(87);
    });

    it('should add 15% buffer for main courses', () => {
      // 50 guests * 1.0 = 50, * 1.15 = 57.5, ceil = 58
      const qty = service.calculateQuantity(50, MenuCategory.MAIN);
      expect(qty).toBe(58);
    });

    it('should calculate higher quantity for beverages', () => {
      // 50 guests * 2.0 = 100, * 1.15 = 115
      const qty = service.calculateQuantity(50, MenuCategory.BEVERAGE);
      expect(qty).toBe(115);
    });

    it('should handle small guest count', () => {
      const qty = service.calculateQuantity(1, MenuCategory.MAIN);
      // 1 * 1.0 = 1, ceil = 1, * 1.15 = 1.15, ceil = 2
      expect(qty).toBe(2);
    });

    it('should handle desserts', () => {
      // 50 * 1.0 = 50, * 1.15 = 57.5, ceil = 58
      const qty = service.calculateQuantity(50, MenuCategory.DESSERT);
      expect(qty).toBe(58);
    });
  });

  describe('assignDietaryType', () => {
    it('should assign vegan for first items when vegan guests exist', () => {
      const plan = buildMockPlan({
        guestCount: { total: 100, veg: 30, nonVeg: 60, vegan: 10 },
      });

      // index 0 of 10 items, position = 0, veganRatio = 0.1
      const type = service.assignDietaryType(0, 10, plan);
      expect(type).toBe(DietaryType.VEGAN);
    });

    it('should assign veg for middle items', () => {
      const plan = buildMockPlan({
        guestCount: { total: 100, veg: 30, nonVeg: 60, vegan: 10 },
      });

      // index 1 of 10: position 0.1, veganRatio=0.1, vegRatio=0.3
      // 0.1 is not < 0.1 (veganRatio), but 0.1 < 0.1 + 0.3 = 0.4
      const type = service.assignDietaryType(1, 10, plan);
      expect(type).toBe(DietaryType.VEG);
    });

    it('should assign non-veg for later items', () => {
      const plan = buildMockPlan({
        guestCount: { total: 100, veg: 30, nonVeg: 60, vegan: 10 },
      });

      // index 5 of 10: position 0.5, > 0.1+0.3=0.4
      const type = service.assignDietaryType(5, 10, plan);
      expect(type).toBe(DietaryType.NON_VEG);
    });

    it('should default to veg when total is zero', () => {
      const plan = buildMockPlan({
        guestCount: { total: 0, veg: 0, nonVeg: 0, vegan: 0 },
      });

      const type = service.assignDietaryType(0, 5, plan);
      expect(type).toBe(DietaryType.VEG);
    });

    it('should default to veg when no non-veg guests', () => {
      const plan = buildMockPlan({
        guestCount: { total: 50, veg: 45, nonVeg: 0, vegan: 5 },
      });

      // index 9 of 10: position 0.9, > 0.1 + 0.9 = 1.0? No.
      // Actually: veganRatio=0.1, vegRatio=0.9, position=0.9
      // 0.9 < 0.1 + 0.9 = 1.0, so VEG
      const type = service.assignDietaryType(9, 10, plan);
      expect(type).toBe(DietaryType.VEG);
    });
  });

  describe('generateCourseItems', () => {
    it('should generate correct number of items', () => {
      const plan = buildMockPlan();
      const items = service.generateCourseItems(
        plan, ['Indian'], MenuCategory.STARTER, 3
      );

      expect(items).toHaveLength(3);
      items.forEach((item) => {
        expect(item.category).toBe(MenuCategory.STARTER);
      });
    });

    it('should not exceed catalog size', () => {
      const plan = buildMockPlan();
      const items = service.generateCourseItems(
        plan, ['Indian'], MenuCategory.DESSERT, 100
      );

      // Mock catalog for desserts has 4 items
      expect(items.length).toBeLessThanOrEqual(4);
    });

    it('should assign restaurant info to items', () => {
      const plan = buildMockPlan();
      const items = service.generateCourseItems(
        plan, ['Indian'], MenuCategory.MAIN, 2
      );

      items.forEach((item) => {
        expect(item.restaurantId).toBeDefined();
        expect(item.restaurantName).toBeDefined();
        expect(item.dishId).toBeDefined();
      });
    });
  });
});

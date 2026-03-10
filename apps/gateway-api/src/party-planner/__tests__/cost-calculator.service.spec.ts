import { PartyPlanMenu, MenuCategory, DietaryType } from '../../entities/party-plan-menu.entity';
import { PartyPlan, PartyPlanStatus, EventType, ServiceType } from '../../entities/party-plan.entity';
import { CostCalculatorService } from '../cost-calculator.service';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

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
    service = new CostCalculatorService();
  });

  describe('calculateCostBreakdown', () => {
    it('should calculate complete cost breakdown', () => {
      const plan = buildMockPlan();
      const items = [
        buildMenuItem({ totalPrice: 649.50, restaurantId: 'rest-1' }),
        buildMenuItem({
          id: 'menu-2',
          totalPrice: 300.00,
          restaurantId: 'rest-2',
          restaurantName: 'Restaurant 2',
          category: MenuCategory.STARTER,
        }),
      ];

      const result = service.calculateCostBreakdown(plan, items);

      expect(result.subtotal).toBe(949.50);
      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(75.96);
      // 2 restaurants * 5.99 = 11.98
      expect(result.deliveryFees).toBe(11.98);
      // 949.50 + 75.96 + 11.98 = 1037.44
      expect(result.totalCost).toBe(1037.44);
      expect(result.perPersonCost).toBe(20.75);
      expect(result.budgetTotal).toBe(5000);
      expect(result.budgetRemaining).toBe(3962.56);
      expect(result.isOverBudget).toBe(false);
    });

    it('should detect over-budget scenarios', () => {
      const plan = buildMockPlan({ budget: { total: 500, perPerson: 10 } });
      const items = [
        buildMenuItem({ totalPrice: 600.00 }),
      ];

      const result = service.calculateCostBreakdown(plan, items);

      expect(result.isOverBudget).toBe(true);
      expect(result.budgetRemaining).toBeLessThan(0);
    });

    it('should handle empty menu items', () => {
      const plan = buildMockPlan();
      const result = service.calculateCostBreakdown(plan, []);

      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.deliveryFees).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.perRestaurant).toHaveLength(0);
      expect(result.perCourse).toHaveLength(0);
    });
  });

  describe('calculateSubtotal', () => {
    it('should sum all item total prices', () => {
      const items = [
        buildMenuItem({ totalPrice: 100 }),
        buildMenuItem({ totalPrice: 200 }),
        buildMenuItem({ totalPrice: 300 }),
      ];

      expect(service.calculateSubtotal(items)).toBe(600);
    });

    it('should return 0 for empty items', () => {
      expect(service.calculateSubtotal([])).toBe(0);
    });
  });

  describe('calculateTax', () => {
    it('should calculate 8% tax', () => {
      expect(service.calculateTax(100)).toBeCloseTo(8);
    });

    it('should handle zero subtotal', () => {
      expect(service.calculateTax(0)).toBe(0);
    });
  });

  describe('calculatePerPerson', () => {
    it('should divide total by guest count', () => {
      expect(service.calculatePerPerson(1000, 50)).toBe(20);
    });

    it('should return 0 for zero guests', () => {
      expect(service.calculatePerPerson(1000, 0)).toBe(0);
    });

    it('should handle fractional results', () => {
      expect(service.calculatePerPerson(100, 3)).toBeCloseTo(33.33);
    });
  });

  describe('calculatePerRestaurant', () => {
    it('should group items by restaurant', () => {
      const items = [
        buildMenuItem({ restaurantId: 'rest-1', restaurantName: 'R1', totalPrice: 100 }),
        buildMenuItem({ restaurantId: 'rest-1', restaurantName: 'R1', totalPrice: 200 }),
        buildMenuItem({ restaurantId: 'rest-2', restaurantName: 'R2', totalPrice: 150 }),
      ];

      const result = service.calculatePerRestaurant(items);

      expect(result).toHaveLength(2);

      const rest1 = result.find((r) => r.restaurantId === 'rest-1');
      expect(rest1?.itemCount).toBe(2);
      expect(rest1?.subtotal).toBe(300);
      expect(rest1?.deliveryFee).toBe(5.99);

      const rest2 = result.find((r) => r.restaurantId === 'rest-2');
      expect(rest2?.itemCount).toBe(1);
      expect(rest2?.subtotal).toBe(150);
    });

    it('should return empty for no items', () => {
      expect(service.calculatePerRestaurant([])).toHaveLength(0);
    });
  });

  describe('calculatePerCourse', () => {
    it('should group items by course category', () => {
      const items = [
        buildMenuItem({ category: MenuCategory.STARTER, totalPrice: 100 }),
        buildMenuItem({ category: MenuCategory.STARTER, totalPrice: 50 }),
        buildMenuItem({ category: MenuCategory.MAIN, totalPrice: 300 }),
        buildMenuItem({ category: MenuCategory.DESSERT, totalPrice: 80 }),
      ];

      const result = service.calculatePerCourse(items);

      expect(result).toHaveLength(3);

      const starters = result.find((r) => r.course === MenuCategory.STARTER);
      expect(starters?.itemCount).toBe(2);
      expect(starters?.totalCost).toBe(150);

      const mains = result.find((r) => r.course === MenuCategory.MAIN);
      expect(mains?.itemCount).toBe(1);
      expect(mains?.totalCost).toBe(300);
    });

    it('should return empty for no items', () => {
      expect(service.calculatePerCourse([])).toHaveLength(0);
    });
  });

  describe('calculateDeliveryFees', () => {
    it('should charge per restaurant', () => {
      const breakdowns = [
        { restaurantId: 'r1', restaurantName: 'R1', itemCount: 1, subtotal: 100, deliveryFee: 5.99, total: 105.99 },
        { restaurantId: 'r2', restaurantName: 'R2', itemCount: 2, subtotal: 200, deliveryFee: 5.99, total: 205.99 },
      ];

      expect(service.calculateDeliveryFees(breakdowns)).toBeCloseTo(11.98);
    });

    it('should return 0 for no restaurants', () => {
      expect(service.calculateDeliveryFees([])).toBe(0);
    });
  });
});

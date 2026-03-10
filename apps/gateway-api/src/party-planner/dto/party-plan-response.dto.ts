import { PartyPlanStatus, EventType, ServiceType } from '../../entities/party-plan.entity';
import { MenuCategory, DietaryType } from '../../entities/party-plan-menu.entity';

export interface MenuItemResponse {
  id: string;
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  category: MenuCategory;
  dietaryType: DietaryType;
  version: number;
}

export interface CostBreakdownResponse {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  deliveryFees: number;
  totalCost: number;
  perPersonCost: number;
  budgetTotal: number;
  budgetRemaining: number;
  isOverBudget: boolean;
  perRestaurant: RestaurantCostBreakdown[];
  perCourse: CourseCostBreakdown[];
}

export interface RestaurantCostBreakdown {
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface CourseCostBreakdown {
  course: MenuCategory;
  itemCount: number;
  totalCost: number;
}

export interface PartyPlanResponse {
  id: string;
  userId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueAddress: string;
  guestCount: {
    total: number;
    veg: number;
    nonVeg: number;
    vegan: number;
  };
  budget: {
    total: number;
    perPerson: number;
  };
  cuisinePreferences: string[];
  coursePreferences: string[];
  specialRequirements: string | null;
  eventType: EventType;
  serviceType: ServiceType;
  status: PartyPlanStatus;
  menuItems: MenuItemResponse[];
  createdAt: string;
  updatedAt: string;
}

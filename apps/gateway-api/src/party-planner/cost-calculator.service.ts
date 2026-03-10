import { Injectable } from '@nestjs/common';

import { PartyPlanMenu, MenuCategory } from '../entities/party-plan-menu.entity';
import { PartyPlan } from '../entities/party-plan.entity';

import {
  CostBreakdownResponse,
  RestaurantCostBreakdown,
  CourseCostBreakdown,
} from './dto/party-plan-response.dto';

const TAX_RATE = 0.08;
const DELIVERY_FEE_PER_RESTAURANT = 5.99;

@Injectable()
export class CostCalculatorService {
  calculateCostBreakdown(
    plan: PartyPlan,
    menuItems: PartyPlanMenu[]
  ): CostBreakdownResponse {
    const subtotal = this.calculateSubtotal(menuItems);
    const taxAmount = this.calculateTax(subtotal);
    const perRestaurant = this.calculatePerRestaurant(menuItems);
    const deliveryFees = this.calculateDeliveryFees(perRestaurant);
    const totalCost = subtotal + taxAmount + deliveryFees;
    const perPersonCost = this.calculatePerPerson(totalCost, plan.guestCount.total);
    const perCourse = this.calculatePerCourse(menuItems);

    return {
      subtotal: this.round(subtotal),
      taxRate: TAX_RATE,
      taxAmount: this.round(taxAmount),
      deliveryFees: this.round(deliveryFees),
      totalCost: this.round(totalCost),
      perPersonCost: this.round(perPersonCost),
      budgetTotal: plan.budget.total,
      budgetRemaining: this.round(plan.budget.total - totalCost),
      isOverBudget: totalCost > plan.budget.total,
      perRestaurant,
      perCourse,
    };
  }

  calculateSubtotal(menuItems: PartyPlanMenu[]): number {
    return menuItems.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0
    );
  }

  calculateTax(subtotal: number): number {
    return subtotal * TAX_RATE;
  }

  calculateDeliveryFees(
    restaurantBreakdowns: RestaurantCostBreakdown[]
  ): number {
    return restaurantBreakdowns.length * DELIVERY_FEE_PER_RESTAURANT;
  }

  calculatePerPerson(totalCost: number, guestCount: number): number {
    if (guestCount <= 0) {
      return 0;
    }
    return totalCost / guestCount;
  }

  calculatePerRestaurant(
    menuItems: PartyPlanMenu[]
  ): RestaurantCostBreakdown[] {
    const restaurantMap = new Map<string, RestaurantCostBreakdown>();

    for (const item of menuItems) {
      const existing = restaurantMap.get(item.restaurantId);
      if (existing) {
        existing.itemCount += 1;
        existing.subtotal += Number(item.totalPrice);
        existing.total = existing.subtotal + DELIVERY_FEE_PER_RESTAURANT;
      } else {
        restaurantMap.set(item.restaurantId, {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
          itemCount: 1,
          subtotal: Number(item.totalPrice),
          deliveryFee: DELIVERY_FEE_PER_RESTAURANT,
          total: Number(item.totalPrice) + DELIVERY_FEE_PER_RESTAURANT,
        });
      }
    }

    return Array.from(restaurantMap.values()).map((breakdown) => ({
      ...breakdown,
      subtotal: this.round(breakdown.subtotal),
      total: this.round(breakdown.total),
    }));
  }

  calculatePerCourse(menuItems: PartyPlanMenu[]): CourseCostBreakdown[] {
    const courseMap = new Map<MenuCategory, CourseCostBreakdown>();

    for (const item of menuItems) {
      const existing = courseMap.get(item.category);
      if (existing) {
        existing.itemCount += 1;
        existing.totalCost += Number(item.totalPrice);
      } else {
        courseMap.set(item.category, {
          course: item.category,
          itemCount: 1,
          totalCost: Number(item.totalPrice),
        });
      }
    }

    return Array.from(courseMap.values()).map((breakdown) => ({
      ...breakdown,
      totalCost: this.round(breakdown.totalCost),
    }));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

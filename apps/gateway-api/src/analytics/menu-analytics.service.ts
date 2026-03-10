import { Injectable, Logger } from '@nestjs/common';

import {
  DishCombination,
  DishPerformance,
  DishProfitability,
  MenuMetrics,
  OrderRecord,
} from './types/analytics.types';

interface PriceOptimizationSuggestion {
  dishId: string;
  dishName: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
}

@Injectable()
export class MenuAnalyticsService {
  private readonly logger = new Logger(MenuAnalyticsService.name);

  calculateMenuMetrics(orders: OrderRecord[], limit: number): MenuMetrics {
    const completed = this.filterCompleted(orders);

    this.logger.log(
      `Calculating menu metrics from ${completed.length} completed orders`
    );

    const dishPerformance = this.computeDishPerformance(completed);

    return {
      topSellingDishes: this.getTopSelling(dishPerformance, limit),
      worstPerformingDishes: this.getWorstPerforming(dishPerformance, limit),
      dishProfitability: this.computeDishProfitability(completed),
      frequentCombinations: this.computeFrequentCombinations(completed),
    };
  }

  topSellingDishes(orders: OrderRecord[], limit: number): DishPerformance[] {
    const completed = this.filterCompleted(orders);
    const performance = this.computeDishPerformance(completed);
    return this.getTopSelling(performance, limit);
  }

  worstPerforming(orders: OrderRecord[], limit: number): DishPerformance[] {
    const completed = this.filterCompleted(orders);
    const performance = this.computeDishPerformance(completed);
    return this.getWorstPerforming(performance, limit);
  }

  dishProfitability(orders: OrderRecord[]): DishProfitability[] {
    const completed = this.filterCompleted(orders);
    return this.computeDishProfitability(completed);
  }

  frequentCombinations(orders: OrderRecord[]): DishCombination[] {
    const completed = this.filterCompleted(orders);
    return this.computeFrequentCombinations(completed);
  }

  priceOptimization(orders: OrderRecord[]): PriceOptimizationSuggestion[] {
    const completed = this.filterCompleted(orders);
    const profitability = this.computeDishProfitability(completed);
    const suggestions: PriceOptimizationSuggestion[] = [];

    for (const dish of profitability) {
      const suggestion = this.evaluatePricing(dish, completed);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private filterCompleted(orders: OrderRecord[]): OrderRecord[] {
    return orders.filter((o) => o.status === 'completed');
  }

  private computeDishPerformance(orders: OrderRecord[]): DishPerformance[] {
    const dishMap = new Map<string, DishPerformance>();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = dishMap.get(item.dishId);
        if (existing) {
          existing.quantitySold += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          dishMap.set(item.dishId, {
            dishId: item.dishId,
            dishName: item.dishName,
            quantitySold: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      }
    }

    return Array.from(dishMap.values()).map((dish) => ({
      ...dish,
      revenue: this.roundToTwo(dish.revenue),
    }));
  }

  private getTopSelling(
    dishes: DishPerformance[],
    limit: number
  ): DishPerformance[] {
    return [...dishes]
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  }

  private getWorstPerforming(
    dishes: DishPerformance[],
    limit: number
  ): DishPerformance[] {
    return [...dishes]
      .sort((a, b) => a.quantitySold - b.quantitySold)
      .slice(0, limit);
  }

  private computeDishProfitability(orders: OrderRecord[]): DishProfitability[] {
    const dishMap = new Map<
      string,
      { dishName: string; revenue: number; cost: number }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = dishMap.get(item.dishId);
        const itemRevenue = item.price * item.quantity;
        const itemCost = item.cost * item.quantity;

        if (existing) {
          existing.revenue += itemRevenue;
          existing.cost += itemCost;
        } else {
          dishMap.set(item.dishId, {
            dishName: item.dishName,
            revenue: itemRevenue,
            cost: itemCost,
          });
        }
      }
    }

    return Array.from(dishMap.entries())
      .map(([dishId, data]) => {
        const profit = data.revenue - data.cost;
        const profitMargin =
          data.revenue === 0 ? 0 : (profit / data.revenue) * 100;

        return {
          dishId,
          dishName: data.dishName,
          revenue: this.roundToTwo(data.revenue),
          cost: this.roundToTwo(data.cost),
          profit: this.roundToTwo(profit),
          profitMargin: this.roundToTwo(profitMargin),
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  private computeFrequentCombinations(
    orders: OrderRecord[]
  ): DishCombination[] {
    const combinationMap = new Map<string, DishCombination>();

    for (const order of orders) {
      if (order.items.length < 2) {
        continue;
      }
      const dishNames = order.items
        .map((item) => item.dishName)
        .sort();
      const pairs = this.generatePairs(dishNames);

      for (const pair of pairs) {
        const key = pair.join('|');
        const existing = combinationMap.get(key);
        if (existing) {
          existing.frequency += 1;
        } else {
          combinationMap.set(key, { dishes: pair, frequency: 1 });
        }
      }
    }

    return Array.from(combinationMap.values())
      .filter((combo) => combo.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency);
  }

  private generatePairs(items: string[]): string[][] {
    const pairs: string[][] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const first = items[i] as string;
        const second = items[j] as string;
        pairs.push([first, second]);
      }
    }
    return pairs;
  }

  private evaluatePricing(
    dish: DishProfitability,
    orders: OrderRecord[]
  ): PriceOptimizationSuggestion | null {
    const currentPrice = this.getDishAveragePrice(dish.dishId, orders);
    if (currentPrice === null) {
      return null;
    }

    if (dish.profitMargin < 20) {
      return {
        dishId: dish.dishId,
        dishName: dish.dishName,
        currentPrice,
        suggestedPrice: this.roundToTwo(currentPrice * 1.15),
        reason: 'Low profit margin - consider increasing price',
      };
    }

    return null;
  }

  private getDishAveragePrice(
    dishId: string,
    orders: OrderRecord[]
  ): number | null {
    const prices: number[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (item.dishId === dishId) {
          prices.push(item.price);
        }
      }
    }
    if (prices.length === 0) {
      return null;
    }
    return this.roundToTwo(
      prices.reduce((sum, p) => sum + p, 0) / prices.length
    );
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

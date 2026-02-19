/**
 * Dish test data factory
 */

import type { Dish, DietaryInfo, DishCategory } from '../../types/models';

let dishCounter = 0;

const DEFAULT_DIETARY: DietaryInfo = {
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isDairyFree: false,
  isNutFree: false,
  isHalal: false,
  isKosher: false,
};

export class DishFactory {
  static build(overrides?: Partial<Dish>): Dish {
    dishCounter++;
    return {
      id: `dish-${dishCounter}-${Date.now()}`,
      name: `Test Dish ${dishCounter}`,
      description: `A delicious test dish number ${dishCounter}`,
      price: 12.99,
      images: ['https://example.com/dish.jpg'],
      category: 'Main Course',
      restaurantId: 'restaurant-1',
      isAvailable: true,
      rating: 4.5,
      reviewCount: 10,
      tags: ['popular'],
      dietary: { ...DEFAULT_DIETARY },
      ingredients: ['ingredient1', 'ingredient2'],
      allergens: [],
      customizations: [],
      preparationTime: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static buildMany(count: number, overrides?: Partial<Dish>): Dish[] {
    return Array.from({ length: count }, () => DishFactory.build(overrides));
  }

  static buildCategory(overrides?: Partial<DishCategory>): DishCategory {
    dishCounter++;
    return {
      id: `cat-${dishCounter}`,
      name: `Category ${dishCounter}`,
      sortOrder: dishCounter,
      dishCount: 5,
      isActive: true,
      ...overrides,
    };
  }
}

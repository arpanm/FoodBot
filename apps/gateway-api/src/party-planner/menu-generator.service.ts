import { Injectable, Logger } from '@nestjs/common';

import { MenuCategory, DietaryType } from '../entities/party-plan-menu.entity';
import { PartyPlan } from '../entities/party-plan.entity';

import { GenerateMenuDto } from './dto/generate-menu.dto';

const BUFFER_PERCENTAGE = 0.15;
const DEFAULT_STARTERS = 3;
const DEFAULT_MAINS = 4;
const DEFAULT_DESSERTS = 2;
const DEFAULT_BEVERAGES = 2;

export interface GeneratedMenuItem {
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  category: MenuCategory;
  dietaryType: DietaryType;
}

@Injectable()
export class MenuGeneratorService {
  private readonly logger = new Logger(MenuGeneratorService.name);

  generateMenu(
    plan: PartyPlan,
    preferences: GenerateMenuDto
  ): GeneratedMenuItem[] {
    const dishCounts = this.getDishCounts(preferences);
    const cuisines = preferences.cuisinePreferences ?? plan.cuisinePreferences;

    const starters = this.generateCourseItems(
      plan, cuisines, MenuCategory.STARTER, dishCounts.starters
    );
    const mains = this.generateCourseItems(
      plan, cuisines, MenuCategory.MAIN, dishCounts.mains
    );
    const desserts = this.generateCourseItems(
      plan, cuisines, MenuCategory.DESSERT, dishCounts.desserts
    );
    const beverages = this.generateCourseItems(
      plan, cuisines, MenuCategory.BEVERAGE, dishCounts.beverages
    );

    const allItems = [...starters, ...mains, ...desserts, ...beverages];

    this.logger.log(
      `Generated ${allItems.length} menu items for plan ${plan.id}`
    );

    return allItems;
  }

  generateCourseItems(
    plan: PartyPlan,
    cuisines: string[],
    category: MenuCategory,
    count: number
  ): GeneratedMenuItem[] {
    const items: GeneratedMenuItem[] = [];
    const catalog = this.getMockDishCatalog(cuisines, category);

    for (let i = 0; i < count && i < catalog.length; i++) {
      const dish = catalog[i];
      const dietaryType = this.assignDietaryType(i, count, plan);
      const quantity = this.calculateQuantity(plan.guestCount.total, category);

      items.push({
        dishId: dish.id,
        dishName: dish.name,
        restaurantId: dish.restaurantId,
        restaurantName: dish.restaurantName,
        quantity,
        pricePerUnit: dish.price,
        totalPrice: Math.round(quantity * dish.price * 100) / 100,
        category,
        dietaryType,
      });
    }

    return items;
  }

  calculateQuantity(guestCount: number, category: MenuCategory): number {
    const servingsPerGuest = this.getServingsPerGuest(category);
    const baseQuantity = Math.ceil(guestCount * servingsPerGuest);
    const buffered = Math.ceil(baseQuantity * (1 + BUFFER_PERCENTAGE));
    return buffered;
  }

  assignDietaryType(
    index: number,
    totalCount: number,
    plan: PartyPlan
  ): DietaryType {
    const { veg, nonVeg, vegan, total } = plan.guestCount;
    if (total === 0) {
      return DietaryType.VEG;
    }

    const vegRatio = veg / total;
    const veganRatio = vegan / total;
    const position = index / totalCount;

    if (position < veganRatio) {
      return DietaryType.VEGAN;
    }
    if (position < veganRatio + vegRatio) {
      return DietaryType.VEG;
    }
    return nonVeg > 0 ? DietaryType.NON_VEG : DietaryType.VEG;
  }

  private getDishCounts(preferences: GenerateMenuDto): {
    starters: number;
    mains: number;
    desserts: number;
    beverages: number;
  } {
    return {
      starters: preferences.startersCount ?? DEFAULT_STARTERS,
      mains: preferences.mainsCount ?? DEFAULT_MAINS,
      desserts: preferences.dessertsCount ?? DEFAULT_DESSERTS,
      beverages: preferences.beveragesCount ?? DEFAULT_BEVERAGES,
    };
  }

  private getServingsPerGuest(category: MenuCategory): number {
    const servingsMap: Record<MenuCategory, number> = {
      [MenuCategory.STARTER]: 1.5,
      [MenuCategory.MAIN]: 1.0,
      [MenuCategory.DESSERT]: 1.0,
      [MenuCategory.BEVERAGE]: 2.0,
    };
    return servingsMap[category];
  }

  private getMockDishCatalog(
    cuisines: string[],
    category: MenuCategory
  ): Array<{
    id: string;
    name: string;
    price: number;
    restaurantId: string;
    restaurantName: string;
  }> {
    const cuisine = cuisines[0] ?? 'Indian';
    return MOCK_CATALOGS[category].map((dish, idx) => ({
      id: `dish-${category}-${idx + 1}`,
      name: `${cuisine} ${dish.name}`,
      price: dish.price,
      restaurantId: `restaurant-${(idx % 3) + 1}`,
      restaurantName: `${cuisine} Kitchen ${(idx % 3) + 1}`,
    }));
  }
}

const MOCK_CATALOGS: Record<
  MenuCategory,
  Array<{ name: string; price: number }>
> = {
  [MenuCategory.STARTER]: [
    { name: 'Spring Rolls', price: 6.99 },
    { name: 'Samosa Platter', price: 5.99 },
    { name: 'Bruschetta', price: 7.49 },
    { name: 'Soup Bowl', price: 4.99 },
    { name: 'Kebab Skewers', price: 8.99 },
  ],
  [MenuCategory.MAIN]: [
    { name: 'Butter Curry', price: 14.99 },
    { name: 'Biryani', price: 12.99 },
    { name: 'Grilled Platter', price: 16.99 },
    { name: 'Pasta Primavera', price: 13.49 },
    { name: 'Stir Fry Bowl', price: 11.99 },
  ],
  [MenuCategory.DESSERT]: [
    { name: 'Gulab Jamun', price: 5.99 },
    { name: 'Tiramisu', price: 7.99 },
    { name: 'Ice Cream Sundae', price: 6.49 },
    { name: 'Fruit Tart', price: 8.49 },
  ],
  [MenuCategory.BEVERAGE]: [
    { name: 'Mango Lassi', price: 3.99 },
    { name: 'Fresh Lime Soda', price: 2.99 },
    { name: 'Chai Latte', price: 4.49 },
    { name: 'Iced Tea', price: 3.49 },
  ],
};

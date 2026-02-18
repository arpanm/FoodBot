import { faker } from '@faker-js/faker';

export interface MockDish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  discountedPrice?: number;
  images: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  spiceLevel: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
  calories?: number;
  preparationTime: number; // in minutes
  isAvailable: boolean;
  tags: string[];
  rating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory for creating mock dish data
 */
export class DishFactory {
  private static readonly CATEGORIES = [
    'Appetizers',
    'Main Course',
    'Desserts',
    'Beverages',
    'Salads',
    'Soups',
    'Sides',
    'Specials',
  ];

  private static readonly ALLERGENS = [
    'Dairy',
    'Eggs',
    'Peanuts',
    'Tree Nuts',
    'Soy',
    'Wheat',
    'Fish',
    'Shellfish',
  ];

  private static readonly TAGS = [
    'Popular',
    'Chef Special',
    'Healthy',
    'Organic',
    'Low Carb',
    'High Protein',
    'Spicy',
    'Sweet',
    'New',
  ];

  /**
   * Creates a mock dish with default values
   */
  static create(overrides?: Partial<MockDish>): MockDish {
    const basePrice = faker.number.float({ min: 5, max: 30, fractionDigits: 2 });
    const hasDiscount = faker.datatype.boolean();

    const defaultDish: MockDish = {
      id: faker.string.uuid(),
      restaurantId: faker.string.uuid(),
      name: faker.food.dish(),
      description: faker.lorem.sentence(),
      category: faker.helpers.arrayElement(this.CATEGORIES),
      price: basePrice,
      discountedPrice: hasDiscount
        ? faker.number.float({
            min: basePrice * 0.7,
            max: basePrice * 0.9,
            fractionDigits: 2,
          })
        : undefined,
      images: [faker.image.url(), faker.image.url()],
      isVegetarian: faker.datatype.boolean(),
      isVegan: faker.datatype.boolean(),
      isGlutenFree: faker.datatype.boolean(),
      allergens: faker.helpers.arrayElements(this.ALLERGENS, 2),
      spiceLevel: faker.helpers.arrayElement([
        'none',
        'mild',
        'medium',
        'hot',
        'very-hot',
      ] as const),
      calories: faker.number.int({ min: 200, max: 1000 }),
      preparationTime: faker.number.int({ min: 10, max: 45 }),
      isAvailable: true,
      tags: faker.helpers.arrayElements(this.TAGS, 2),
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      totalReviews: faker.number.int({ min: 5, max: 200 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { ...defaultDish, ...overrides };
  }

  /**
   * Creates multiple mock dishes
   */
  static createMany(count: number, overrides?: Partial<MockDish>): MockDish[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Creates a mock vegetarian dish
   */
  static createVegetarian(overrides?: Partial<MockDish>): MockDish {
    return this.create({ isVegetarian: true, ...overrides });
  }

  /**
   * Creates a mock vegan dish
   */
  static createVegan(overrides?: Partial<MockDish>): MockDish {
    return this.create({ isVegan: true, isVegetarian: true, ...overrides });
  }

  /**
   * Creates an unavailable dish
   */
  static createUnavailable(overrides?: Partial<MockDish>): MockDish {
    return this.create({ isAvailable: false, ...overrides });
  }

  /**
   * Creates dishes for a specific restaurant
   */
  static createManyForRestaurant(
    restaurantId: string,
    count: number,
    overrides?: Partial<MockDish>
  ): MockDish[] {
    return Array.from({ length: count }, () =>
      this.create({ restaurantId, ...overrides })
    );
  }

  /**
   * Creates dish creation data
   */
  static createDishData(
    overrides?: Partial<Omit<MockDish, 'id' | 'createdAt' | 'updatedAt'>>
  ) {
    const dish = this.create(overrides);
    const { id, createdAt, updatedAt, ...data } = dish;
    return data;
  }

  /**
   * Creates dish search query
   */
  static createSearchQuery(overrides?: Partial<{
    query: string;
    restaurantId: string;
    category: string;
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    minPrice: number;
    maxPrice: number;
    spiceLevel: string[];
    page: number;
    limit: number;
  }>) {
    return {
      query: faker.food.dish(),
      page: 1,
      limit: 20,
      ...overrides,
    };
  }

  /**
   * Creates dish update data
   */
  static createUpdateData(overrides?: Partial<{
    name: string;
    description: string;
    price: number;
    discountedPrice: number;
    isAvailable: boolean;
    preparationTime: number;
  }>) {
    return {
      name: faker.food.dish(),
      description: faker.lorem.sentence(),
      price: faker.number.float({ min: 5, max: 30, fractionDigits: 2 }),
      ...overrides,
    };
  }
}

/**
 * Helper function to create a mock dish
 */
export function createMockDish(overrides?: Partial<MockDish>): MockDish {
  return DishFactory.create(overrides);
}

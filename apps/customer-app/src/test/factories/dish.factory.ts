/**
 * Test data factory for dishes
 */

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: DishCategory;
  restaurantId: string;
  restaurantName: string;
  isAvailable: boolean;
  preparationTime: string;
  servingSize: string;
  calories: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  dietary: DietaryInfo;
  ingredients: string[];
  allergens: string[];
  customizations: Customization[];
  nutritionalInfo: NutritionalInfo;
}

export type DishCategory =
  | 'appetizer'
  | 'main_course'
  | 'dessert'
  | 'beverage'
  | 'salad'
  | 'soup'
  | 'side';

export interface DietaryInfo {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  nutFree: boolean;
  halal: boolean;
  kosher: boolean;
}

export interface Customization {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  priceModifier: number;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

let dishIdCounter = 1;

/**
 * Generates a mock dish
 * @param overrides - Partial dish to override defaults
 * @returns Mock dish object
 */
export function mockDish(overrides: Partial<Dish> = {}): Dish {
  const id = `dish-${dishIdCounter++}`;
  return {
    id,
    name: `Delicious Dish ${dishIdCounter}`,
    description: 'A mouth-watering dish prepared with fresh ingredients',
    price: 12.99,
    images: [
      `https://example.com/dish1-${id}.jpg`,
      `https://example.com/dish2-${id}.jpg`,
    ],
    category: 'main_course',
    restaurantId: 'rest-1',
    restaurantName: 'Test Restaurant',
    isAvailable: true,
    preparationTime: '20-25 min',
    servingSize: '1 serving',
    calories: 450,
    rating: 4.3,
    reviewCount: 87,
    tags: ['Popular', 'Spicy'],
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false,
      nutFree: true,
      halal: false,
      kosher: false,
    },
    ingredients: ['Chicken', 'Tomatoes', 'Onions', 'Spices'],
    allergens: ['Dairy'],
    customizations: [
      {
        id: 'spice-level',
        name: 'Spice Level',
        type: 'single',
        required: true,
        options: [
          { id: 'mild', name: 'Mild', priceModifier: 0 },
          { id: 'medium', name: 'Medium', priceModifier: 0 },
          { id: 'hot', name: 'Hot', priceModifier: 0 },
        ],
      },
    ],
    nutritionalInfo: {
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 15,
      fiber: 5,
      sodium: 850,
    },
    ...overrides,
  };
}

/**
 * Generates multiple mock dishes
 * @param count - Number of dishes to generate
 * @param overrides - Partial dish to override defaults
 * @returns Array of mock dishes
 */
export function mockDishes(count: number, overrides: Partial<Dish> = {}): Dish[] {
  return Array.from({ length: count }, (_, index) =>
    mockDish({
      id: `dish-${index + 1}`,
      name: `Dish ${index + 1}`,
      price: 10 + index * 2.5,
      rating: 3.5 + (index % 4) * 0.3,
      ...overrides,
    })
  );
}

/**
 * Generates a vegetarian dish
 * @param overrides - Partial dish to override defaults
 * @returns Mock vegetarian dish
 */
export function mockVegetarianDish(overrides: Partial<Dish> = {}): Dish {
  return mockDish({
    name: 'Veggie Delight',
    description: 'Fresh vegetables cooked to perfection',
    dietary: {
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      dairyFree: false,
      nutFree: true,
      halal: true,
      kosher: true,
    },
    ingredients: ['Bell Peppers', 'Zucchini', 'Mushrooms', 'Onions'],
    allergens: ['Dairy'],
    tags: ['Vegetarian', 'Healthy'],
    ...overrides,
  });
}

/**
 * Generates a vegan dish
 * @param overrides - Partial dish to override defaults
 * @returns Mock vegan dish
 */
export function mockVeganDish(overrides: Partial<Dish> = {}): Dish {
  return mockDish({
    name: 'Plant Power Bowl',
    description: 'Nutritious plant-based goodness',
    dietary: {
      vegetarian: true,
      vegan: true,
      glutenFree: true,
      dairyFree: true,
      nutFree: true,
      halal: true,
      kosher: true,
    },
    ingredients: ['Quinoa', 'Chickpeas', 'Avocado', 'Spinach'],
    allergens: [],
    tags: ['Vegan', 'Gluten Free', 'Healthy'],
    ...overrides,
  });
}

/**
 * Generates an unavailable dish
 * @param overrides - Partial dish to override defaults
 * @returns Mock unavailable dish
 */
export function mockUnavailableDish(overrides: Partial<Dish> = {}): Dish {
  return mockDish({
    isAvailable: false,
    ...overrides,
  });
}

/**
 * Generates a dish with custom category
 * @param category - Dish category
 * @param overrides - Partial dish to override defaults
 * @returns Mock dish with specified category
 */
export function mockDishByCategory(
  category: DishCategory,
  overrides: Partial<Dish> = {}
): Dish {
  const categoryNames: Record<DishCategory, string> = {
    appetizer: 'Crispy Appetizer',
    main_course: 'Signature Main Course',
    dessert: 'Sweet Dessert',
    beverage: 'Refreshing Beverage',
    salad: 'Fresh Salad',
    soup: 'Hearty Soup',
    side: 'Perfect Side',
  };

  return mockDish({
    name: categoryNames[category],
    category,
    ...overrides,
  });
}

/**
 * Generates a highly rated dish
 * @param overrides - Partial dish to override defaults
 * @returns Mock highly rated dish
 */
export function mockHighlyRatedDish(overrides: Partial<Dish> = {}): Dish {
  return mockDish({
    rating: 4.9,
    reviewCount: 500,
    tags: ['Best Seller', 'Must Try', 'Customer Favorite'],
    ...overrides,
  });
}

/**
 * Generates a dish with complex customizations
 * @param overrides - Partial dish to override defaults
 * @returns Mock dish with multiple customizations
 */
export function mockDishWithCustomizations(overrides: Partial<Dish> = {}): Dish {
  return mockDish({
    customizations: [
      {
        id: 'size',
        name: 'Size',
        type: 'single',
        required: true,
        options: [
          { id: 'small', name: 'Small', priceModifier: -2 },
          { id: 'medium', name: 'Medium', priceModifier: 0 },
          { id: 'large', name: 'Large', priceModifier: 3 },
        ],
      },
      {
        id: 'toppings',
        name: 'Extra Toppings',
        type: 'multiple',
        required: false,
        options: [
          { id: 'cheese', name: 'Extra Cheese', priceModifier: 2 },
          { id: 'bacon', name: 'Bacon', priceModifier: 3 },
          { id: 'mushrooms', name: 'Mushrooms', priceModifier: 1.5 },
          { id: 'olives', name: 'Olives', priceModifier: 1 },
        ],
      },
      {
        id: 'spice-level',
        name: 'Spice Level',
        type: 'single',
        required: true,
        options: [
          { id: 'mild', name: 'Mild', priceModifier: 0 },
          { id: 'medium', name: 'Medium', priceModifier: 0 },
          { id: 'hot', name: 'Hot', priceModifier: 0 },
          { id: 'extra-hot', name: 'Extra Hot', priceModifier: 0 },
        ],
      },
    ],
    ...overrides,
  });
}

/**
 * Resets the dish ID counter
 */
export function resetDishIdCounter(): void {
  dishIdCounter = 1;
}

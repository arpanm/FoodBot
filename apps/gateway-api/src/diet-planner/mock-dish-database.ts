import type { MealType } from '../entities/diet-plan-meal.entity';

export interface MockDish {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  price: number;
  mealTypes: MealType[];
  dietaryTags: string[];
  allergens: string[];
}

/**
 * Deterministic mock dish database for meal plan generation.
 * Covers variety of cuisines, dietary preferences, and meal types.
 */
export const MOCK_DISH_DATABASE: MockDish[] = [
  // Breakfast items
  {
    id: 'dish-b1', name: 'Oats Porridge', restaurantId: 'rest-1',
    restaurantName: 'Healthy Bites', calories: 350, protein: 12, carbs: 55, fats: 8,
    price: 120, mealTypes: ['breakfast'], dietaryTags: ['veg', 'vegan'],
    allergens: ['gluten'],
  },
  {
    id: 'dish-b2', name: 'Egg White Omelette', restaurantId: 'rest-2',
    restaurantName: 'FitKitchen', calories: 280, protein: 28, carbs: 5, fats: 10,
    price: 150, mealTypes: ['breakfast'], dietaryTags: ['eggetarian', 'keto'],
    allergens: ['eggs'],
  },
  {
    id: 'dish-b3', name: 'Avocado Toast', restaurantId: 'rest-3',
    restaurantName: 'Green Bowl', calories: 400, protein: 10, carbs: 40, fats: 22,
    price: 180, mealTypes: ['breakfast'], dietaryTags: ['veg', 'vegan'],
    allergens: ['gluten'],
  },
  {
    id: 'dish-b4', name: 'Protein Pancakes', restaurantId: 'rest-2',
    restaurantName: 'FitKitchen', calories: 450, protein: 30, carbs: 50, fats: 12,
    price: 200, mealTypes: ['breakfast'], dietaryTags: ['veg', 'eggetarian'],
    allergens: ['gluten', 'eggs', 'dairy'],
  },
  {
    id: 'dish-b5', name: 'Greek Yogurt Bowl', restaurantId: 'rest-1',
    restaurantName: 'Healthy Bites', calories: 320, protein: 20, carbs: 35, fats: 10,
    price: 160, mealTypes: ['breakfast'], dietaryTags: ['veg'],
    allergens: ['dairy'],
  },
  {
    id: 'dish-b6', name: 'Chicken Sausage Wrap', restaurantId: 'rest-4',
    restaurantName: 'MeatBox', calories: 420, protein: 28, carbs: 35, fats: 18,
    price: 170, mealTypes: ['breakfast'], dietaryTags: ['non_veg', 'paleo'],
    allergens: ['gluten'],
  },
  // Lunch items
  {
    id: 'dish-l1', name: 'Grilled Chicken Salad', restaurantId: 'rest-2',
    restaurantName: 'FitKitchen', calories: 520, protein: 40, carbs: 25, fats: 22,
    price: 250, mealTypes: ['lunch'], dietaryTags: ['non_veg', 'keto', 'paleo'],
    allergens: [],
  },
  {
    id: 'dish-l2', name: 'Paneer Tikka Bowl', restaurantId: 'rest-5',
    restaurantName: 'Spice Route', calories: 580, protein: 25, carbs: 55, fats: 28,
    price: 220, mealTypes: ['lunch'], dietaryTags: ['veg'],
    allergens: ['dairy'],
  },
  {
    id: 'dish-l3', name: 'Quinoa Veggie Bowl', restaurantId: 'rest-3',
    restaurantName: 'Green Bowl', calories: 480, protein: 18, carbs: 60, fats: 16,
    price: 230, mealTypes: ['lunch'], dietaryTags: ['veg', 'vegan'],
    allergens: [],
  },
  {
    id: 'dish-l4', name: 'Fish Curry with Rice', restaurantId: 'rest-5',
    restaurantName: 'Spice Route', calories: 620, protein: 35, carbs: 65, fats: 20,
    price: 280, mealTypes: ['lunch'], dietaryTags: ['non_veg'],
    allergens: ['fish'],
  },
  {
    id: 'dish-l5', name: 'Dal Tadka with Roti', restaurantId: 'rest-6',
    restaurantName: 'Desi Dhaba', calories: 500, protein: 20, carbs: 65, fats: 14,
    price: 180, mealTypes: ['lunch'], dietaryTags: ['veg', 'vegan'],
    allergens: ['gluten'],
  },
  {
    id: 'dish-l6', name: 'Keto Chicken Plate', restaurantId: 'rest-4',
    restaurantName: 'MeatBox', calories: 550, protein: 45, carbs: 10, fats: 35,
    price: 300, mealTypes: ['lunch'], dietaryTags: ['non_veg', 'keto', 'paleo'],
    allergens: [],
  },
  // Snack items
  {
    id: 'dish-s1', name: 'Mixed Nuts & Seeds', restaurantId: 'rest-1',
    restaurantName: 'Healthy Bites', calories: 200, protein: 8, carbs: 10, fats: 16,
    price: 100, mealTypes: ['snack'], dietaryTags: ['veg', 'vegan', 'keto', 'paleo'],
    allergens: ['nuts'],
  },
  {
    id: 'dish-s2', name: 'Protein Bar', restaurantId: 'rest-2',
    restaurantName: 'FitKitchen', calories: 220, protein: 20, carbs: 22, fats: 8,
    price: 80, mealTypes: ['snack'], dietaryTags: ['veg'],
    allergens: ['dairy', 'soy'],
  },
  {
    id: 'dish-s3', name: 'Fruit Salad', restaurantId: 'rest-3',
    restaurantName: 'Green Bowl', calories: 150, protein: 2, carbs: 35, fats: 1,
    price: 90, mealTypes: ['snack'], dietaryTags: ['veg', 'vegan'],
    allergens: [],
  },
  {
    id: 'dish-s4', name: 'Boiled Eggs', restaurantId: 'rest-2',
    restaurantName: 'FitKitchen', calories: 180, protein: 18, carbs: 2, fats: 12,
    price: 70, mealTypes: ['snack'], dietaryTags: ['eggetarian', 'keto', 'paleo'],
    allergens: ['eggs'],
  },
  {
    id: 'dish-s5', name: 'Hummus & Veggies', restaurantId: 'rest-3',
    restaurantName: 'Green Bowl', calories: 190, protein: 7, carbs: 20, fats: 10,
    price: 110, mealTypes: ['snack'], dietaryTags: ['veg', 'vegan'],
    allergens: ['sesame'],
  },
  // Dinner items
  {
    id: 'dish-d1', name: 'Grilled Salmon', restaurantId: 'rest-4',
    restaurantName: 'MeatBox', calories: 480, protein: 42, carbs: 8, fats: 28,
    price: 350, mealTypes: ['dinner'], dietaryTags: ['non_veg', 'keto', 'paleo'],
    allergens: ['fish'],
  },
  {
    id: 'dish-d2', name: 'Palak Paneer with Roti', restaurantId: 'rest-6',
    restaurantName: 'Desi Dhaba', calories: 520, protein: 22, carbs: 45, fats: 26,
    price: 200, mealTypes: ['dinner'], dietaryTags: ['veg'],
    allergens: ['dairy', 'gluten'],
  },
  {
    id: 'dish-d3', name: 'Tofu Stir Fry', restaurantId: 'rest-3',
    restaurantName: 'Green Bowl', calories: 380, protein: 22, carbs: 30, fats: 18,
    price: 220, mealTypes: ['dinner'], dietaryTags: ['veg', 'vegan'],
    allergens: ['soy'],
  },
  {
    id: 'dish-d4', name: 'Chicken Breast with Veggies', restaurantId: 'rest-2',
    restaurantName: 'FitKitchen', calories: 450, protein: 40, carbs: 20, fats: 18,
    price: 280, mealTypes: ['dinner'], dietaryTags: ['non_veg', 'keto', 'paleo'],
    allergens: [],
  },
  {
    id: 'dish-d5', name: 'Rajma Chawal', restaurantId: 'rest-6',
    restaurantName: 'Desi Dhaba', calories: 550, protein: 18, carbs: 70, fats: 16,
    price: 170, mealTypes: ['dinner'], dietaryTags: ['veg', 'vegan'],
    allergens: [],
  },
  {
    id: 'dish-d6', name: 'Lamb Kebab Platter', restaurantId: 'rest-5',
    restaurantName: 'Spice Route', calories: 600, protein: 38, carbs: 30, fats: 32,
    price: 320, mealTypes: ['dinner'], dietaryTags: ['non_veg', 'paleo'],
    allergens: [],
  },
];

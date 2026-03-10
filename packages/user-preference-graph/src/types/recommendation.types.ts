export interface RecommendationResult {
  id: string;
  name: string;
  type: 'dish' | 'restaurant' | 'category';
  score: number;
  reason: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface TimeContext {
  dayOfWeek: string;
  hour: number;
  timeSlot: string;
}

export interface LocationContext {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface SimilarUser {
  userId: string;
  similarityScore: number;
  sharedCategories: string[];
}

export interface PreferenceSummary {
  userId: string;
  topCategories: CategoryPreference[];
  topDishes: DishPreference[];
  topRestaurants: RestaurantPreference[];
  timePatterns: TimePattern[];
  naturalLanguageSummary: string;
}

export interface CategoryPreference {
  categoryId: string;
  categoryName: string;
  weight: number;
}

export interface DishPreference {
  dishId: string;
  dishName: string;
  restaurantName: string;
  weight: number;
}

export interface RestaurantPreference {
  restaurantId: string;
  restaurantName: string;
  weight: number;
  cuisine: string;
}

export interface TimePattern {
  dayOfWeek: string;
  timeSlot: string;
  frequency: number;
  topCategory: string;
}

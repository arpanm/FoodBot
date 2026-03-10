export interface WeightParams {
  frequency: number;
  recencyDecay: number;
  rating: number;
  contextMultiplier: number;
}

export interface PreferenceWeight {
  sourceId: string;
  targetId: string;
  weight: number;
  components: WeightParams;
  lastUpdated: string;
}

export interface DecayConfig {
  halfLifeDays: number;
  minimumWeight: number;
  maxAgeDays: number;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeDays: 30,
  minimumWeight: 0.05,
  maxAgeDays: 90,
};

export interface ContextMultiplier {
  dayOfWeek: string;
  timeSlot: string;
  multiplier: number;
}

export interface ExplicitPreference {
  userId: string;
  targetId: string;
  targetType: 'dish' | 'category' | 'restaurant';
  sentiment: 'like' | 'dislike';
  timestamp: string;
}

export interface OrderHistoryRecord {
  orderId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  restaurantCuisine: string;
  restaurantRating: number;
  items: OrderItemRecord[];
  orderDate: string;
  dayOfWeek: string;
  timeSlot: string;
  rating: number | null;
}

export interface OrderItemRecord {
  dishId: string;
  dishName: string;
  price: number;
  cuisine: string;
  isVegetarian: boolean;
  categoryId: string;
  categoryName: string;
}

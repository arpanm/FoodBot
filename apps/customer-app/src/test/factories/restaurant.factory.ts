/**
 * Test data factory for restaurants
 */

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  logo: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceRange: 1 | 2 | 3 | 4;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  isOpen: boolean;
  operatingHours: OperatingHours;
  location: Location;
  dishes: string[];
  tags: string[];
  provider: 'mock' | 'swiggy' | 'zomato';
}

export interface OperatingHours {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  open: string;
  close: string;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

let restaurantIdCounter = 1;

/**
 * Generates a mock restaurant
 * @param overrides - Partial restaurant to override defaults
 * @returns Mock restaurant object
 */
export function mockRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  const id = `rest-${restaurantIdCounter++}`;
  return {
    id,
    name: `Restaurant ${restaurantIdCounter}`,
    description: 'A wonderful dining experience with authentic flavors',
    cuisine: ['Italian', 'Mediterranean'],
    logo: `https://example.com/logo-${id}.jpg`,
    images: [
      `https://example.com/img1-${id}.jpg`,
      `https://example.com/img2-${id}.jpg`,
      `https://example.com/img3-${id}.jpg`,
    ],
    rating: 4.5,
    reviewCount: 250,
    priceRange: 2,
    deliveryTime: '30-45 min',
    deliveryFee: 5.99,
    minimumOrder: 15,
    isOpen: true,
    operatingHours: {
      monday: [{ open: '09:00', close: '22:00' }],
      tuesday: [{ open: '09:00', close: '22:00' }],
      wednesday: [{ open: '09:00', close: '22:00' }],
      thursday: [{ open: '09:00', close: '22:00' }],
      friday: [{ open: '09:00', close: '23:00' }],
      saturday: [{ open: '10:00', close: '23:00' }],
      sunday: [{ open: '10:00', close: '21:00' }],
    },
    location: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    dishes: ['dish-1', 'dish-2', 'dish-3'],
    tags: ['Popular', 'Fast Delivery', 'Highly Rated'],
    provider: 'mock',
    ...overrides,
  };
}

/**
 * Generates multiple mock restaurants
 * @param count - Number of restaurants to generate
 * @param overrides - Partial restaurant to override defaults
 * @returns Array of mock restaurants
 */
export function mockRestaurants(
  count: number,
  overrides: Partial<Restaurant> = {}
): Restaurant[] {
  return Array.from({ length: count }, (_, index) =>
    mockRestaurant({
      id: `rest-${index + 1}`,
      name: `Restaurant ${index + 1}`,
      rating: 3.5 + (index % 3) * 0.5,
      priceRange: ((index % 4) + 1) as 1 | 2 | 3 | 4,
      ...overrides,
    })
  );
}

/**
 * Generates a mock restaurant with specific cuisine
 * @param cuisine - Cuisine type
 * @param overrides - Partial restaurant to override defaults
 * @returns Mock restaurant with specified cuisine
 */
export function mockRestaurantWithCuisine(
  cuisine: string,
  overrides: Partial<Restaurant> = {}
): Restaurant {
  const cuisineNames: Record<string, string> = {
    italian: 'Bella Italia',
    chinese: 'Golden Dragon',
    mexican: 'El Taco Loco',
    indian: 'Spice Palace',
    japanese: 'Sakura Sushi',
    american: 'Burger House',
  };

  return mockRestaurant({
    name: cuisineNames[cuisine.toLowerCase()] || `${cuisine} Restaurant`,
    cuisine: [cuisine],
    description: `Authentic ${cuisine} cuisine`,
    ...overrides,
  });
}

/**
 * Generates a closed restaurant
 * @param overrides - Partial restaurant to override defaults
 * @returns Mock closed restaurant
 */
export function mockClosedRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return mockRestaurant({
    isOpen: false,
    ...overrides,
  });
}

/**
 * Generates a highly rated restaurant
 * @param overrides - Partial restaurant to override defaults
 * @returns Mock highly rated restaurant
 */
export function mockHighlyRatedRestaurant(
  overrides: Partial<Restaurant> = {}
): Restaurant {
  return mockRestaurant({
    rating: 4.8,
    reviewCount: 1000,
    tags: ['Top Rated', 'Popular', 'Must Try'],
    ...overrides,
  });
}

/**
 * Generates a budget-friendly restaurant
 * @param overrides - Partial restaurant to override defaults
 * @returns Mock budget restaurant
 */
export function mockBudgetRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return mockRestaurant({
    priceRange: 1,
    deliveryFee: 2.99,
    minimumOrder: 10,
    tags: ['Budget Friendly', 'Great Value'],
    ...overrides,
  });
}

/**
 * Generates a premium restaurant
 * @param overrides - Partial restaurant to override defaults
 * @returns Mock premium restaurant
 */
export function mockPremiumRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return mockRestaurant({
    priceRange: 4,
    deliveryFee: 9.99,
    minimumOrder: 50,
    rating: 4.9,
    tags: ['Premium', 'Fine Dining', 'Chef Special'],
    ...overrides,
  });
}

/**
 * Resets the restaurant ID counter
 */
export function resetRestaurantIdCounter(): void {
  restaurantIdCounter = 1;
}

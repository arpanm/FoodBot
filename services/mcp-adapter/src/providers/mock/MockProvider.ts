/**
 * Mock Provider implementation.
 * Generates realistic synthetic data for development, testing, and demo.
 * Always available as the last fallback provider.
 */

import type {
  Provider,
  SearchQuery,
  SearchResult,
  RestaurantDetails,
  Menu,
  MenuCategory,
  Dish,
  AvailabilityStatus,
  OrderRequest,
  OrderResponse,
  ProviderHealth,
  Restaurant,
  Review,
} from '../../types/provider.types.js';
import type { ProviderName, GeoLocation, Customization } from '../../types/common.types.js';

const MOCK_RESTAURANTS: MockRestaurantData[] = [
  {
    id: 'mock-r1',
    name: 'Punjab Grill',
    cuisines: ['North Indian', 'Mughlai', 'Tandoor'],
    rating: 4.3,
    reviewCount: 2500,
    deliveryTime: 35,
    priceRange: 3,
    isVeg: false,
    locality: 'Koramangala',
  },
  {
    id: 'mock-r2',
    name: 'Dosa Factory',
    cuisines: ['South Indian', 'Kerala', 'Chettinad'],
    rating: 4.5,
    reviewCount: 3200,
    deliveryTime: 25,
    priceRange: 1,
    isVeg: true,
    locality: 'Indiranagar',
  },
  {
    id: 'mock-r3',
    name: 'Pizza Paradise',
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    rating: 4.1,
    reviewCount: 1800,
    deliveryTime: 30,
    priceRange: 2,
    isVeg: false,
    locality: 'HSR Layout',
  },
  {
    id: 'mock-r4',
    name: 'Wok Express',
    cuisines: ['Chinese', 'Thai', 'Asian'],
    rating: 4.0,
    reviewCount: 1500,
    deliveryTime: 40,
    priceRange: 2,
    isVeg: false,
    locality: 'Whitefield',
  },
  {
    id: 'mock-r5',
    name: 'Biryani House',
    cuisines: ['Biryani', 'Hyderabadi', 'Kebabs'],
    rating: 4.6,
    reviewCount: 5000,
    deliveryTime: 45,
    priceRange: 2,
    isVeg: false,
    locality: 'BTM Layout',
  },
  {
    id: 'mock-r6',
    name: 'Green Bowl Salads',
    cuisines: ['Healthy', 'Salads', 'Continental'],
    rating: 4.2,
    reviewCount: 800,
    deliveryTime: 20,
    priceRange: 2,
    isVeg: true,
    locality: 'MG Road',
  },
  {
    id: 'mock-r7',
    name: 'Burger Junction',
    cuisines: ['American', 'Burgers', 'Fast Food'],
    rating: 3.9,
    reviewCount: 2200,
    deliveryTime: 25,
    priceRange: 1,
    isVeg: false,
    locality: 'Electronic City',
  },
  {
    id: 'mock-r8',
    name: 'Sushi Master',
    cuisines: ['Japanese', 'Sushi', 'Asian'],
    rating: 4.4,
    reviewCount: 600,
    deliveryTime: 50,
    priceRange: 4,
    isVeg: false,
    locality: 'Jayanagar',
  },
];

const MOCK_DISHES: Record<string, MockDishData[]> = {
  'mock-r1': [
    { id: 'mock-d1', name: 'Butter Chicken', price: 350, category: 'Main Course', isVeg: false, rating: 4.5 },
    { id: 'mock-d2', name: 'Dal Makhani', price: 250, category: 'Main Course', isVeg: true, rating: 4.3 },
    { id: 'mock-d3', name: 'Garlic Naan', price: 60, category: 'Breads', isVeg: true, rating: 4.2 },
    { id: 'mock-d4', name: 'Paneer Tikka', price: 280, category: 'Starters', isVeg: true, rating: 4.4 },
  ],
  'mock-r2': [
    { id: 'mock-d5', name: 'Masala Dosa', price: 120, category: 'Dosa', isVeg: true, rating: 4.6 },
    { id: 'mock-d6', name: 'Idli Sambar', price: 80, category: 'Breakfast', isVeg: true, rating: 4.4 },
    { id: 'mock-d7', name: 'Filter Coffee', price: 40, category: 'Beverages', isVeg: true, rating: 4.7 },
  ],
  'mock-r3': [
    { id: 'mock-d8', name: 'Margherita Pizza', price: 299, category: 'Pizza', isVeg: true, rating: 4.2 },
    { id: 'mock-d9', name: 'Pepperoni Pizza', price: 399, category: 'Pizza', isVeg: false, rating: 4.3 },
    { id: 'mock-d10', name: 'Pasta Alfredo', price: 279, category: 'Pasta', isVeg: true, rating: 4.0 },
  ],
  'mock-r5': [
    { id: 'mock-d11', name: 'Chicken Biryani', price: 299, category: 'Biryani', isVeg: false, rating: 4.7 },
    { id: 'mock-d12', name: 'Mutton Biryani', price: 399, category: 'Biryani', isVeg: false, rating: 4.6 },
    { id: 'mock-d13', name: 'Veg Biryani', price: 199, category: 'Biryani', isVeg: true, rating: 4.2 },
    { id: 'mock-d14', name: 'Raita', price: 50, category: 'Sides', isVeg: true, rating: 4.0 },
  ],
};

interface MockRestaurantData {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: number;
  priceRange: number;
  isVeg: boolean;
  locality: string;
}

interface MockDishData {
  id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  rating: number;
}

export class MockProvider implements Provider {
  readonly name: ProviderName = 'mock';

  isEnabled(): boolean {
    return true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: 'mock',
      status: 'healthy',
      latencyMs: 1,
      lastChecked: new Date().toISOString(),
      details: 'Mock provider is always available',
      circuitBreakerState: 'closed',
    };
  }

  async searchRestaurants(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const q = query.query.toLowerCase();

    let results = MOCK_RESTAURANTS.filter((r) => {
      if (!q) {
        return true;
      }
      return (
        r.name.toLowerCase().includes(q) ||
        r.cuisines.some((c) => c.toLowerCase().includes(q)) ||
        r.locality.toLowerCase().includes(q)
      );
    });

    if (query.cuisines?.length) {
      results = results.filter((r) =>
        r.cuisines.some((c) =>
          query.cuisines?.some((qc) =>
            c.toLowerCase().includes(qc.toLowerCase())
          )
        )
      );
    }

    if (query.isVegetarian) {
      results = results.filter((r) => r.isVeg);
    }

    if (query.minRating) {
      results = results.filter((r) => r.rating >= (query.minRating ?? 0));
    }

    const restaurants: Restaurant[] = results.map((r) =>
      this.toRestaurant(r, query.location)
    );

    const start = (query.pagination.page - 1) * query.pagination.pageSize;
    const paginated = restaurants.slice(start, start + query.pagination.pageSize);

    return {
      restaurants: paginated,
      totalCount: restaurants.length,
      page: query.pagination.page,
      pageSize: query.pagination.pageSize,
      hasMore: start + query.pagination.pageSize < restaurants.length,
      metadata: {
        source: 'mock',
        freshness: 'synthetic',
        cachedAt: null,
        nextRefreshAt: null,
        queryTimeMs: Date.now() - startTime,
        provider: 'mock',
      },
    };
  }

  async getRestaurantDetails(id: string): Promise<RestaurantDetails | null> {
    const mockId = id.replace('mock-', '');
    const data = MOCK_RESTAURANTS.find((r) => r.id === `mock-${mockId}` || r.id === id);
    if (!data) {
      return null;
    }

    const restaurant = this.toRestaurant(data, { lat: 12.97, lng: 77.59 });
    const menu = await this.getMenu(id);

    return {
      ...restaurant,
      description: `${data.name} is a popular restaurant in ${data.locality} known for its ${data.cuisines.join(', ')} cuisine.`,
      phone: '+91-80-12345678',
      email: `contact@${data.name.toLowerCase().replace(/\s/g, '')}.com`,
      website: `https://${data.name.toLowerCase().replace(/\s/g, '')}.com`,
      menuCategories: menu?.categories ?? [],
      photos: [],
      reviews: this.generateMockReviews(data),
    };
  }

  async getMenu(restaurantId: string): Promise<Menu | null> {
    const mockId = restaurantId.replace('mock-', '');
    const fullId = `mock-${mockId}`;
    const data = MOCK_RESTAURANTS.find((r) => r.id === fullId || r.id === restaurantId);
    if (!data) {
      return null;
    }

    const dishes = MOCK_DISHES[fullId] ?? MOCK_DISHES[restaurantId] ?? [];
    const categoryMap = new Map<string, Dish[]>();

    for (const d of dishes) {
      const dish = this.toDish(d, fullId);
      const existing = categoryMap.get(d.category) ?? [];
      existing.push(dish);
      categoryMap.set(d.category, existing);
    }

    const categories: MenuCategory[] = [];
    let order = 0;
    for (const [catName, catDishes] of categoryMap) {
      categories.push({
        id: `mock-cat-${order}`,
        name: catName,
        description: '',
        sortOrder: order,
        dishes: catDishes,
      });
      order++;
    }

    return {
      restaurantId: fullId.startsWith('mock-') ? fullId : `mock-${fullId}`,
      restaurantName: data.name,
      categories,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getDishDetails(dishId: string): Promise<Dish | null> {
    for (const [restaurantId, dishes] of Object.entries(MOCK_DISHES)) {
      const found = dishes.find((d) => d.id === dishId || `mock-dish-${d.id}` === dishId);
      if (found) {
        return this.toDish(found, restaurantId);
      }
    }
    return null;
  }

  async checkAvailability(restaurantId: string): Promise<AvailabilityStatus> {
    const data = MOCK_RESTAURANTS.find(
      (r) => r.id === restaurantId || `mock-${r.id}` === restaurantId
    );

    return {
      restaurantId,
      isOpen: true,
      isAcceptingOrders: true,
      estimatedDeliveryMinutes: data?.deliveryTime ?? 30,
      nextOpenTime: null,
      message: `Mock: Delivering in ${data?.deliveryTime ?? 30} min`,
    };
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return {
      orderId: `mock-order-${Date.now()}`,
      status: 'placed',
      estimatedDeliveryMinutes: 30,
      totalAmount: 500,
      currency: 'INR',
      trackingUrl: 'https://mock.foodbot.com/track/mock-order',
      message: 'Mock order placed successfully. This is demo data.',
    };
  }

  private toRestaurant(data: MockRestaurantData, location: GeoLocation): Restaurant {
    return {
      id: data.id,
      externalId: data.id,
      provider: 'mock',
      name: data.name,
      imageUrl: '',
      address: `${data.locality}, Bangalore`,
      cuisines: data.cuisines,
      rating: data.rating,
      reviewCount: data.reviewCount,
      deliveryTimeMinutes: data.deliveryTime,
      distanceKm: Math.round(Math.random() * 50 + 5) / 10,
      priceRange: data.priceRange as 1 | 2 | 3 | 4,
      isOpen: true,
      isAvailable: true,
      offers: [],
      operatingHours: null,
      location,
    };
  }

  private toDish(data: MockDishData, restaurantId: string): Dish {
    return {
      id: `mock-dish-${data.id}`,
      externalId: data.id,
      provider: 'mock',
      restaurantId,
      name: data.name,
      description: `Delicious ${data.name} prepared with fresh ingredients.`,
      category: data.category,
      imageUrl: '',
      price: data.price,
      originalPrice: data.price,
      currency: 'INR',
      rating: data.rating,
      reviewCount: Math.floor(Math.random() * 500),
      isVegetarian: data.isVeg,
      isAvailable: true,
      customizations: [],
      nutritionalInfo: null,
    };
  }

  private generateMockReviews(data: MockRestaurantData): Review[] {
    return [
      {
        id: 'mock-review-1',
        userId: 'mock-user-1',
        userName: 'Food Lover',
        rating: 5,
        text: `Amazing ${data.cuisines[0]} food! Highly recommend ${data.name}.`,
        date: '2026-02-15',
        helpful: 12,
      },
      {
        id: 'mock-review-2',
        userId: 'mock-user-2',
        userName: 'Hungry Customer',
        rating: 4,
        text: 'Good food, delivery was on time. Will order again.',
        date: '2026-02-10',
        helpful: 5,
      },
    ];
  }
}

/**
 * Restaurant test data factory
 */

import type { Restaurant, RestaurantOwner } from '../../types/models';

let counter = 0;

export class RestaurantFactory {
  static build(overrides?: Partial<Restaurant>): Restaurant {
    counter++;
    return {
      id: `restaurant-${counter}`,
      name: `Test Restaurant ${counter}`,
      description: 'A wonderful test restaurant',
      cuisine: ['Italian', 'American'],
      logo: 'https://example.com/logo.jpg',
      images: [],
      rating: 4.2,
      reviewCount: 50,
      priceRange: 2,
      deliveryTime: '30-45 min',
      deliveryFee: 3.99,
      minimumOrder: 15,
      isOpen: true,
      isActive: true,
      isApproved: true,
      location: {
        address: '123 Test St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        coordinates: { latitude: 40.7128, longitude: -74.006 },
      },
      ownerId: `owner-${counter}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static buildOwner(overrides?: Partial<RestaurantOwner>): RestaurantOwner {
    counter++;
    return {
      id: `owner-${counter}`,
      email: `owner${counter}@restaurant.com`,
      name: `Owner ${counter}`,
      role: 'restaurant_owner',
      restaurantId: `restaurant-${counter}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }
}

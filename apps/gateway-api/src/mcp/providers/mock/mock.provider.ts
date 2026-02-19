import { Injectable, Logger } from '@nestjs/common';

import { IRestaurantProvider, Restaurant, Location, SearchFilters } from '../../interfaces/restaurant-provider.interface';

/**
 * Mock Restaurant Provider
 * Provides mock data for testing and fallback
 */
@Injectable()
export class MockRestaurantProvider implements IRestaurantProvider {
  private readonly logger = new Logger(MockRestaurantProvider.name);

  private readonly mockRestaurants: Restaurant[] = [
    {
      id: 'mock-1',
      externalId: 'mock-1',
      name: 'The Italian Kitchen',
      description: 'Authentic Italian cuisine with fresh pasta and wood-fired pizzas',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
        formattedAddress: '123 Main St, San Francisco, CA 94105',
      },
      location: { lat: 37.7749, lng: -122.4194 },
      phoneNumber: '+14155551234',
      email: 'contact@italiankitchen.com',
      rating: 4.5,
      reviewCount: 250,
      priceRange: 'moderate',
      cuisineTypes: ['Italian', 'Pizza', 'Pasta'],
      images: [],
      operatingHours: {
        monday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
        wednesday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
        thursday: { isOpen: true, openTime: '11:00', closeTime: '22:00' },
        friday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
        saturday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
        sunday: { isOpen: true, openTime: '12:00', closeTime: '22:00' },
      },
      deliveryRadius: 5,
      minimumOrder: 15,
      deliveryFee: 3.99,
      preparationTime: 30,
      isActive: true,
      isApproved: true,
      source: 'mock',
    },
    {
      id: 'mock-2',
      externalId: 'mock-2',
      name: 'Sushi Palace',
      description: 'Fresh sushi and Japanese cuisine',
      address: {
        street: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA',
        formattedAddress: '456 Oak Ave, San Francisco, CA 94102',
      },
      location: { lat: 37.7850, lng: -122.4183 },
      phoneNumber: '+14155555678',
      email: 'info@sushipalace.com',
      rating: 4.8,
      reviewCount: 450,
      priceRange: 'premium',
      cuisineTypes: ['Japanese', 'Sushi', 'Asian'],
      images: [],
      operatingHours: {
        monday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
        tuesday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
        wednesday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
        thursday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
        friday: { isOpen: true, openTime: '12:00', closeTime: '22:00' },
        saturday: { isOpen: true, openTime: '12:00', closeTime: '22:00' },
        sunday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
      },
      deliveryRadius: 8,
      minimumOrder: 20,
      deliveryFee: 4.99,
      preparationTime: 35,
      isActive: true,
      isApproved: true,
      source: 'mock',
    },
    {
      id: 'mock-3',
      externalId: 'mock-3',
      name: 'Taco Fiesta',
      description: 'Authentic Mexican street food and tacos',
      address: {
        street: '789 Mission St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
        country: 'USA',
        formattedAddress: '789 Mission St, San Francisco, CA 94103',
      },
      location: { lat: 37.7799, lng: -122.4077 },
      phoneNumber: '+14155559012',
      email: 'hello@tacofiesta.com',
      rating: 4.3,
      reviewCount: 180,
      priceRange: 'budget',
      cuisineTypes: ['Mexican', 'Tacos', 'Street Food'],
      images: [],
      operatingHours: {
        monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        wednesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        thursday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        friday: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
        saturday: { isOpen: true, openTime: '10:00', closeTime: '23:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
      },
      deliveryRadius: 6,
      minimumOrder: 10,
      deliveryFee: 2.99,
      preparationTime: 20,
      isActive: true,
      isApproved: true,
      source: 'mock',
    },
  ];

  async searchNearby(lat: number, lng: number, radius: number, filters?: SearchFilters): Promise<Restaurant[]> {
    this.logger.debug(`Mock searchNearby: lat=${lat}, lng=${lng}, radius=${radius}`);

    // Simulate distance-based filtering
    let results = this.mockRestaurants.filter((restaurant) => {
      const distance = this.calculateDistance(lat, lng, restaurant.location.lat, restaurant.location.lng);
      return distance <= radius / 1000; // Convert meters to km
    });

    // Apply filters
    results = this.applyFilters(results, filters);

    return results;
  }

  async searchByQuery(query: string, location?: Location, filters?: SearchFilters): Promise<Restaurant[]> {
    this.logger.debug(`Mock searchByQuery: query=${query}`);

    const lowerQuery = query.toLowerCase();

    // Search by name or cuisine
    let results = this.mockRestaurants.filter(
      (restaurant) =>
        restaurant.name.toLowerCase().includes(lowerQuery) ||
        restaurant.cuisineTypes.some((cuisine) => cuisine.toLowerCase().includes(lowerQuery)) ||
        restaurant.description.toLowerCase().includes(lowerQuery),
    );

    // Filter by location if provided
    if (location) {
      const radius = filters?.radius || 10000; // Default 10km
      results = results.filter((restaurant) => {
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          restaurant.location.lat,
          restaurant.location.lng,
        );
        return distance <= radius / 1000;
      });
    }

    // Apply filters
    results = this.applyFilters(results, filters);

    return results;
  }

  async getRestaurantDetails(id: string): Promise<Restaurant | null> {
    this.logger.debug(`Mock getRestaurantDetails: id=${id}`);
    return this.mockRestaurants.find((r) => r.id === id) || null;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Apply search filters
   */
  private applyFilters(restaurants: Restaurant[], filters?: SearchFilters): Restaurant[] {
    if (!filters) return restaurants;

    let filtered = restaurants;

    if (filters.minRating !== undefined) {
      filtered = filtered.filter((r) => r.rating >= filters.minRating!);
    }

    if (filters.cuisineTypes && filters.cuisineTypes.length > 0) {
      filtered = filtered.filter((r) => filters.cuisineTypes!.some((c) => r.cuisineTypes.includes(c)));
    }

    if (filters.priceRange && filters.priceRange.length > 0) {
      filtered = filtered.filter((r) => filters.priceRange!.includes(r.priceRange));
    }

    // Pagination
    if (filters.page && filters.limit) {
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

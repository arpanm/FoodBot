/**
 * Tests for Zomato provider components.
 */

import { mapZomatoRestaurant, mapZomatoDish, mapZomatoReview } from '../src/providers/zomato/zomatoMapper';
import type { ZomatoRestaurantInfo, ZomatoDishInfo, ZomatoReview } from '../src/types/zomato.types';

describe('ZomatoMapper', () => {
  describe('mapZomatoRestaurant', () => {
    const mockRestaurant: ZomatoRestaurantInfo = {
      R: { res_id: 12345, is_grocery_store: false },
      id: '12345',
      name: 'Zomato Test Restaurant',
      url: 'https://www.zomato.com/test',
      location: {
        address: '123 Test Street',
        locality: 'Indiranagar',
        city: 'Bangalore',
        city_id: 4,
        latitude: '12.9716',
        longitude: '77.5946',
        zipcode: '560038',
        country_id: 1,
        locality_verbose: 'Indiranagar, Bangalore',
      },
      switch_to_order_menu: 0,
      cuisines: 'Italian, Pizza, Pasta',
      timings: '11am - 11pm',
      average_cost_for_two: 800,
      price_range: 3,
      currency: 'Rs.',
      highlights: ['Outdoor Seating', 'WiFi'],
      offers: ['20% off on all orders'],
      opentable_support: 0,
      is_zomato_book_res: 0,
      mezzo_provider: '',
      is_book_form_web_view: 0,
      book_form_web_view_url: '',
      book_again_url: '',
      thumb: 'https://example.com/thumb.jpg',
      user_rating: {
        aggregate_rating: '4.2',
        rating_text: 'Very Good',
        rating_color: '5BA829',
        rating_obj: {
          title: { text: '4.2' },
          bg_color: { type: 'lime', tint: '600' },
        },
        votes: '1500',
      },
      all_reviews_count: 150,
      photos_url: 'https://example.com/photos',
      photo_count: 25,
      menu_url: 'https://example.com/menu',
      featured_image: 'https://example.com/featured.jpg',
      has_online_delivery: 1,
      is_delivering_now: 1,
      store_type: '',
      include_bogo_offers: false,
      deeplink: '',
      is_table_reservation_supported: 0,
      has_table_booking: 0,
      events_url: '',
      phone_numbers: '+91-80-12345678',
      all_reviews: { reviews: [] },
      establishment: ['Casual Dining'],
      establishment_types: [1],
      delivery_time: '45 minutes',
    };

    it('should map Zomato restaurant to FoodBot format', () => {
      const result = mapZomatoRestaurant(mockRestaurant);

      expect(result.id).toBe('zomato-12345');
      expect(result.externalId).toBe('12345');
      expect(result.provider).toBe('zomato');
      expect(result.name).toBe('Zomato Test Restaurant');
    });

    it('should parse cuisines from comma-separated string', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.cuisines).toEqual(['Italian', 'Pizza', 'Pasta']);
    });

    it('should parse rating correctly', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.rating).toBe(4.2);
      expect(result.reviewCount).toBe(1500);
    });

    it('should parse delivery time', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.deliveryTimeMinutes).toBe(45);
    });

    it('should map price range directly', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.priceRange).toBe(3);
    });

    it('should detect online delivery availability', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.isOpen).toBe(true);
      expect(result.isAvailable).toBe(true);
    });

    it('should use featured image', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.imageUrl).toBe('https://example.com/featured.jpg');
    });

    it('should fall back to thumb when no featured image', () => {
      const noFeatured = { ...mockRestaurant, featured_image: '' };
      const result = mapZomatoRestaurant(noFeatured);
      expect(result.imageUrl).toBe('https://example.com/thumb.jpg');
    });

    it('should parse offers', () => {
      const result = mapZomatoRestaurant(mockRestaurant);
      expect(result.offers).toHaveLength(1);
      expect(result.offers[0]?.title).toBe('20% off on all orders');
    });

    it('should calculate distance when user location provided', () => {
      const userLocation = { lat: 12.9816, lng: 77.6046 };
      const result = mapZomatoRestaurant(mockRestaurant, userLocation);
      expect(result.distanceKm).toBeGreaterThan(0);
    });

    it('should handle not delivering status', () => {
      const notDelivering = { ...mockRestaurant, is_delivering_now: 0 };
      const result = mapZomatoRestaurant(notDelivering);
      expect(result.isOpen).toBe(false);
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('mapZomatoDish', () => {
    const mockDish: ZomatoDishInfo = {
      dish_id: 'z-dish-001',
      name: 'Margherita Pizza',
      description: 'Classic pizza with fresh mozzarella',
      price: 399,
      currency: 'Rs.',
      category: 'Pizza',
      is_veg: true,
      image_url: 'https://example.com/pizza.jpg',
      rating: 4.3,
      votes: 250,
      variants: [
        {
          variant_id: 'v1',
          name: 'Regular',
          price: 399,
          is_default: true,
          is_available: true,
        },
        {
          variant_id: 'v2',
          name: 'Large',
          price: 599,
          is_default: false,
          is_available: true,
        },
      ],
      addons: [],
      available: true,
      min_order_quantity: 1,
      max_order_quantity: 10,
    };

    it('should map Zomato dish to FoodBot format', () => {
      const result = mapZomatoDish(mockDish, '12345');

      expect(result.id).toBe('zomato-dish-z-dish-001');
      expect(result.provider).toBe('zomato');
      expect(result.name).toBe('Margherita Pizza');
      expect(result.price).toBe(399);
      expect(result.isVegetarian).toBe(true);
      expect(result.isAvailable).toBe(true);
    });

    it('should map variants as customizations', () => {
      const result = mapZomatoDish(mockDish, '12345');
      expect(result.customizations).toHaveLength(2);
    });

    it('should set currency to INR', () => {
      const result = mapZomatoDish(mockDish, '12345');
      expect(result.currency).toBe('INR');
    });
  });

  describe('mapZomatoReview', () => {
    it('should map Zomato review', () => {
      const mockReview: ZomatoReview = {
        review: {
          rating: 4,
          review_text: 'Great food and service!',
          id: 12345,
          rating_color: '5BA829',
          review_time_friendly: '2 days ago',
          rating_text: 'Great!',
          timestamp: 1708300800,
          likes: 5,
          user: {
            name: 'Test User',
            foodie_level: 'Big Foodie',
            foodie_level_num: 7,
            foodie_color: '5BA829',
            profile_url: '',
            profile_image: '',
          },
          comments_count: 2,
        },
      };

      const result = mapZomatoReview(mockReview);

      expect(result.id).toBe('12345');
      expect(result.userName).toBe('Test User');
      expect(result.rating).toBe(4);
      expect(result.text).toBe('Great food and service!');
      expect(result.helpful).toBe(5);
    });
  });
});

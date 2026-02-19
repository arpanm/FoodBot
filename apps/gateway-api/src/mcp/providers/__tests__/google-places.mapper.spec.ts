import { GooglePlacesMapper } from '../google-places/google-places.mapper';
import { GooglePlace, GooglePlaceDetails } from '../../interfaces/google-places.types';

describe('GooglePlacesMapper', () => {
  let mapper: GooglePlacesMapper;

  beforeEach(() => {
    mapper = new GooglePlacesMapper();
  });

  describe('toRestaurant', () => {
    it('should map Google Place to Restaurant', () => {
      const googlePlace: GooglePlace = {
        place_id: 'ChIJ123',
        name: 'Test Restaurant',
        formatted_address: '123 Main St, San Francisco, CA 94105',
        geometry: {
          location: { lat: 37.7749, lng: -122.4194 },
        },
        rating: 4.5,
        user_ratings_total: 100,
        price_level: 2,
        types: ['restaurant', 'food'],
        business_status: 'OPERATIONAL',
      };

      const restaurant = mapper.toRestaurant(googlePlace);

      expect(restaurant.id).toBe('gp_ChIJ123');
      expect(restaurant.externalId).toBe('ChIJ123');
      expect(restaurant.name).toBe('Test Restaurant');
      expect(restaurant.location.lat).toBe(37.7749);
      expect(restaurant.location.lng).toBe(-122.4194);
      expect(restaurant.rating).toBe(4.5);
      expect(restaurant.reviewCount).toBe(100);
      expect(restaurant.priceRange).toBe('moderate');
      expect(restaurant.source).toBe('google_places');
      expect(restaurant.isActive).toBe(true);
      expect(restaurant.isApproved).toBe(false);
    });

    it('should handle missing rating and review count', () => {
      const googlePlace: GooglePlace = {
        place_id: 'ChIJ456',
        name: 'New Restaurant',
        formatted_address: '456 Oak St',
        geometry: {
          location: { lat: 37.7850, lng: -122.4183 },
        },
        business_status: 'OPERATIONAL',
      };

      const restaurant = mapper.toRestaurant(googlePlace);

      expect(restaurant.rating).toBe(0);
      expect(restaurant.reviewCount).toBe(0);
    });

    it('should map price levels correctly', () => {
      const testCases = [
        { priceLevel: undefined, expected: 'moderate' },
        { priceLevel: 0, expected: 'budget' },
        { priceLevel: 1, expected: 'budget' },
        { priceLevel: 2, expected: 'moderate' },
        { priceLevel: 3, expected: 'premium' },
        { priceLevel: 4, expected: 'premium' },
      ];

      for (const { priceLevel, expected } of testCases) {
        const googlePlace: GooglePlace = {
          place_id: 'test',
          name: 'Test',
          formatted_address: 'Test',
          geometry: { location: { lat: 0, lng: 0 } },
          price_level: priceLevel,
          business_status: 'OPERATIONAL',
        };

        const restaurant = mapper.toRestaurant(googlePlace);
        expect(restaurant.priceRange).toBe(expected);
      }
    });

    it('should handle detailed place with address components', () => {
      const detailedPlace: GooglePlaceDetails = {
        place_id: 'ChIJ789',
        name: 'Detailed Restaurant',
        formatted_address: '789 Mission St, San Francisco, CA 94103, USA',
        geometry: {
          location: { lat: 37.7799, lng: -122.4077 },
        },
        rating: 4.3,
        user_ratings_total: 150,
        price_level: 3,
        types: ['restaurant', 'food'],
        business_status: 'OPERATIONAL',
        formatted_phone_number: '+1 415-555-0100',
        address_components: [
          { long_name: '789', short_name: '789', types: ['street_number'] },
          { long_name: 'Mission St', short_name: 'Mission St', types: ['route'] },
          { long_name: 'San Francisco', short_name: 'SF', types: ['locality'] },
          { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
          { long_name: '94103', short_name: '94103', types: ['postal_code'] },
          { long_name: 'United States', short_name: 'US', types: ['country'] },
        ],
      };

      const restaurant = mapper.toRestaurant(detailedPlace);

      expect(restaurant.address.street).toContain('789');
      expect(restaurant.address.street).toContain('Mission St');
      expect(restaurant.address.city).toBe('San Francisco');
      expect(restaurant.address.state).toBe('CA');
      expect(restaurant.address.zipCode).toBe('94103');
      expect(restaurant.address.country).toBe('United States');
      expect(restaurant.phoneNumber).toBe('+1 415-555-0100');
    });

    it('should extract cuisine types from place types', () => {
      const googlePlace: GooglePlace = {
        place_id: 'ChIJ111',
        name: 'Cafe',
        formatted_address: 'Test',
        geometry: { location: { lat: 0, lng: 0 } },
        types: ['cafe', 'bakery', 'bar', 'restaurant'],
        business_status: 'OPERATIONAL',
      };

      const restaurant = mapper.toRestaurant(googlePlace);

      expect(restaurant.cuisineTypes).toContain('Cafe');
      expect(restaurant.cuisineTypes).toContain('Bakery');
      expect(restaurant.cuisineTypes).toContain('Bar');
    });

    it('should handle photos', () => {
      const googlePlace: GooglePlace = {
        place_id: 'ChIJ222',
        name: 'Photo Restaurant',
        formatted_address: 'Test',
        geometry: { location: { lat: 0, lng: 0 } },
        business_status: 'OPERATIONAL',
        photos: [
          {
            height: 400,
            width: 600,
            photo_reference: 'photo_ref_1',
            html_attributions: [],
          },
          {
            height: 400,
            width: 600,
            photo_reference: 'photo_ref_2',
            html_attributions: [],
          },
        ],
      };

      const restaurant = mapper.toRestaurant(googlePlace);

      expect(restaurant.images).toHaveLength(2);
      expect(restaurant.images[0]).toBe('photo_ref_1');
      expect(restaurant.images[1]).toBe('photo_ref_2');
    });

    it('should parse operating hours', () => {
      const googlePlace: GooglePlace = {
        place_id: 'ChIJ333',
        name: 'Hours Restaurant',
        formatted_address: 'Test',
        geometry: { location: { lat: 0, lng: 0 } },
        business_status: 'OPERATIONAL',
        opening_hours: {
          open_now: true,
          periods: [
            {
              open: { day: 0, time: '0900' },
              close: { day: 0, time: '2100' },
            },
            {
              open: { day: 1, time: '1000' },
              close: { day: 1, time: '2200' },
            },
          ],
        },
      };

      const restaurant = mapper.toRestaurant(googlePlace);

      expect(restaurant.operatingHours).toBeDefined();
      expect(restaurant.operatingHours!.sunday).toEqual({
        isOpen: true,
        openTime: '09:00',
        closeTime: '21:00',
      });
      expect(restaurant.operatingHours!.monday).toEqual({
        isOpen: true,
        openTime: '10:00',
        closeTime: '22:00',
      });
    });

    it('should handle closed business', () => {
      const googlePlace: GooglePlace = {
        place_id: 'ChIJ444',
        name: 'Closed Restaurant',
        formatted_address: 'Test',
        geometry: { location: { lat: 0, lng: 0 } },
        business_status: 'CLOSED_TEMPORARILY',
      };

      const restaurant = mapper.toRestaurant(googlePlace);

      expect(restaurant.isActive).toBe(false);
    });
  });

  describe('buildPhotoUrl', () => {
    it('should build correct photo URL', () => {
      const photoRef = 'test_photo_ref_123';
      const apiKey = 'test_api_key';

      const url = mapper.buildPhotoUrl(photoRef, apiKey);

      expect(url).toContain('https://maps.googleapis.com/maps/api/place/photo');
      expect(url).toContain(`photoreference=${photoRef}`);
      expect(url).toContain(`key=${apiKey}`);
      expect(url).toContain('maxwidth=400');
    });

    it('should support custom max width', () => {
      const photoRef = 'test_photo_ref_456';
      const apiKey = 'test_api_key';
      const maxWidth = 800;

      const url = mapper.buildPhotoUrl(photoRef, apiKey, maxWidth);

      expect(url).toContain(`maxwidth=${maxWidth}`);
    });
  });
});

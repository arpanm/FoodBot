import { Injectable, Logger } from '@nestjs/common';

import { GooglePlace, GooglePlaceDetails, GooglePlaceOpeningHours } from '../../interfaces/google-places.types';
import {
  Restaurant,
  Location,
  Address,
  OperatingHours,
  DayHours,
} from '../../interfaces/restaurant-provider.interface';

/**
 * Maps Google Places API responses to internal Restaurant model
 */
@Injectable()
export class GooglePlacesMapper {
  private readonly logger = new Logger(GooglePlacesMapper.name);

  /**
   * Convert Google Place to internal Restaurant model
   */
  toRestaurant(place: GooglePlace | GooglePlaceDetails): Restaurant {
    return {
      id: this.generateInternalId(place.place_id),
      externalId: place.place_id,
      name: place.name,
      description: this.extractDescription(place),
      address: this.parseAddress(place),
      location: this.parseLocation(place),
      phoneNumber: this.extractPhoneNumber(place),
      email: '', // Google Places doesn't provide email
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      priceRange: this.mapPriceLevel(place.price_level),
      cuisineTypes: this.extractCuisineTypes(place.types || []),
      images: this.extractImages(place),
      operatingHours: this.parseOperatingHours(place.opening_hours),
      deliveryRadius: 5, // Default value, not provided by Google Places
      minimumOrder: 0, // Default value
      deliveryFee: 0, // Default value
      preparationTime: 30, // Default value
      isActive: this.isBusinessActive(place),
      isApproved: false, // Requires manual approval
      source: 'google_places',
    };
  }

  /**
   * Generate internal ID from Google Place ID
   */
  private generateInternalId(placeId: string): string {
    return `gp_${placeId}`;
  }

  /**
   * Extract description from place data
   */
  private extractDescription(place: GooglePlace | GooglePlaceDetails): string {
    const details = place as GooglePlaceDetails;
    if (details.reviews && details.reviews.length > 0) {
      return details.reviews[0].text.substring(0, 200);
    }
    return `${place.name} - ${this.extractCuisineTypes(place.types || []).join(', ')}`;
  }

  /**
   * Parse address from Google Place
   */
  private parseAddress(place: GooglePlace | GooglePlaceDetails): Address {
    const details = place as GooglePlaceDetails;

    if (details.address_components) {
      return this.parseAddressComponents(details.address_components);
    }

    return {
      formattedAddress: place.formatted_address || place.vicinity || '',
    };
  }

  /**
   * Parse address components into structured address
   */
  private parseAddressComponents(
    components: Array<{ long_name: string; short_name: string; types: string[] }>,
  ): Address {
    const address: Address = {};

    for (const component of components) {
      if (component.types.includes('street_number') || component.types.includes('route')) {
        address.street = address.street ? `${component.long_name} ${address.street}` : component.long_name;
      } else if (component.types.includes('locality')) {
        address.city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        address.state = component.short_name;
      } else if (component.types.includes('postal_code')) {
        address.zipCode = component.long_name;
      } else if (component.types.includes('country')) {
        address.country = component.long_name;
      }
    }

    return address;
  }

  /**
   * Parse location coordinates
   */
  private parseLocation(place: GooglePlace): Location {
    return {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    };
  }

  /**
   * Extract phone number
   */
  private extractPhoneNumber(place: GooglePlace | GooglePlaceDetails): string {
    const details = place as GooglePlaceDetails;
    return details.formatted_phone_number || details.international_phone_number || '';
  }

  /**
   * Map Google price level to internal price range
   */
  private mapPriceLevel(priceLevel?: number): string {
    if (priceLevel === undefined || priceLevel === null) {
      return 'moderate';
    }

    const priceMap: Record<number, string> = {
      0: 'budget',
      1: 'budget',
      2: 'moderate',
      3: 'premium',
      4: 'premium',
    };

    return priceMap[priceLevel] || 'moderate';
  }

  /**
   * Extract cuisine types from Google Place types
   */
  private extractCuisineTypes(types: string[]): string[] {
    const cuisineKeywords = [
      'restaurant',
      'food',
      'meal_takeaway',
      'meal_delivery',
      'cafe',
      'bakery',
      'bar',
    ];

    const cuisineMap: Record<string, string> = {
      bakery: 'Bakery',
      cafe: 'Cafe',
      bar: 'Bar',
      meal_takeaway: 'Takeaway',
      meal_delivery: 'Delivery',
    };

    const cuisines: string[] = [];

    for (const type of types) {
      if (cuisineMap[type]) {
        cuisines.push(cuisineMap[type]);
      }
    }

    // If no specific cuisine found, add generic
    if (cuisines.length === 0) {
      cuisines.push('Restaurant');
    }

    return cuisines;
  }

  /**
   * Extract image URLs from photos
   */
  private extractImages(place: GooglePlace): string[] {
    if (!place.photos || place.photos.length === 0) {
      return [];
    }

    // Google Places photo references need to be converted to URLs
    // Format: https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=PHOTO_REFERENCE&key=API_KEY
    // Note: We return photo references here, actual URL construction happens at request time
    return place.photos.slice(0, 5).map((photo) => photo.photo_reference);
  }

  /**
   * Parse operating hours
   */
  private parseOperatingHours(openingHours?: GooglePlaceOpeningHours): OperatingHours | undefined {
    if (!openingHours || !openingHours.periods) {
      return undefined;
    }

    const hours: OperatingHours = {};
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (const period of openingHours.periods) {
      const dayName = dayMap[period.open.day] as keyof OperatingHours;
      const dayHours: DayHours = {
        isOpen: true,
        openTime: this.formatTime(period.open.time),
        closeTime: period.close ? this.formatTime(period.close.time) : '23:59',
      };
      hours[dayName] = dayHours;
    }

    return hours;
  }

  /**
   * Format time from HHMM to HH:MM
   */
  private formatTime(time: string): string {
    if (time.length !== 4) return time;
    return `${time.substring(0, 2)}:${time.substring(2)}`;
  }

  /**
   * Check if business is active
   */
  private isBusinessActive(place: GooglePlace): boolean {
    return place.business_status === 'OPERATIONAL';
  }

  /**
   * Build photo URL from photo reference
   */
  buildPhotoUrl(photoReference: string, apiKey: string, maxWidth = 400): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
  }
}

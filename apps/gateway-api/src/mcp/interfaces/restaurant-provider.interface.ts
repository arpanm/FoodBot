/**
 * Restaurant Provider Interface
 * Defines the contract for all restaurant data providers (Google Places, Mock, etc.)
 */

export interface Location {
  lat: number;
  lng: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  formattedAddress?: string;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: Address;
  location: Location;
  phoneNumber: string;
  email: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  cuisineTypes: string[];
  images: string[];
  operatingHours?: OperatingHours;
  deliveryRadius?: number;
  minimumOrder?: number;
  deliveryFee?: number;
  preparationTime?: number;
  isActive: boolean;
  isApproved: boolean;
  source: 'google_places' | 'mock' | 'database';
  externalId?: string;
}

export interface SearchFilters {
  query?: string;
  location?: Location;
  radius?: number;
  cuisineTypes?: string[];
  priceRange?: string[];
  minRating?: number;
  isOpen?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  restaurants: Restaurant[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IRestaurantProvider {
  /**
   * Search restaurants near a location
   */
  searchNearby(lat: number, lng: number, radius: number, filters?: SearchFilters): Promise<Restaurant[]>;

  /**
   * Search restaurants by query string
   */
  searchByQuery(query: string, location?: Location, filters?: SearchFilters): Promise<Restaurant[]>;

  /**
   * Get restaurant details by ID
   */
  getRestaurantDetails(id: string): Promise<Restaurant | null>;

  /**
   * Check if provider is available and healthy
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Common types shared across all providers in the MCP Adapter.
 */

export interface GeoLocation {
  lat: number;
  lng: number;
}

export type PriceRange = 1 | 2 | 3 | 4;

export type CurrencyCode = 'INR' | 'USD' | 'EUR';

export type ProviderName = 'swiggy' | 'zomato' | 'internal' | 'mock';

export type DataFreshness = 'live' | 'stale' | 'synthetic';

export type DataSource =
  | 'swiggy'
  | 'swiggy-session'
  | 'zomato-api'
  | 'zomato-session'
  | 'internal-db'
  | 'internal-api'
  | 'cache'
  | 'mock';

export interface OperatingHours {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
}

export interface TimeRange {
  open: string;
  close: string;
}

export interface OfferInfo {
  id: string;
  title: string;
  description: string;
  discountPercent: number;
  maxDiscount: number;
  minOrderValue: number;
  validUntil: string;
  code: string;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  servingSize: string;
}

export interface Customization {
  id: string;
  name: string;
  required: boolean;
  minSelection: number;
  maxSelection: number;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  isVegetarian: boolean;
}

export interface ResponseMetadata {
  source: DataSource;
  freshness: DataFreshness;
  cachedAt: string | null;
  nextRefreshAt: string | null;
  queryTimeMs: number;
  provider: ProviderName;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

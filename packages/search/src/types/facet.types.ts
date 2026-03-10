export type FacetType =
  | 'cuisine'
  | 'price_range'
  | 'rating'
  | 'dietary'
  | 'delivery_time'
  | 'distance';

export interface Facet {
  readonly type: FacetType;
  readonly label: string;
  readonly buckets: FacetBucket[];
}

export interface FacetBucket {
  readonly value: string;
  readonly label: string;
  readonly count: number;
  readonly selected: boolean;
}

export interface FacetConfig {
  readonly type: FacetType;
  readonly label: string;
  readonly enabled: boolean;
}

export interface FacetSelection {
  readonly type: FacetType;
  readonly values: string[];
}

export interface PriceRangeBucket {
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

export const DEFAULT_PRICE_RANGES: readonly PriceRangeBucket[] = [
  { min: 0, max: 100, label: 'Under 100' },
  { min: 100, max: 300, label: '100-300' },
  { min: 300, max: 500, label: '300-500' },
  { min: 500, max: 1000, label: '500-1000' },
  { min: 1000, max: Infinity, label: '1000+' },
] as const;

export const DEFAULT_RATING_BUCKETS: readonly string[] = [
  '4.5+',
  '4.0+',
  '3.5+',
  '3.0+',
] as const;

export const DEFAULT_DELIVERY_TIME_BUCKETS: readonly string[] = [
  'Under 15 min',
  '15-30 min',
  '30-45 min',
  '45-60 min',
  '60+ min',
] as const;

export const DEFAULT_DISTANCE_BUCKETS: readonly string[] = [
  'Under 1 km',
  '1-3 km',
  '3-5 km',
  '5-10 km',
  '10+ km',
] as const;

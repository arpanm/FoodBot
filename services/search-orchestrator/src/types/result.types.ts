/**
 * Result type definitions for aggregation, deduplication, and ranking.
 */

import type { UnifiedSearchResult, SearchFilters, GeoLocation } from './search.types';

export interface AggregatedResults {
  results: UnifiedSearchResult[];
  totalFromAllSources: number;
  deduplicatedCount: number;
  filteredCount: number;
}

export interface DeduplicationResult {
  unique: UnifiedSearchResult[];
  duplicateCount: number;
  mergedCount: number;
}

export interface ScoreComponents {
  relevanceScore: number;
  ratingBoost: number;
  proximityBoost: number;
  availabilityBoost: number;
  deliveryTimePenalty: number;
  userPreferenceBoost: number;
  popularityBoost: number;
  finalScore: number;
}

export interface ScoringConfig {
  weights: ScoringWeights;
  boosts: ScoringBoosts;
  penalties: ScoringPenalties;
}

export interface ScoringWeights {
  relevance: number;
  rating: number;
  proximity: number;
  availability: number;
  deliveryTime: number;
  userPreference: number;
  popularity: number;
}

export interface ScoringBoosts {
  availableNow: number;
  highRating: number;
  nearbyDistance: number;
  preferredCuisine: number;
}

export interface ScoringPenalties {
  longDeliveryTime: number;
  lowRating: number;
  farDistance: number;
}

export interface RankingContext {
  userLocation?: GeoLocation;
  userPreferences?: UserPreferences;
  filters?: SearchFilters;
}

export interface UserPreferences {
  preferredCuisines?: string[];
  pastOrderRestaurantIds?: string[];
  dietaryRestrictions?: string[];
  maxDeliveryTimePreference?: number;
}

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

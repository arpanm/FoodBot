/**
 * Cache key generator for search requests.
 * Produces deterministic, collision-free keys based on query parameters.
 */

import type { SearchRequest } from '../types/search.types';

/**
 * Generates a deterministic cache key for a search request.
 * Includes query, filters, sort, and pagination in the key.
 */
export function generateCacheKey(request: SearchRequest): string {
  const parts: string[] = ['search'];

  // Query
  parts.push(`q:${normalizeQuery(request.query)}`);

  // Strategy
  if (request.strategy) {
    parts.push(`s:${request.strategy}`);
  }

  // Filters
  if (request.filters) {
    const filterParts = serializeFilters(request.filters);
    if (filterParts) {
      parts.push(`f:${filterParts}`);
    }
  }

  // Sort
  if (request.sort) {
    parts.push(`sort:${request.sort.field}:${request.sort.order}`);
  }

  // Pagination
  parts.push(`p:${request.page}:${request.pageSize}`);

  return parts.join(':');
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, '_');
}

function serializeFilters(filters: NonNullable<SearchRequest['filters']>): string {
  const parts: string[] = [];

  if (filters.cuisines && filters.cuisines.length > 0) {
    parts.push(`c:${[...filters.cuisines].sort().join(',')}`);
  }

  if (filters.priceRange) {
    parts.push(`pr:${filters.priceRange.min ?? 0}-${filters.priceRange.max ?? 'inf'}`);
  }

  if (filters.minRating !== undefined) {
    parts.push(`r:${filters.minRating}`);
  }

  if (filters.maxDeliveryTime !== undefined) {
    parts.push(`dt:${filters.maxDeliveryTime}`);
  }

  if (filters.location) {
    // Round to 3 decimal places for cache key (about 100m precision)
    const lat = filters.location.lat.toFixed(3);
    const lon = filters.location.lon.toFixed(3);
    parts.push(`loc:${lat},${lon}`);
  }

  if (filters.radiusKm !== undefined) {
    parts.push(`rad:${filters.radiusKm}`);
  }

  if (filters.isAvailable !== undefined) {
    parts.push(`avail:${filters.isAvailable ? '1' : '0'}`);
  }

  if (filters.dietary && filters.dietary.length > 0) {
    parts.push(`diet:${[...filters.dietary].sort().join(',')}`);
  }

  if (filters.category) {
    parts.push(`cat:${filters.category.toLowerCase()}`);
  }

  return parts.join('|');
}

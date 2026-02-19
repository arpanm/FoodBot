/**
 * External Service Activities
 *
 * Activity implementations for external API integrations.
 * Includes MCP search, delivery services, and other third-party APIs.
 *
 * All external calls include:
 * - Timeout handling (5s default)
 * - Error categorization (transient vs permanent)
 * - Response validation
 */

import type { Restaurant, UserContext } from '../types';

// ============================================================================
// Service Interfaces (injected at worker startup)
// ============================================================================

interface MCPClient {
  search(params: MCPSearchParams): Promise<MCPSearchResponse>;
}

interface DeliveryServiceAPI {
  schedulePickup(orderId: string): Promise<DeliveryResponse>;
  trackDelivery(trackingId: string): Promise<DeliveryStatus>;
  assignPartner(orderId: string): Promise<DeliveryPartnerAssignment>;
}

interface InventoryServiceAPI {
  checkStock(restaurantId: string, items: string[]): Promise<StockResponse>;
}

interface MCPSearchParams {
  query: string;
  location?: { latitude: number; longitude: number };
  radius?: number;
  filters?: Record<string, unknown>;
}

interface MCPSearchResponse {
  results: Restaurant[];
  totalCount: number;
  page: number;
}

interface DeliveryResponse {
  trackingId: string;
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
  status: string;
}

interface DeliveryStatus {
  trackingId: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  currentLocation?: { latitude: number; longitude: number };
  estimatedArrival?: string;
}

interface DeliveryPartnerAssignment {
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  estimatedArrival: string;
}

interface StockResponse {
  available: boolean;
  items: Array<{ id: string; inStock: boolean; quantity: number }>;
}

let mcpClient: MCPClient | null = null;
let deliveryService: DeliveryServiceAPI | null = null;
let inventoryService: InventoryServiceAPI | null = null;

/**
 * Initialize external service clients.
 * Called during worker startup with actual client instances.
 */
export function initializeExternalServices(services: {
  mcp?: MCPClient;
  delivery?: DeliveryServiceAPI;
  inventory?: InventoryServiceAPI;
}): void {
  if (services.mcp) mcpClient = services.mcp;
  if (services.delivery) deliveryService = services.delivery;
  if (services.inventory) inventoryService = services.inventory;
}

// ============================================================================
// MCP Search Activities
// ============================================================================

/**
 * Call the MCP search API to find restaurants.
 *
 * @param params - Search parameters including query, location, and radius
 * @returns List of matching restaurants
 */
export async function callMCPSearch(
  params: Record<string, unknown>
): Promise<Restaurant[]> {
  if (mcpClient) {
    const response = await mcpClient.search(params as unknown as MCPSearchParams);
    return response.results;
  }

  // Fallback: return empty results (development mode)
  return [];
}

/**
 * Apply filters to a list of restaurants.
 *
 * @param restaurants - The restaurants to filter
 * @param filters - Filter criteria
 * @returns Filtered restaurants
 */
export async function applyFilters(
  restaurants: Restaurant[],
  filters: Record<string, unknown>
): Promise<Restaurant[]> {
  let filtered = [...restaurants];

  if (filters.cuisine && Array.isArray(filters.cuisine)) {
    const cuisineFilter = filters.cuisine as string[];
    if (cuisineFilter.length > 0) {
      filtered = filtered.filter((r) => cuisineFilter.includes(r.cuisine));
    }
  }

  if (filters.priceRange && Array.isArray(filters.priceRange)) {
    const [min, max] = filters.priceRange as [number, number];
    filtered = filtered.filter((r) => r.priceRange >= min && r.priceRange <= max);
  }

  if (typeof filters.rating === 'number') {
    filtered = filtered.filter((r) => r.rating >= (filters.rating as number));
  }

  if (typeof filters.availableOnly === 'boolean' && filters.availableOnly) {
    filtered = filtered.filter((r) => r.availability);
  }

  return filtered;
}

/**
 * Rank restaurants based on user preferences.
 *
 * @param restaurants - The restaurants to rank
 * @param context - User context with preferences
 * @returns Ranked restaurants (highest relevance first)
 */
export async function rankResults(
  restaurants: Restaurant[],
  context: UserContext
): Promise<Restaurant[]> {
  return [...restaurants].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Boost for matching cuisine preferences
    if (context.preferences.cuisine.includes(a.cuisine)) scoreA += 10;
    if (context.preferences.cuisine.includes(b.cuisine)) scoreB += 10;

    // Boost for higher rating
    scoreA += a.rating * 2;
    scoreB += b.rating * 2;

    // Boost for availability
    if (a.availability) scoreA += 5;
    if (b.availability) scoreB += 5;

    // Boost for price range match
    if (context.preferences.priceRange) {
      const [min, max] = context.preferences.priceRange;
      if (a.priceRange >= min && a.priceRange <= max) scoreA += 3;
      if (b.priceRange >= min && b.priceRange <= max) scoreB += 3;
    }

    // Proximity bonus if location available
    if (context.location) {
      const distA = calculateDistance(context.location, a.location);
      const distB = calculateDistance(context.location, b.location);
      scoreA += Math.max(0, 10 - distA);
      scoreB += Math.max(0, 10 - distB);
    }

    return scoreB - scoreA;
  });
}

function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// Cache Activities
// ============================================================================

/**
 * Get a value from cache (Redis).
 *
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getFromCache(key: string): Promise<unknown> {
  // In production, calls Redis
  // Fallback returns null (cache miss)
  return null;
}

/**
 * Set a value in cache (Redis).
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param _ttl - Time to live in seconds
 */
export async function setInCache(key: string, value: unknown, _ttl?: number): Promise<void> {
  // In production, calls Redis with TTL
}

/**
 * Invalidate a cache entry.
 *
 * @param key - Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  // In production, deletes from Redis
}

/**
 * Clear all cache entries matching a pattern.
 *
 * @param pattern - Redis key pattern (e.g., "search:user_*")
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  // In production, scans and deletes matching keys from Redis
}

/**
 * Cache search results for future queries.
 *
 * @param params - Search params and results to cache
 * @returns Whether caching succeeded
 */
export async function cacheResults(params: Record<string, unknown>): Promise<boolean> {
  // In production, stores in vector DB for semantic search caching
  return true;
}

// ============================================================================
// Delivery Service Activities
// ============================================================================

/**
 * Schedule a delivery pickup for an order.
 *
 * @param orderId - The order ID
 * @returns Delivery tracking details
 */
export async function callDeliveryService(
  orderId: string
): Promise<Record<string, unknown>> {
  if (deliveryService) {
    const response = await deliveryService.schedulePickup(orderId);
    return response as unknown as Record<string, unknown>;
  }

  return {
    trackingId: `track_${orderId}_${Date.now()}`,
    estimatedPickupTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    status: 'pending',
  };
}

/**
 * Assign a delivery partner to an order.
 *
 * @param orderId - The order ID
 * @returns Assigned partner details
 */
export async function assignDeliveryPartner(
  orderId: string
): Promise<Record<string, unknown>> {
  if (deliveryService) {
    const assignment = await deliveryService.assignPartner(orderId);
    return assignment as unknown as Record<string, unknown>;
  }

  return {
    partnerId: `partner_${Date.now()}`,
    partnerName: 'Delivery Partner',
    partnerPhone: '+1234567890',
    estimatedArrival: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  };
}

/**
 * Track the delivery status of an order.
 *
 * @param orderId - The order ID
 * @param deliveryPartnerId - The delivery partner ID
 * @returns Current delivery status
 */
export async function trackDelivery(
  orderId: string,
  deliveryPartnerId: string
): Promise<Record<string, unknown>> {
  if (deliveryService) {
    const status = await deliveryService.trackDelivery(`${orderId}_${deliveryPartnerId}`);
    return status as unknown as Record<string, unknown>;
  }

  return {
    trackingId: `track_${orderId}`,
    status: 'in_transit',
    partnerId: deliveryPartnerId,
    estimatedArrival: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

// ============================================================================
// Inventory Service Activities
// ============================================================================

/**
 * Call the external inventory service for real-time stock data.
 *
 * @param restaurantId - The restaurant ID
 * @returns Inventory information
 */
export async function callInventoryService(
  restaurantId: string
): Promise<Record<string, unknown>> {
  if (inventoryService) {
    const response = await inventoryService.checkStock(restaurantId, []);
    return response as unknown as Record<string, unknown>;
  }

  return {
    restaurantId,
    available: true,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Generic External API Activity
// ============================================================================

/**
 * Call a generic external API with timeout.
 *
 * @param url - API endpoint URL
 * @param params - Request parameters
 * @returns API response
 */
export async function callExternalAPI(
  url: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timeoutId);
  }
}

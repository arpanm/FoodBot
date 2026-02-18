/**
 * Search Restaurant Workflow
 *
 * Implements FR-LLM-INTENT-001: Intent detection and restaurant search workflow
 *
 * Features:
 * - Load user context from cache/Neo4j
 * - Check cache for previous search results
 * - Call MCP search API with retry logic
 * - Apply filters based on user preferences
 * - Rank results by user preferences
 * - Cache results for future queries
 *
 * Retry Policy:
 * - Initial interval: 1s
 * - Backoff coefficient: 2
 * - Maximum interval: 30s
 * - Maximum attempts: 3
 */

import { proxyActivities, log } from '@temporalio/workflow';

// Import activity interfaces
interface UserContext {
  userId: string;
  preferences: {
    cuisine: string[];
    priceRange?: [number, number];
    dietaryRestrictions?: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  orderHistory?: string[];
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: number;
  location: {
    latitude: number;
    longitude: number;
  };
  availability: boolean;
}

interface SearchRestaurantInput {
  userId: string;
  query: string;
  filters?: {
    cuisine?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: { latitude: number; longitude: number };
    radius?: number;
  };
}

// Define activity interface
interface Activities {
  loadUserContext(userId: string): Promise<UserContext>;
  getFromCache(key: string): Promise<any>;
  callMCPSearch(params: any): Promise<Restaurant[]>;
  applyFilters(restaurants: Restaurant[], filters: any): Promise<Restaurant[]>;
  rankResults(restaurants: Restaurant[], context: UserContext): Promise<Restaurant[]>;
  setInCache(key: string, value: any, ttl?: number): Promise<void>;
  cacheResults(params: any): Promise<boolean>;
}

// Configure activity proxy with retry policy
const {
  loadUserContext,
  getFromCache,
  callMCPSearch,
  applyFilters,
  rankResults,
  setInCache,
  cacheResults,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

/**
 * Search Restaurant Workflow
 *
 * Orchestrates the restaurant search process with caching and personalization
 */
export async function searchRestaurantWorkflow(
  input: SearchRestaurantInput
): Promise<Restaurant[]> {
  log.info('Starting restaurant search workflow', { input });

  try {
    // Step 1: Load user context
    log.info('Loading user context', { userId: input.userId });
    const userContext = await loadUserContext(input.userId);
    log.info('User context loaded', { userContext });

    // Step 2: Check cache for previous results
    const cacheKey = `search:${input.userId}:${input.query}:${JSON.stringify(input.filters || {})}`;
    log.info('Checking cache', { cacheKey });
    const cachedResults = await getFromCache(cacheKey);

    if (cachedResults) {
      log.info('Cache hit - returning cached results', { count: cachedResults.length });
      return cachedResults;
    }

    log.info('Cache miss - calling MCP search API');

    // Step 3: Call MCP search API (with automatic retry on failure)
    const searchParams = {
      query: input.query,
      location: input.filters?.location || userContext.location,
      radius: input.filters?.radius || 5000, // 5km default
    };

    let results: Restaurant[];
    try {
      results = await callMCPSearch(searchParams);
      log.info('MCP search completed', { count: results.length });
    } catch (error) {
      log.error('MCP search failed after retries', { error });
      throw error;
    }

    // Handle empty results
    if (!results || results.length === 0) {
      log.info('No results found');
      return [];
    }

    // Step 4: Apply filters
    const filters = input.filters || {};
    log.info('Applying filters', { filters });
    const filteredResults = await applyFilters(results, filters);
    log.info('Filters applied', { count: filteredResults.length });

    // Step 5: Rank results by user preferences
    log.info('Ranking results by user preferences');
    const rankedResults = await rankResults(filteredResults, userContext);
    log.info('Results ranked', { count: rankedResults.length });

    // Step 6: Cache results for future queries
    log.info('Caching results', { cacheKey });
    await setInCache(cacheKey, rankedResults, 1800); // Cache for 30 minutes
    await cacheResults({
      userId: input.userId,
      query: input.query,
      results: rankedResults,
    });

    log.info('Search workflow completed successfully', {
      resultCount: rankedResults.length,
    });

    return rankedResults;
  } catch (error) {
    log.error('Search workflow failed', { error });
    throw error;
  }
}

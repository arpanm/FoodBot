# MCP Module - Quick Start Guide

This guide will help you get started with the MCP (Multi-Channel Provider) module in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Redis running (optional, falls back to in-memory cache)
- Google Places API key (optional, mock provider works without it)

## Step 1: Install Dependencies

Dependencies are already included in the main project. No additional installation needed.

## Step 2: Configure Environment

Add to your `.env` file:

```bash
# Enable Mock Provider (works without API key)
GOOGLE_PLACES_ENABLED=false
PROVIDER_STRATEGY=fallback

# Optional: Enable Google Places API
# GOOGLE_PLACES_ENABLED=true
# GOOGLE_PLACES_API_KEY=your-api-key-here

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## Step 3: Basic Usage

### Search Restaurants Near Location

```typescript
import { ProviderOrchestratorService } from '@/mcp';

@Injectable()
export class YourService {
  constructor(
    private readonly providerOrchestrator: ProviderOrchestratorService,
  ) {}

  async findRestaurants() {
    // Search restaurants within 5km of San Francisco
    const restaurants = await this.providerOrchestrator.searchNearby(
      37.7749,  // latitude
      -122.4194, // longitude
      5000      // radius in meters
    );

    console.log(`Found ${restaurants.length} restaurants`);
    return restaurants;
  }
}
```

### Search by Text Query

```typescript
async searchPizza() {
  const restaurants = await this.providerOrchestrator.searchByQuery(
    'pizza',
    { lat: 37.7749, lng: -122.4194 }, // optional location
    { radius: 10000 } // optional: 10km radius
  );

  return restaurants;
}
```

### Get Restaurant Details

```typescript
async getDetails(restaurantId: string) {
  const restaurant = await this.providerOrchestrator.getRestaurantDetails(restaurantId);

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  return restaurant;
}
```

### Apply Filters

```typescript
async findHighRatedItalian() {
  const restaurants = await this.providerOrchestrator.searchNearby(
    37.7749,
    -122.4194,
    10000,
    {
      minRating: 4.5,
      cuisineTypes: ['Italian'],
      priceRange: ['moderate', 'premium'],
    }
  );

  return restaurants;
}
```

## Step 4: Enable Google Places (Optional)

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Places API in your project
3. Update `.env`:

```bash
GOOGLE_PLACES_ENABLED=true
GOOGLE_PLACES_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

4. Restart your application

## Step 5: Test It

Run the integration tests:

```bash
npm test -- src/mcp/providers/__tests__/google-places.integration.spec.ts
```

Or test via REST API:

```bash
# Search nearby restaurants
curl "http://localhost:3000/api/restaurants/search?lat=37.7749&lng=-122.4194&radius=5000"

# Search by query
curl "http://localhost:3000/api/restaurants/search?query=pizza"

# Get details
curl "http://localhost:3000/api/restaurants/mock-1"
```

## Common Use Cases

### Use Case 1: Restaurant Discovery

```typescript
@Get('/nearby')
async findNearbyRestaurants(
  @Query('lat') lat: number,
  @Query('lng') lng: number,
  @Query('radius') radius: number = 5000,
) {
  return this.providerOrchestrator.searchNearby(lat, lng, radius);
}
```

### Use Case 2: Search with Autocomplete

```typescript
@Get('/search')
async searchRestaurants(
  @Query('q') query: string,
  @Query('lat') lat?: number,
  @Query('lng') lng?: number,
) {
  const location = lat && lng ? { lat, lng } : undefined;
  return this.providerOrchestrator.searchByQuery(query, location);
}
```

### Use Case 3: Restaurant Profile

```typescript
@Get('/:id')
async getRestaurant(@Param('id') id: string) {
  const restaurant = await this.providerOrchestrator.getRestaurantDetails(id);

  if (!restaurant) {
    throw new NotFoundException(`Restaurant ${id} not found`);
  }

  return restaurant;
}
```

### Use Case 4: Advanced Filtering

```typescript
@Get('/filter')
async filterRestaurants(
  @Query('lat') lat: number,
  @Query('lng') lng: number,
  @Query('cuisine') cuisineTypes?: string[],
  @Query('minRating') minRating?: number,
  @Query('priceRange') priceRange?: string[],
) {
  return this.providerOrchestrator.searchNearby(lat, lng, 10000, {
    cuisineTypes,
    minRating,
    priceRange,
  });
}
```

## Provider Strategies

### Fallback (Default)
Try Google Places first, fallback to Mock if it fails:

```bash
PROVIDER_STRATEGY=fallback
```

### Primary Only
Use only Google Places (or Mock if Google is disabled):

```bash
PROVIDER_STRATEGY=primary
```

### All Providers
Query both and merge results:

```bash
PROVIDER_STRATEGY=all
```

### Fastest
Race providers and return first result:

```bash
PROVIDER_STRATEGY=fastest
```

## Monitoring

### Check Provider Health

```typescript
const isHealthy = await this.providerOrchestrator.healthCheck();
console.log(`Providers healthy: ${isHealthy}`);
```

### Get Provider Stats

```typescript
const stats = this.providerOrchestrator.getProviderStats();
console.log('Provider stats:', stats);
// Output: { google_places: { enabled: false }, mock: { enabled: true } }
```

### Get Enabled Providers

```typescript
const providers = this.providerOrchestrator.getEnabledProviders();
console.log('Enabled providers:', providers);
// Output: ['mock']
```

## Error Handling

```typescript
import {
  GooglePlacesRateLimitError,
  GooglePlacesTimeoutError,
  GooglePlacesNetworkError,
} from '@/mcp';

try {
  const restaurants = await this.providerOrchestrator.searchNearby(lat, lng, radius);
  return restaurants;
} catch (error) {
  if (error instanceof GooglePlacesRateLimitError) {
    return { error: 'Rate limit exceeded. Please try again later.' };
  }

  if (error instanceof GooglePlacesTimeoutError) {
    return { error: 'Request timeout. Please try again.' };
  }

  if (error instanceof GooglePlacesNetworkError) {
    return { error: 'Network error. Please check your connection.' };
  }

  throw error;
}
```

## Performance Tips

1. **Enable Caching**: Use Redis for better performance
2. **Use Appropriate Radius**: Smaller radius = faster response
3. **Set Rate Limits**: Prevent API quota exhaustion
4. **Monitor Cache Hit Rate**: Optimize TTL values
5. **Use Fallback Strategy**: Balance reliability and cost

## Troubleshooting

### Problem: No results returned

**Solution**: Check if providers are enabled and healthy

```typescript
const health = await this.providerOrchestrator.healthCheck();
const stats = this.providerOrchestrator.getProviderStats();
console.log({ health, stats });
```

### Problem: Google Places not working

**Solution**: Verify configuration

```bash
# Check .env file
GOOGLE_PLACES_ENABLED=true
GOOGLE_PLACES_API_KEY=your-key

# Verify API key in Google Cloud Console
# Make sure Places API is enabled
# Check billing is enabled
```

### Problem: Slow responses

**Solution**: Enable Redis caching

```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Update .env
REDIS_URL=redis://localhost:6379
```

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore the [test files](./__tests__/) for more examples
- Check the [interfaces](./interfaces/) for data structures
- Review [error types](./providers/google-places/google-places.errors.ts)

## Support

For issues or questions:
- Check existing tests for examples
- Review the comprehensive README
- Create an issue in the repository

## Summary

You now have:
- Working MCP module with mock data
- Optional Google Places integration
- Caching and rate limiting
- Error handling
- Multiple search methods
- Health monitoring

Start experimenting with the examples above and customize as needed!

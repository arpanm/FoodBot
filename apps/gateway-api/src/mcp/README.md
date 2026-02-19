# MCP (Multi-Channel Provider) Module

The MCP module provides a unified interface for integrating multiple restaurant data providers into the FoodBot application. It supports fallback strategies, caching, and rate limiting.

## Features

- **Multiple Provider Support**: Google Places API, Mock Provider (extensible)
- **Intelligent Fallback**: Automatic failover to backup providers
- **Caching**: Redis-based caching with configurable TTL
- **Rate Limiting**: Built-in rate limiting to prevent API quota exhaustion
- **Error Handling**: Comprehensive error handling with specific error types
- **Health Checks**: Monitor provider availability
- **Strategy Patterns**: Support for different provider execution strategies

## Architecture

```
┌─────────────────────────────────────────┐
│      Restaurant Service                 │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│   Provider Orchestrator Service         │
│   - Strategy selection                  │
│   - Provider coordination               │
│   - Result merging & deduplication      │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│   Google     │  │    Mock      │
│   Places     │  │   Provider   │
│   Provider   │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
   [Cache Layer (Redis)]
```

## Providers

### 1. Google Places Provider

Integrates with Google Places API to fetch real restaurant data.

**Features:**
- Nearby search by coordinates and radius
- Text search by query string
- Restaurant details by Place ID
- Photo URL generation
- Operating hours parsing
- Address component extraction

**Configuration:**
```bash
GOOGLE_PLACES_ENABLED=true
GOOGLE_PLACES_API_KEY=your-api-key-here
```

**Rate Limits:**
- 100 requests per minute (configurable)
- Automatic rate limiting with queue

**Caching:**
- Search results: 1 hour TTL
- Restaurant details: 2 hours TTL

### 2. Mock Provider

Provides mock data for testing and fallback scenarios.

**Features:**
- Pre-defined restaurant data
- Distance-based filtering
- Cuisine and price range filtering
- Always available (no API keys required)

## Provider Strategies

The orchestrator supports multiple execution strategies:

### 1. FALLBACK (Default)
Try providers in priority order until one succeeds.

```typescript
PROVIDER_STRATEGY=fallback
```

**Use Case:** Reliable service with backup options

### 2. PRIMARY
Use only the primary (highest priority) provider.

```typescript
PROVIDER_STRATEGY=primary
```

**Use Case:** Cost optimization, single source of truth

### 3. ALL
Query all providers and merge results.

```typescript
PROVIDER_STRATEGY=all
```

**Use Case:** Comprehensive results, data aggregation

### 4. FASTEST
Race all providers and return first result.

```typescript
PROVIDER_STRATEGY=fastest
```

**Use Case:** Performance optimization, low latency

## Usage

### Basic Search

```typescript
import { ProviderOrchestratorService } from './mcp/providers/provider-orchestrator.service';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly providerOrchestrator: ProviderOrchestratorService,
  ) {}

  async searchRestaurants(lat: number, lng: number, radius: number) {
    return this.providerOrchestrator.searchNearby(lat, lng, radius);
  }
}
```

### Search with Filters

```typescript
const results = await providerOrchestrator.searchNearby(
  37.7749,
  -122.4194,
  5000,
  {
    minRating: 4.0,
    cuisineTypes: ['Italian', 'Pizza'],
    priceRange: ['moderate', 'premium'],
  }
);
```

### Text Search

```typescript
const results = await providerOrchestrator.searchByQuery(
  'pizza near me',
  { lat: 37.7749, lng: -122.4194 },
  { radius: 10000 }
);
```

### Get Restaurant Details

```typescript
const restaurant = await providerOrchestrator.getRestaurantDetails('gp_ChIJ123');
```

## Data Model

### Restaurant Interface

```typescript
interface Restaurant {
  id: string;                    // Internal ID (gp_xxx for Google Places)
  externalId?: string;           // Provider's original ID
  name: string;                  // Restaurant name
  description: string;           // Description
  address: Address;              // Structured address
  location: Location;            // Coordinates
  phoneNumber: string;           // Phone number
  email: string;                 // Email (if available)
  rating: number;                // Rating (0-5)
  reviewCount: number;           // Number of reviews
  priceRange: string;            // 'budget' | 'moderate' | 'premium'
  cuisineTypes: string[];        // Cuisine types
  images: string[];              // Photo references/URLs
  operatingHours?: OperatingHours; // Business hours
  deliveryRadius?: number;       // Delivery radius in km
  minimumOrder?: number;         // Minimum order amount
  deliveryFee?: number;          // Delivery fee
  preparationTime?: number;      // Average preparation time (minutes)
  isActive: boolean;             // Active status
  isApproved: boolean;           // Approval status
  source: 'google_places' | 'mock' | 'database';
}
```

## Error Handling

The module provides specific error types for different failure scenarios:

```typescript
GooglePlacesApiKeyError      // API key missing/invalid
GooglePlacesTimeoutError     // Request timeout
GooglePlacesNetworkError     // Network failure
GooglePlacesRateLimitError   // Rate limit exceeded
GooglePlacesInvalidRequestError // Invalid parameters
GooglePlacesZeroResultsError // No results found
GooglePlacesUnexpectedError  // Unknown error
```

### Error Handling Example

```typescript
try {
  const results = await providerOrchestrator.searchNearby(lat, lng, radius);
} catch (error) {
  if (error instanceof GooglePlacesRateLimitError) {
    // Handle rate limiting
    await waitAndRetry();
  } else if (error instanceof GooglePlacesTimeoutError) {
    // Handle timeout
    return fallbackResults;
  } else {
    // Handle other errors
    throw error;
  }
}
```

## Caching Strategy

The module implements a multi-level caching strategy:

1. **Redis Cache** (Primary)
   - Fast in-memory storage
   - Distributed across instances
   - Configurable TTL per operation type

2. **Cache Keys Format**
   ```
   google_places:nearby:{lat}:{lng}:{radius}:{filters}
   google_places:query:{query}:{location}:{filters}
   google_places:details:{placeId}
   ```

3. **Cache Invalidation**
   - Automatic expiration based on TTL
   - Manual invalidation on data updates

## Testing

### Run Unit Tests

```bash
npm test -- src/mcp/providers/__tests__/google-places.provider.spec.ts
npm test -- src/mcp/providers/__tests__/google-places.mapper.spec.ts
npm test -- src/mcp/providers/__tests__/provider-orchestrator.service.spec.ts
```

### Run Integration Tests

```bash
npm test -- src/mcp/providers/__tests__/google-places.integration.spec.ts
```

### Test Coverage

The module maintains >80% test coverage across:
- Provider implementations
- Data mapping
- Orchestration logic
- Error handling
- Caching

## Configuration Reference

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GOOGLE_PLACES_ENABLED` | boolean | false | Enable Google Places provider |
| `GOOGLE_PLACES_API_KEY` | string | - | Google Places API key |
| `PROVIDER_STRATEGY` | string | fallback | Provider execution strategy |
| `REDIS_URL` | string | redis://localhost:6379 | Redis connection URL |

### Provider Priority

Providers are prioritized as follows (lower number = higher priority):

1. Google Places (priority: 1)
2. Mock Provider (priority: 10)

## Performance Considerations

### API Quotas

Google Places API has the following quotas:
- Free tier: $200 credit/month (~40,000 requests)
- Nearby Search: $0.032 per request
- Text Search: $0.032 per request
- Place Details: $0.017 per request

**Recommendations:**
- Enable caching to reduce API calls
- Use appropriate cache TTL values
- Implement rate limiting
- Monitor API usage

### Optimization Tips

1. **Cache aggressively**: Use longer TTL for stable data
2. **Use radius wisely**: Smaller radius = fewer results = faster response
3. **Implement pagination**: Don't fetch all results at once
4. **Use FALLBACK strategy**: Balance cost and availability
5. **Monitor performance**: Track response times and cache hit rates

## Monitoring

### Health Check Endpoint

```typescript
const isHealthy = await providerOrchestrator.healthCheck();
```

### Provider Statistics

```typescript
const stats = providerOrchestrator.getProviderStats();
// Returns: { google_places: { enabled: true }, mock: { enabled: true } }
```

### Enabled Providers

```typescript
const providers = providerOrchestrator.getEnabledProviders();
// Returns: ['google_places', 'mock']
```

## Adding New Providers

To add a new provider:

1. **Implement IRestaurantProvider interface**

```typescript
@Injectable()
export class NewProvider implements IRestaurantProvider {
  async searchNearby(lat: number, lng: number, radius: number): Promise<Restaurant[]> {
    // Implementation
  }

  async searchByQuery(query: string, location?: Location): Promise<Restaurant[]> {
    // Implementation
  }

  async getRestaurantDetails(id: string): Promise<Restaurant | null> {
    // Implementation
  }

  async healthCheck(): Promise<boolean> {
    // Implementation
  }
}
```

2. **Register in ProviderOrchestratorService**

```typescript
this.providers = [
  { provider: this.googlePlacesProvider, name: 'google_places', enabled: true },
  { provider: this.newProvider, name: 'new_provider', enabled: true },
  { provider: this.mockProvider, name: 'mock', enabled: true },
];
```

3. **Add configuration**

```typescript
// .env
NEW_PROVIDER_ENABLED=true
NEW_PROVIDER_API_KEY=your-key
```

4. **Write tests**

```typescript
describe('NewProvider', () => {
  it('should search restaurants', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Google Places API not working

1. Check API key is set: `GOOGLE_PLACES_API_KEY`
2. Verify API is enabled: `GOOGLE_PLACES_ENABLED=true`
3. Check API key permissions in Google Cloud Console
4. Verify billing is enabled
5. Check rate limits and quotas

### No results returned

1. Check provider health: `providerOrchestrator.healthCheck()`
2. Verify search parameters (coordinates, radius)
3. Check cache expiration
4. Review provider logs for errors

### Slow performance

1. Verify Redis is running and accessible
2. Check cache hit rates
3. Reduce search radius
4. Use FASTEST strategy
5. Enable only necessary providers

## Security Considerations

1. **API Key Protection**
   - Store keys in environment variables
   - Never commit keys to version control
   - Rotate keys regularly
   - Use different keys per environment

2. **Rate Limiting**
   - Implement client-side rate limiting
   - Monitor API usage
   - Set up alerts for quota warnings

3. **Input Validation**
   - Validate coordinates and parameters
   - Sanitize user input
   - Prevent injection attacks

## License

This module is part of the FoodBot application.

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check existing documentation

## Changelog

### Version 1.0.0 (2024-02-19)
- Initial implementation
- Google Places API integration
- Mock provider for testing
- Provider orchestrator with fallback strategies
- Comprehensive caching
- Rate limiting
- Unit and integration tests
- Documentation

/**
 * MCP (Multi-Channel Provider) Module
 * Central export point for all MCP-related functionality
 */

// Module
export { McpModule } from './mcp.module';

// Providers
export { GooglePlacesProvider } from './providers/google-places/google-places.provider';
export { GooglePlacesMapper } from './providers/google-places/google-places.mapper';
export { MockRestaurantProvider } from './providers/mock/mock.provider';
export { ProviderOrchestratorService } from './providers/provider-orchestrator.service';

// Interfaces
export type {
  IRestaurantProvider,
  Restaurant,
  Location,
  Address,
  OperatingHours,
  DayHours,
  SearchFilters,
  SearchResult,
} from './interfaces/restaurant-provider.interface';

export type {
  GooglePlace,
  GooglePlaceDetails,
  GooglePlacesSearchResponse,
  GooglePlaceDetailsResponse,
  GooglePlaceGeometry,
  GooglePlaceOpeningHours,
  GooglePlacePhoto,
} from './interfaces/google-places.types';

export { GooglePlacesStatus } from './interfaces/google-places.types';

// Errors
export {
  GooglePlacesError,
  GooglePlacesApiKeyError,
  GooglePlacesTimeoutError,
  GooglePlacesNetworkError,
  GooglePlacesRateLimitError,
  GooglePlacesInvalidRequestError,
  GooglePlacesZeroResultsError,
  GooglePlacesUnexpectedError,
} from './providers/google-places/google-places.errors';

// Configuration
export type { ProviderConfig, ProvidersConfig } from './config/providers.config';
export { ProviderStrategy, DEFAULT_PROVIDERS_CONFIG, DEFAULT_PROVIDER_STRATEGY } from './config/providers.config';

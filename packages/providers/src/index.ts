// Types
export type {
  ProviderName,
  ProviderConfig,
  ProviderRestaurant,
  ProviderMenuItem,
  ProviderOrder,
  ProviderStatus,
  OrderStatus,
  OrderItem,
  DeliveryDetails,
  CancelResult,
  Location,
  AggregatedResults,
  AggregatedRestaurant,
  InternalOrder,
  CircuitBreakerConfig,
  RateLimiterConfig,
} from './types/provider.types.js';

export type { IFoodProvider } from './types/provider-interface.js';

// Providers
export { SwiggyProvider, SwiggyProviderError } from './swiggy/swiggy-provider.js';
export { ZomatoProvider, ZomatoProviderError } from './zomato/zomato-provider.js';
export { OndcProvider, OndcProviderError } from './ondc/ondc-provider.js';

// Manager
export { ProviderManager, ProviderManagerError } from './manager/provider-manager.js';
export { CircuitBreaker, CircuitBreakerOpenError } from './manager/circuit-breaker.js';
export type { CircuitState } from './manager/circuit-breaker.js';
export { RateLimiter, RateLimitExceededError } from './manager/rate-limiter.js';

// Mapping
export {
  mapSwiggyRestaurant,
  mapZomatoRestaurant,
  mapOndcCatalog,
  mapToInternalOrder,
} from './mapping/response-mapper.js';

export type {
  SwiggyRawRestaurant,
  ZomatoRawRestaurant,
  OndcCatalogItem,
} from './mapping/response-mapper.js';

// Mock Data
export { SWIGGY_RESTAURANTS, ZOMATO_RESTAURANTS, ONDC_RESTAURANTS } from './mock/mock-restaurants.js';
export { SWIGGY_MENUS, ZOMATO_MENUS, ONDC_MENUS } from './mock/mock-menus.js';
export type { MenuCollection } from './mock/mock-menus.js';

/**
 * Swiggy provider configuration.
 */

export interface SwiggyConfig {
  enabled: boolean;
  baseUrl: string;
  searchEndpoint: string;
  menuEndpoint: string;
  dishSearchEndpoint: string;
  timeoutMs: number;
  rateLimitPerMinute: number;
  cacheTTLMs: {
    search: number;
    restaurant: number;
    menu: number;
    availability: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    failureWindowMs: number;
    openDurationMs: number;
    successThreshold: number;
  };
  retry: {
    maxRetries: number;
    initialDelayMs: number;
    backoffMultiplier: number;
    maxDelayMs: number;
  };
  imageBaseUrl: string;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) {
    return defaultValue;
  }
  return val.toLowerCase() === 'true' || val === '1';
}

export function loadSwiggyConfig(): SwiggyConfig {
  return {
    enabled: getEnvBool('MCP_SWIGGY_ENABLED', false),
    baseUrl: getEnv('SWIGGY_BASE_URL', 'https://www.swiggy.com'),
    searchEndpoint: '/dapi/restaurants/list/v5',
    menuEndpoint: '/dapi/menu/pl',
    dishSearchEndpoint: '/dapi/restaurants/search/v3',
    timeoutMs: 5000,
    rateLimitPerMinute: 30,
    cacheTTLMs: {
      search: 5 * 60 * 1000,
      restaurant: 15 * 60 * 1000,
      menu: 10 * 60 * 1000,
      availability: 1 * 60 * 1000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      failureWindowMs: 60_000,
      openDurationMs: 30_000,
      successThreshold: 3,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 500,
      backoffMultiplier: 2.0,
      maxDelayMs: 5_000,
    },
    imageBaseUrl: 'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/',
  };
}

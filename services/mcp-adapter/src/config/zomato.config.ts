/**
 * Zomato provider configuration.
 */

export interface ZomatoConfig {
  enabled: boolean;
  legacyApiBaseUrl: string;
  internalApiBaseUrl: string;
  apiKey: string;
  dailyApiKeyLimit: number;
  timeoutMs: number;
  rateLimitPerMinute: number;
  cacheTTLMs: {
    search: number;
    restaurant: number;
    menu: number;
    availability: number;
    reviews: number;
    collections: number;
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
  oauth: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) {
    return defaultValue;
  }
  return val.toLowerCase() === 'true' || val === '1';
}

export function loadZomatoConfig(): ZomatoConfig {
  return {
    enabled: getEnvBool('MCP_ZOMATO_ENABLED', false),
    legacyApiBaseUrl: getEnv(
      'ZOMATO_LEGACY_API_URL',
      'https://developers.zomato.com/api/v2.1'
    ),
    internalApiBaseUrl: getEnv(
      'ZOMATO_INTERNAL_API_URL',
      'https://www.zomato.com/webroutes'
    ),
    apiKey: getEnv('ZOMATO_API_KEY', ''),
    dailyApiKeyLimit: getEnvNumber('ZOMATO_DAILY_LIMIT', 1000),
    timeoutMs: 5000,
    rateLimitPerMinute: 30,
    cacheTTLMs: {
      search: 10 * 60 * 1000,
      restaurant: 15 * 60 * 1000,
      menu: 10 * 60 * 1000,
      availability: 1 * 60 * 1000,
      reviews: 30 * 60 * 1000,
      collections: 60 * 60 * 1000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      failureWindowMs: 60_000,
      openDurationMs: 30_000,
      successThreshold: 3,
    },
    retry: {
      maxRetries: 2,
      initialDelayMs: 1000,
      backoffMultiplier: 2.0,
      maxDelayMs: 5_000,
    },
    oauth: {
      clientId: getEnv('ZOMATO_OAUTH_CLIENT_ID', ''),
      clientSecret: getEnv('ZOMATO_OAUTH_CLIENT_SECRET', ''),
      redirectUri: getEnv(
        'ZOMATO_OAUTH_REDIRECT_URI',
        'http://localhost:3100/auth/zomato/callback'
      ),
      authorizationUrl: 'https://www.zomato.com/oauth/authorize',
      tokenUrl: 'https://www.zomato.com/oauth/token',
      scopes: ['read', 'write'],
    },
  };
}

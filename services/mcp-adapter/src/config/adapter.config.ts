/**
 * Central configuration for the MCP Adapter service.
 */

import type { ProviderName } from '../types/common.types.js';

export interface AdapterConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
  providers: ProviderName[];
  providerPriority: ProviderName[];
  redis: RedisConfig;
  encryption: EncryptionConfig;
  logging: LoggingConfig;
  metrics: MetricsConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
}

export interface EncryptionConfig {
  tokenEncryptionKey: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
}

export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
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

export function loadConfig(): AdapterConfig {
  const enabledProviders: ProviderName[] = [];
  if (getEnvBool('MCP_SWIGGY_ENABLED', false)) {
    enabledProviders.push('swiggy');
  }
  if (getEnvBool('MCP_ZOMATO_ENABLED', false)) {
    enabledProviders.push('zomato');
  }
  if (getEnvBool('MCP_INTERNAL_ENABLED', true)) {
    enabledProviders.push('internal');
  }
  if (getEnvBool('MCP_MOCK_ENABLED', true)) {
    enabledProviders.push('mock');
  }

  return {
    port: getEnvNumber('MCP_ADAPTER_PORT', 3100),
    host: getEnv('MCP_ADAPTER_HOST', '0.0.0.0'),
    environment: getEnv('NODE_ENV', 'development') as AdapterConfig['environment'],
    providers: enabledProviders,
    providerPriority: ['internal', 'swiggy', 'zomato', 'mock'],
    redis: {
      host: getEnv('REDIS_HOST', 'localhost'),
      port: getEnvNumber('REDIS_PORT', 6379),
      password: getEnv('REDIS_PASSWORD', ''),
      db: getEnvNumber('REDIS_DB', 0),
      keyPrefix: 'mcp-adapter:',
    },
    encryption: {
      tokenEncryptionKey: getEnv('TOKEN_ENCRYPTION_KEY', 'dev-key-change-in-production'),
    },
    logging: {
      level: getEnv('LOG_LEVEL', 'info') as LoggingConfig['level'],
      format: getEnv('LOG_FORMAT', 'json') as LoggingConfig['format'],
    },
    metrics: {
      enabled: getEnvBool('METRICS_ENABLED', true),
      prefix: 'mcp_adapter_',
    },
  };
}

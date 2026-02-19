/**
 * Data source configuration.
 * Defines per-source timeouts, connection settings, and circuit breaker parameters.
 */

import type { SourceConfig, SourceName } from '../types/source.types';

export interface ElasticsearchConfig {
  node: string;
  index: string;
  auth?: {
    username: string;
    password: string;
  };
  maxRetries: number;
  requestTimeoutMs: number;
}

export interface McpAdapterConfig {
  baseUrl: string;
  apiKey?: string;
  requestTimeoutMs: number;
  maxRetries: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  maxPoolSize: number;
  connectionTimeoutMs: number;
}

export interface AllSourceConfigs {
  elasticsearch: SourceConfig;
  mcpAdapter: SourceConfig;
  database: SourceConfig;
  elasticsearchConnection: ElasticsearchConfig;
  mcpAdapterConnection: McpAdapterConfig;
  databaseConnection: DatabaseConfig;
}

export function getSourceConfigs(): AllSourceConfigs {
  return {
    elasticsearch: getSourceConfig('elasticsearch', {
      timeoutMs: parseInt(process.env.ES_TIMEOUT_MS || '200', 10),
      priority: 1,
    }),
    mcpAdapter: getSourceConfig('mcp-adapter', {
      timeoutMs: parseInt(process.env.MCP_TIMEOUT_MS || '2000', 10),
      priority: 2,
    }),
    database: getSourceConfig('database', {
      timeoutMs: parseInt(process.env.DB_TIMEOUT_MS || '500', 10),
      priority: 3,
    }),
    elasticsearchConnection: {
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      index: process.env.ELASTICSEARCH_INDEX || 'foodbot_restaurants',
      auth: process.env.ELASTICSEARCH_USERNAME
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD || '',
          }
        : undefined,
      maxRetries: parseInt(process.env.ES_MAX_RETRIES || '2', 10),
      requestTimeoutMs: parseInt(process.env.ES_REQUEST_TIMEOUT || '200', 10),
    },
    mcpAdapterConnection: {
      baseUrl: process.env.MCP_ADAPTER_URL || 'http://localhost:8082/api/v1',
      apiKey: process.env.MCP_ADAPTER_API_KEY,
      requestTimeoutMs: parseInt(process.env.MCP_REQUEST_TIMEOUT || '2000', 10),
      maxRetries: parseInt(process.env.MCP_MAX_RETRIES || '1', 10),
    },
    databaseConnection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'foodbot',
      username: process.env.DB_USERNAME || 'foodbot',
      password: process.env.DB_PASSWORD || '',
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10),
    },
  };
}

function getSourceConfig(
  name: SourceName,
  overrides: { timeoutMs: number; priority: number },
): SourceConfig {
  const enabledEnvKey = `SOURCE_${name.toUpperCase().replace('-', '_')}_ENABLED`;
  return {
    name,
    enabled: process.env[enabledEnvKey] !== 'false',
    timeoutMs: overrides.timeoutMs,
    priority: overrides.priority,
    maxRetries: parseInt(process.env[`SOURCE_${name.toUpperCase().replace('-', '_')}_RETRIES`] || '1', 10),
    circuitBreaker: {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      resetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_MS || '30000', 10),
      halfOpenRequests: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN || '3', 10),
    },
  };
}

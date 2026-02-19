/**
 * Server entry point for the Search Orchestrator Service.
 * Initializes dependencies and starts the HTTP server.
 */

import pino from 'pino';

import { createApp } from './app';
import { getOrchestratorConfig } from './config/orchestrator.config';

async function main(): Promise<void> {
  const config = getOrchestratorConfig();

  const logger = pino({
    level: config.logging.level,
    transport: config.logging.prettyPrint
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  });

  // Initialize Redis client if available
  let redisClient: import('./cache/SearchCache').RedisClient | undefined;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      redis.on('error', (err) => {
        logger.error({ error: err }, 'Redis connection error');
      });

      redis.on('connect', () => {
        logger.info('Connected to Redis');
      });

      redisClient = {
        get: (key: string) => redis.get(key),
        setex: (key: string, ttl: number, value: string) => redis.setex(key, ttl, value),
        del: async (key: string) => redis.del(key),
        keys: (pattern: string) => redis.keys(pattern),
      };
    } catch (error) {
      logger.warn({ error }, 'Redis not available, using in-memory cache');
    }
  } else {
    logger.info('REDIS_URL not set, using in-memory cache');
  }

  const { app } = createApp({ logger, redisClient });

  const port = parseInt(process.env.PORT || '3002', 10);
  const host = process.env.HOST || '0.0.0.0';

  const server = app.listen(port, host, () => {
    logger.info(
      { port, host },
      `Search Orchestrator Service listening on http://${host}:${port}`,
    );
    logger.info('Available endpoints:');
    logger.info('  POST /search            - Main search endpoint');
    logger.info('  GET  /search/autocomplete - Fast autocomplete');
    logger.info('  GET  /search/popular     - Popular searches');
    logger.info('  POST /cache/invalidate   - Cache invalidation webhook');
    logger.info('  GET  /health             - Health check');
    logger.info('  GET  /metrics            - Prometheus metrics');
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down Search Orchestrator Service...');

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });
}

void main();

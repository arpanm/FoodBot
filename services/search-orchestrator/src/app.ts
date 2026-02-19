/**
 * Express application setup for the Search Orchestrator Service.
 * Configures routes, middleware, and search orchestrator initialization.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import pino from 'pino';

import { getOrchestratorConfig } from './config/orchestrator.config';
import { getSourceConfigs } from './config/source.config';
import { SearchOrchestrator } from './orchestrator/SearchOrchestrator';
import { ElasticsearchSource } from './sources/ElasticsearchSource';
import { MCPAdapterSource } from './sources/MCPAdapterSource';
import { DatabaseSource } from './sources/DatabaseSource';
import { SearchCache } from './cache/SearchCache';
import { CacheInvalidationService, type DataChangeEvent } from './cache/cacheInvalidation';
import type {
  SearchRequest,
  AutocompleteRequest,
  SearchStrategyType,
} from './types/search.types';
import type { SearchSource } from './types/source.types';

export interface AppDependencies {
  logger: pino.Logger;
  redisClient?: import('./cache/SearchCache').RedisClient;
}

export function createApp(deps: AppDependencies): {
  app: express.Application;
  orchestrator: SearchOrchestrator;
  cacheInvalidation: CacheInvalidationService;
} {
  const { logger, redisClient } = deps;
  const config = getOrchestratorConfig();
  const sourceConfigs = getSourceConfigs();

  // Initialize sources
  const sources: SearchSource[] = [];

  if (sourceConfigs.elasticsearch.enabled) {
    sources.push(
      new ElasticsearchSource(
        sourceConfigs.elasticsearch,
        sourceConfigs.elasticsearchConnection,
        logger,
      ),
    );
  }

  if (sourceConfigs.mcpAdapter.enabled) {
    sources.push(
      new MCPAdapterSource(
        sourceConfigs.mcpAdapter,
        sourceConfigs.mcpAdapterConnection,
        logger,
      ),
    );
  }

  if (sourceConfigs.database.enabled) {
    sources.push(
      new DatabaseSource(
        sourceConfigs.database,
        sourceConfigs.databaseConnection,
        logger,
      ),
    );
  }

  // Initialize cache
  const cache = new SearchCache(redisClient ?? null, logger);

  // Initialize orchestrator
  const orchestrator = new SearchOrchestrator(sources, cache, config, logger);

  // Initialize cache invalidation
  const cacheInvalidation = new CacheInvalidationService(cache, logger);

  // Create Express app
  const app = express();
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });

  // POST /search - Main search endpoint
  app.post('/search', async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const searchRequest: SearchRequest = {
        query: (body.query as string) ?? '',
        filters: body.filters as SearchRequest['filters'],
        sort: body.sort as SearchRequest['sort'],
        page: (body.page as number) ?? 1,
        pageSize: Math.min((body.pageSize as number) ?? config.defaultPageSize, config.maxResultsPerPage),
        strategy: body.strategy as SearchStrategyType | undefined,
        userId: body.userId as string | undefined,
        requestId: req.headers['x-request-id'] as string | undefined,
      };

      const response = await orchestrator.search(searchRequest);
      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Search request failed');
      res.status(500).json({
        error: {
          code: 'SEARCH_ERROR',
          message: 'An error occurred while processing the search request',
        },
      });
    }
  });

  // GET /search/autocomplete - Fast autocomplete
  app.get('/search/autocomplete', async (req: Request, res: Response) => {
    try {
      const autocompleteRequest: AutocompleteRequest = {
        prefix: (req.query.prefix as string) ?? '',
        limit: parseInt(req.query.limit as string, 10) || 10,
        location: req.query.lat && req.query.lon
          ? {
              lat: parseFloat(req.query.lat as string),
              lon: parseFloat(req.query.lon as string),
            }
          : undefined,
      };

      if (!autocompleteRequest.prefix) {
        res.status(400).json({
          error: { code: 'INVALID_REQUEST', message: 'prefix is required' },
        });
        return;
      }

      const response = await orchestrator.autocomplete(autocompleteRequest);
      res.json(response);
    } catch (error) {
      logger.error({ error }, 'Autocomplete request failed');
      res.status(500).json({
        error: {
          code: 'AUTOCOMPLETE_ERROR',
          message: 'An error occurred while processing the autocomplete request',
        },
      });
    }
  });

  // GET /search/popular - Popular searches
  app.get('/search/popular', async (_req: Request, res: Response) => {
    try {
      const popular = await orchestrator.getPopularSearches();
      res.json({ searches: popular });
    } catch (error) {
      logger.error({ error }, 'Popular searches request failed');
      res.status(500).json({
        error: {
          code: 'POPULAR_SEARCH_ERROR',
          message: 'An error occurred while fetching popular searches',
        },
      });
    }
  });

  // POST /cache/invalidate - Cache invalidation webhook
  app.post('/cache/invalidate', async (req: Request, res: Response) => {
    try {
      const event = req.body as DataChangeEvent;
      await cacheInvalidation.handleEvent(event);
      res.json({ status: 'ok' });
    } catch (error) {
      logger.error({ error }, 'Cache invalidation failed');
      res.status(500).json({
        error: {
          code: 'CACHE_INVALIDATION_ERROR',
          message: 'Cache invalidation failed',
        },
      });
    }
  });

  // GET /health - Health check
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const health = await orchestrator.healthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /metrics - Prometheus metrics
  app.get('/metrics', (_req: Request, res: Response) => {
    try {
      const metrics = orchestrator.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error: err }, 'Unhandled error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  return { app, orchestrator, cacheInvalidation };
}

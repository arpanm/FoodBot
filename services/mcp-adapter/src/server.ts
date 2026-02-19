/**
 * MCP Adapter REST API Server.
 * Provides HTTP endpoints for searching restaurants, menus, and placing orders.
 *
 * Routes:
 *   POST /search           - Search restaurants across all providers
 *   GET  /restaurant/:id   - Get restaurant details
 *   GET  /restaurant/:id/menu - Get menu
 *   POST /order            - Place order
 *   GET  /health           - Health check
 *   GET  /metrics          - Prometheus-format metrics
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { createApp, type AppContext } from './app.js';
import type { SearchQuery, OrderRequest } from './types/provider.types.js';
import type { ProviderName } from './types/common.types.js';

let app: AppContext;

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? (JSON.parse(body) as Record<string, unknown>) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string
): void {
  sendJson(res, status, {
    error: { code, message, timestamp: new Date().toISOString() },
  });
}

async function handleSearch(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const body = await parseJsonBody(req);

  const query: SearchQuery = {
    query: (body['query'] as string) ?? '',
    location: {
      lat: (body['lat'] as number) ?? 12.9716,
      lng: (body['lng'] as number) ?? 77.5946,
    },
    radiusKm: (body['radiusKm'] as number) ?? 10,
    cuisines: body['cuisines'] as string[] | undefined,
    minRating: body['minRating'] as number | undefined,
    isVegetarian: body['isVegetarian'] as boolean | undefined,
    sortBy: body['sortBy'] as SearchQuery['sortBy'] | undefined,
    pagination: {
      page: (body['page'] as number) ?? 1,
      pageSize: (body['pageSize'] as number) ?? 20,
    },
    userId: body['userId'] as string | undefined,
  };

  const providers = body['providers'] as ProviderName[] | undefined;
  const result = await app.aggregator.searchAll(query, providers);
  sendJson(res, 200, result);
}

async function handleRestaurantDetails(
  _req: IncomingMessage,
  res: ServerResponse,
  restaurantId: string
): Promise<void> {
  for (const provider of app.providers.values()) {
    if (!provider.isEnabled()) {
      continue;
    }
    try {
      const details = await provider.getRestaurantDetails(restaurantId);
      if (details) {
        sendJson(res, 200, details);
        return;
      }
    } catch {
      continue;
    }
  }
  sendError(res, 404, 'RESTAURANT_NOT_FOUND', `Restaurant ${restaurantId} not found`);
}

async function handleMenu(
  _req: IncomingMessage,
  res: ServerResponse,
  restaurantId: string
): Promise<void> {
  for (const provider of app.providers.values()) {
    if (!provider.isEnabled()) {
      continue;
    }
    try {
      const menu = await provider.getMenu(restaurantId);
      if (menu) {
        sendJson(res, 200, menu);
        return;
      }
    } catch {
      continue;
    }
  }
  sendError(res, 404, 'MENU_NOT_FOUND', `Menu not found for restaurant ${restaurantId}`);
}

async function handleOrder(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const body = await parseJsonBody(req);
  const restaurantId = body['restaurantId'] as string;

  if (!restaurantId) {
    sendError(res, 400, 'MISSING_RESTAURANT_ID', 'restaurantId is required');
    return;
  }

  // Determine provider from restaurant ID prefix
  let providerName: ProviderName = 'mock';
  if (restaurantId.startsWith('swiggy-')) {
    providerName = 'swiggy';
  } else if (restaurantId.startsWith('zomato-')) {
    providerName = 'zomato';
  } else if (restaurantId.startsWith('internal-')) {
    providerName = 'internal';
  }

  const provider = app.providers.get(providerName);
  if (!provider) {
    sendError(res, 400, 'PROVIDER_NOT_FOUND', `Provider ${providerName} not available`);
    return;
  }

  try {
    const addressBody = (body['deliveryAddress'] ?? {}) as Record<string, unknown>;
    const result = await provider.placeOrder({
      userId: (body['userId'] as string) ?? '',
      restaurantId,
      items: (body['items'] as OrderRequest['items']) ?? [],
      deliveryAddress: {
        addressLine1: (addressBody['addressLine1'] as string) ?? '',
        addressLine2: (addressBody['addressLine2'] as string) ?? '',
        city: (addressBody['city'] as string) ?? '',
        state: (addressBody['state'] as string) ?? '',
        pincode: (addressBody['pincode'] as string) ?? '',
        location: (addressBody['location'] as { lat: number; lng: number }) ?? { lat: 0, lng: 0 },
        label: (addressBody['label'] as string) ?? '',
      },
      paymentMethod: (body['paymentMethod'] as string) as 'card',
      notes: (body['notes'] as string) ?? '',
    });
    sendJson(res, 201, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order failed';
    sendError(res, 500, 'ORDER_FAILED', message);
  }
}

async function handleHealth(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const healthChecks = await Promise.allSettled(
    Array.from(app.providers.values()).map(async (provider) => {
      const health = await provider.healthCheck();
      return { ...health, provider: provider.name };
    })
  );

  const results = healthChecks.map((outcome) => {
    if (outcome.status === 'fulfilled') {
      return outcome.value;
    }
    return {
      provider: 'unknown',
      status: 'unhealthy',
      error: outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error',
    };
  });

  const overallHealthy = results.some(
    (r) => 'status' in r && r.status === 'healthy'
  );

  sendJson(res, overallHealthy ? 200 : 503, {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    providers: results,
  });
}

function handleMetrics(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const cacheMetrics = app.cache.getMetrics();
  const cbMetrics = Array.from(app.circuitBreakers.entries()).map(
    ([name, cb]) => ({ name, ...cb.getMetrics() })
  );
  const rlMetrics = Array.from(app.rateLimiters.entries()).map(
    ([name, rl]) => ({ name, ...rl.getMetrics() })
  );

  const lines: string[] = [
    '# HELP mcp_adapter_cache_hits_total Total cache hits',
    '# TYPE mcp_adapter_cache_hits_total counter',
    `mcp_adapter_cache_hits_total ${cacheMetrics.hits}`,
    '',
    '# HELP mcp_adapter_cache_misses_total Total cache misses',
    '# TYPE mcp_adapter_cache_misses_total counter',
    `mcp_adapter_cache_misses_total ${cacheMetrics.misses}`,
    '',
  ];

  for (const cb of cbMetrics) {
    lines.push(
      `# HELP mcp_adapter_circuit_breaker_state Circuit breaker state`,
      `# TYPE mcp_adapter_circuit_breaker_state gauge`,
      `mcp_adapter_circuit_breaker_state{provider="${cb.name}"} ${cb.state === 'closed' ? 0 : cb.state === 'half-open' ? 1 : 2}`,
      ''
    );
  }

  for (const rl of rlMetrics) {
    lines.push(
      `# HELP mcp_adapter_rate_limiter_tokens Available rate limiter tokens`,
      `# TYPE mcp_adapter_rate_limiter_tokens gauge`,
      `mcp_adapter_rate_limiter_tokens{provider="${rl.name}"} ${rl.availableTokens}`,
      ''
    );
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(lines.join('\n'));
}

async function requestHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const method = req.method ?? 'GET';
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (method === 'POST' && pathname === '/search') {
      await handleSearch(req, res);
    } else if (method === 'GET' && pathname.match(/^\/restaurant\/[^/]+\/menu$/)) {
      const id = pathname.split('/')[2] ?? '';
      await handleMenu(req, res, id);
    } else if (method === 'GET' && pathname.match(/^\/restaurant\/[^/]+$/)) {
      const id = pathname.split('/')[2] ?? '';
      await handleRestaurantDetails(req, res, id);
    } else if (method === 'POST' && pathname === '/order') {
      await handleOrder(req, res);
    } else if (method === 'GET' && pathname === '/health') {
      await handleHealth(req, res);
    } else if (method === 'GET' && pathname === '/metrics') {
      handleMetrics(req, res);
    } else {
      sendError(res, 404, 'NOT_FOUND', `Route ${method} ${pathname} not found`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    sendError(res, 500, 'INTERNAL_ERROR', message);
  }
}

export function startServer(): void {
  app = createApp();

  const server = createServer((req, res) => {
    requestHandler(req, res).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unhandled error';
      sendError(res, 500, 'UNHANDLED_ERROR', message);
    });
  });

  const port = app.config.port;
  const host = app.config.host;

  server.listen(port, host, () => {
    const enabledProviders = Array.from(app.providers.keys()).join(', ');
    // Use structured logging in production; console used here for startup
    process.stdout.write(
      JSON.stringify({
        level: 'info',
        message: `MCP Adapter started on ${host}:${port}`,
        providers: enabledProviders,
        environment: app.config.environment,
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
  });
}

// Start server when run directly
startServer();

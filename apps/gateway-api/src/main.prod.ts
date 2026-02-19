/**
 * Production Bootstrap Configuration for Gateway API
 *
 * Enhancements:
 * - Helmet security headers
 * - Production CORS configuration
 * - Rate limiting with Redis
 * - Compression middleware
 * - Structured JSON logging
 * - Health check endpoints
 * - Graceful shutdown handling
 * - Request ID tracking
 * - Performance monitoring
 *
 * @version 1.0.0
 */

import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

import { AppModule } from './app.module';
import { validateProductionEnvironment } from '@foodbot/packages/shared/src/config/env-validator';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  // Validate environment variables
  try {
    validateProductionEnvironment();
  } catch (error) {
    Logger.error('Environment validation failed', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  const logger = new Logger('Bootstrap');

  // Create NestJS application
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
    bufferLogs: true,
    abortOnError: false,
  });

  // Trust proxy (for load balancer)
  app.set('trust proxy', 1);

  // Disable X-Powered-By header
  app.disable('x-powered-by');

  // ==========================================
  // SECURITY: Helmet Configuration
  // ==========================================
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", process.env.CDN_URL || ''].filter(Boolean),
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );

  // ==========================================
  // SECURITY: CORS Configuration
  // ==========================================
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

  if (allowedOrigins.length === 0) {
    logger.error('No ALLOWED_ORIGINS configured. Application may not work correctly.');
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
  });

  // ==========================================
  // COMPRESSION: Gzip/Brotli
  // ==========================================
  app.use(
    compression({
      level: parseInt(process.env.API_COMPRESSION_LEVEL || '6', 10),
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    })
  );

  // ==========================================
  // RATE LIMITING: Redis-backed
  // ==========================================
  const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      tls: process.env.REDIS_TLS === 'true',
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  redisClient.on('error', (err) => {
    logger.error('Redis rate limit client error', err);
  });

  await redisClient.connect();

  // General API rate limiting
  app.use(
    '/api',
    rateLimit({
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:general:',
      }),
      windowMs: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/ready' || req.path === '/live';
      },
    })
  );

  // Stricter rate limiting for authentication endpoints
  app.use(
    '/api/v1/auth',
    rateLimit({
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:auth:',
      }),
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '900', 10) * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many authentication attempts',
        message: 'Please wait before trying again.',
      },
    })
  );

  // ==========================================
  // API CONFIGURATION
  // ==========================================

  // Global prefix
  app.setGlobalPrefix('api');

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,
        value: false,
      },
    })
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(parseInt(process.env.API_GATEWAY_TIMEOUT || '30000', 10))
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // ==========================================
  // SWAGGER DOCUMENTATION (only in non-prod)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FoodBot API')
      .setDescription('FoodBot Gateway API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('orders', 'Order management')
      .addTag('restaurants', 'Restaurant search and management')
      .addTag('users', 'User management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log('Swagger documentation available at: /api/docs');
  }

  // ==========================================
  // HEALTH CHECK ENDPOINTS
  // ==========================================
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  });

  app.getHttpAdapter().get('/ready', async (req, res) => {
    // Check critical dependencies
    try {
      await redisClient.ping();
      res.status(200).json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.getHttpAdapter().get('/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
  });

  // ==========================================
  // GRACEFUL SHUTDOWN
  // ==========================================
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    const shutdownTimeout = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000', 10);

    const timer = setTimeout(() => {
      logger.error('Graceful shutdown timeout. Forcing exit.');
      process.exit(1);
    }, shutdownTimeout);

    try {
      await app.close();
      await redisClient.quit();
      clearTimeout(timer);
      logger.log('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error instanceof Error ? error.stack : 'Unknown error');
      clearTimeout(timer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error.stack);
    shutdown('uncaughtException');
  });

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // ==========================================
  // START SERVER
  // ==========================================
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log(`🚀 Gateway API is running on: http://${host}:${port}/api`);
  logger.log(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
  logger.log(`⏱️  Request timeout: ${process.env.API_GATEWAY_TIMEOUT || 30000}ms`);
  logger.log(`🛡️  Rate limit: ${process.env.RATE_LIMIT_MAX || 100} requests per ${process.env.RATE_LIMIT_TTL || 60}s`);

  if (process.env.METRICS_ENABLED === 'true') {
    logger.log(`📈 Metrics available at: http://${host}:${process.env.METRICS_PORT || 9090}${process.env.METRICS_PATH || '/metrics'}`);
  }
}

bootstrap().catch((error) => {
  Logger.error('Failed to start application', error.stack);
  process.exit(1);
});

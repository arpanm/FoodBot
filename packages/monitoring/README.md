# @foodbot/monitoring

Production-grade monitoring, logging, and observability package for FoodBot.

## Features

- **Structured Logging** - JSON-formatted logs with Pino
- **Metrics Collection** - Prometheus-compatible metrics
- **Error Tracking** - Sentry integration for error monitoring
- **Health Checks** - Kubernetes-ready liveness and readiness probes
- **Request Tracing** - Correlation IDs and APM
- **Performance Monitoring** - Transaction and span tracking

## Installation

```bash
pnpm add @foodbot/monitoring
```

## Quick Start

### NestJS Integration

```typescript
import { MonitoringModule } from '@foodbot/monitoring';

@Module({
  imports: [
    MonitoringModule.forRoot({
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      },
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        pretty: process.env.NODE_ENV === 'development',
      },
      metrics: {
        prefix: 'foodbot_',
        enableDefaultMetrics: true,
      },
    }),
  ],
})
export class AppModule {}
```

### Configure Middleware

```typescript
import { NestFactory } from '@nestjs/core';
import {
  CorrelationIdMiddleware,
  RequestLoggerMiddleware,
  PerformanceMiddleware,
} from '@foodbot/monitoring';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply middleware
  app.use(new CorrelationIdMiddleware(logger).use.bind(logger));
  app.use(new RequestLoggerMiddleware(logger, metrics).use.bind(logger));
  app.use(new PerformanceMiddleware(sentry).use.bind(sentry));

  await app.listen(3000);
}
```

## Usage

### Logging

```typescript
import { LoggerService } from '@foodbot/monitoring';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async createUser(data: CreateUserDto): Promise<User> {
    this.logger.info('Creating user', { email: data.email });

    try {
      const user = await this.userRepository.create(data);
      this.logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error, { email: data.email });
      throw error;
    }
  }
}
```

### Metrics

```typescript
import { MetricsService } from '@foodbot/monitoring';

@Injectable()
export class OrderService {
  constructor(private readonly metrics: MetricsService) {}

  async createOrder(data: CreateOrderDto): Promise<Order> {
    const startTime = Date.now();

    try {
      const order = await this.orderRepository.create(data);

      // Record metrics
      this.metrics.recordOrder('created', order.restaurantId, order.total);
      this.metrics.recordJob(
        'create_order',
        'success',
        (Date.now() - startTime) / 1000
      );

      return order;
    } catch (error) {
      this.metrics.recordJobError('create_order', error.name);
      throw error;
    }
  }
}
```

### Error Tracking

```typescript
import { SentryService } from '@foodbot/monitoring';

@Injectable()
export class PaymentService {
  constructor(private readonly sentry: SentryService) {}

  async processPayment(orderId: string): Promise<void> {
    try {
      await this.paymentGateway.charge(orderId);
    } catch (error) {
      // Capture error with context
      this.sentry.captureException(error, {
        user: { id: userId },
        tags: { orderId, paymentMethod: 'card' },
        extra: { amount: order.total },
      });
      throw error;
    }
  }
}
```

### Health Checks

```typescript
import { HealthService } from '@foodbot/monitoring';

@Injectable()
export class AppService {
  constructor(
    private readonly health: HealthService,
    private readonly dataSource: DataSource,
    private readonly redis: Redis
  ) {
    this.registerHealthChecks();
  }

  private registerHealthChecks(): void {
    // Database health check
    this.health.registerCheck(
      'database',
      HealthService.createDatabaseCheck(async () => {
        await this.dataSource.query('SELECT 1');
      })
    );

    // Redis health check
    this.health.registerCheck(
      'redis',
      HealthService.createRedisCheck(async () => {
        return this.redis.ping();
      })
    );
  }
}
```

## Endpoints

### Health Checks

- `GET /health` - Combined health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Metrics

- `GET /metrics` - Prometheus metrics endpoint

## Environment Variables

```bash
# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Metrics (optional)
METRICS_PREFIX=foodbot_
```

## Kubernetes Configuration

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Prometheus Configuration

```yaml
scrape_configs:
  - job_name: 'foodbot'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 15s
```

## Best Practices

1. **Always use correlation IDs** for request tracing
2. **Log errors with context** including user ID, request ID, etc.
3. **Record custom metrics** for business-critical operations
4. **Register health checks** for all external dependencies
5. **Use appropriate log levels** (debug, info, warn, error, fatal)
6. **Redact sensitive data** in logs (passwords, tokens, PII)
7. **Monitor slow requests** (> 1s) and optimize

## License

UNLICENSED

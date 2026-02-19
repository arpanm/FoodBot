import { Module, DynamicModule, Global } from '@nestjs/common';
import { LoggerService } from './logger';
import { MetricsService } from './metrics';
import { SentryService, SentryConfig } from './sentry';
import { HealthService, HealthController } from './health';
import {
  CorrelationIdMiddleware,
  RequestLoggerMiddleware,
  PerformanceMiddleware,
  MetricsController,
} from './middleware';

export interface MonitoringModuleOptions {
  sentry?: SentryConfig;
  logger?: {
    level?: string;
    pretty?: boolean;
  };
  metrics?: {
    prefix?: string;
    enableDefaultMetrics?: boolean;
  };
}

/**
 * Global monitoring module for FoodBot
 * Provides logging, metrics, error tracking, and health checks
 */
@Global()
@Module({})
export class MonitoringModule {
  static forRoot(options: MonitoringModuleOptions = {}): DynamicModule {
    // Create service instances
    const loggerService = new LoggerService(options.logger);
    const metricsService = new MetricsService(options.metrics);

    // Create Sentry service if DSN is provided
    let sentryService: SentryService | undefined;
    if (options.sentry?.dsn) {
      sentryService = new SentryService(options.sentry);
    }

    const healthService = new HealthService();

    const providers = [
      {
        provide: LoggerService,
        useValue: loggerService,
      },
      {
        provide: MetricsService,
        useValue: metricsService,
      },
      {
        provide: HealthService,
        useValue: healthService,
      },
      CorrelationIdMiddleware,
      RequestLoggerMiddleware,
      PerformanceMiddleware,
    ];

    // Add Sentry service if initialized
    if (sentryService) {
      providers.push({
        provide: SentryService,
        useValue: sentryService,
      });
    }

    return {
      module: MonitoringModule,
      providers,
      controllers: [HealthController, MetricsController],
      exports: [LoggerService, MetricsService, HealthService, SentryService].filter(Boolean),
    };
  }
}

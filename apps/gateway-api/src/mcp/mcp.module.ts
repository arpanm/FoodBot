import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisService } from '../services/redis.service';

import { GooglePlacesModule } from './providers/google-places/google-places.module';
import { GooglePlacesProvider } from './providers/google-places/google-places.provider';
import { GooglePlacesMapper } from './providers/google-places/google-places.mapper';
import { MockRestaurantProvider } from './providers/mock/mock.provider';
import { ProviderOrchestratorService } from './providers/provider-orchestrator.service';

/**
 * MCP (Multi-Channel Provider) Module
 * Manages integration with multiple restaurant data providers
 */
@Module({
  imports: [ConfigModule, GooglePlacesModule],
  providers: [
    GooglePlacesProvider,
    GooglePlacesMapper,
    MockRestaurantProvider,
    ProviderOrchestratorService,
    RedisService,
  ],
  exports: [ProviderOrchestratorService, GooglePlacesProvider, MockRestaurantProvider],
})
export class McpModule {}

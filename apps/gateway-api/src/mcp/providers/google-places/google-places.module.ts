import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisService } from '../../../services/redis.service';

import { GooglePlacesMapper } from './google-places.mapper';
import { GooglePlacesProvider } from './google-places.provider';

/**
 * Google Places Provider Module
 * Handles integration with Google Places API
 */
@Module({
  imports: [ConfigModule],
  providers: [GooglePlacesProvider, GooglePlacesMapper, RedisService],
  exports: [GooglePlacesProvider],
})
export class GooglePlacesModule {}

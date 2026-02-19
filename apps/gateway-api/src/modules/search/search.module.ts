import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisService } from '../../services/redis.service';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [SearchService, RedisService],
  exports: [SearchService],
})
export class SearchModule {}

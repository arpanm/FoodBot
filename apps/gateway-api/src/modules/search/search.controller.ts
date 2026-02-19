import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/decorators/public.decorator';

import {
  SearchRestaurantsDto,
  SearchDishesDto,
  AutocompleteDto,
  OrchestratedSearchDto,
} from './dto/search-query.dto';
import { SearchService } from './search.service';

/**
 * Search controller that proxies requests to the Search Orchestrator and MCP Orchestrator.
 * All search endpoints are public (no authentication required).
 * Rate limiting is applied to prevent abuse.
 *
 * Orchestrated endpoints use the Search Orchestrator Service which aggregates
 * results from Elasticsearch, MCP Adapter, and PostgreSQL.
 */
@Controller('api/v1/search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  /**
   * Orchestrated search endpoint - queries all sources via Search Orchestrator.
   * Supports strategies: 'fast' (ES only), 'comprehensive' (all), 'fallback' (DB).
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Post('orchestrated')
  async orchestratedSearch(@Body() body: OrchestratedSearchDto) {
    this.logger.log(
      `Orchestrated search: q='${body.query}', strategy='${body.strategy ?? 'comprehensive'}'`,
    );

    return this.searchService.orchestratedSearch({
      query: body.query,
      filters: body.filters,
      sort: body.sort,
      page: body.page ?? 1,
      pageSize: body.pageSize ?? 20,
      strategy: body.strategy,
      userId: body.userId,
    });
  }

  /**
   * Orchestrated autocomplete - fast suggestions from multiple sources.
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @Get('orchestrated/autocomplete')
  async orchestratedAutocomplete(
    @Query('prefix') prefix: string,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Orchestrated autocomplete: prefix='${prefix}'`);

    return this.searchService.orchestratedAutocomplete(prefix, limit);
  }

  /**
   * Popular searches from the Search Orchestrator.
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('orchestrated/popular')
  async getPopularSearches() {
    return this.searchService.getPopularSearches();
  }

  /**
   * Health status of the Search Orchestrator and all data sources.
   */
  @Public()
  @Get('orchestrated/health')
  async getSearchOrchestratorHealth() {
    return this.searchService.getSearchOrchestratorHealth();
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Get('restaurants')
  async searchRestaurants(@Query() query: SearchRestaurantsDto) {
    this.logger.log(
      `Restaurant search: q='${query.q}', cuisine='${query.cuisine}', page=${query.page}`,
    );

    return this.searchService.searchRestaurants({
      q: query.q,
      cuisine: query.cuisine,
      lat: query.lat,
      lon: query.lon,
      radius: query.radius ?? 5,
      minRating: query.minRating,
      priceRange: query.priceRange,
      maxDeliveryTime: query.maxDeliveryTime,
      sortBy: query.sortBy,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @Get('restaurants/suggestions')
  async getRestaurantSuggestions(@Query() query: AutocompleteDto) {
    this.logger.log(`Autocomplete: prefix='${query.prefix}'`);

    return this.searchService.getRestaurantSuggestions(query.prefix);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Get('restaurants/nearby')
  async searchNearbyRestaurants(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
    @Query('radius') radius?: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    this.logger.log(`Nearby search: lat=${lat}, lon=${lon}, radius=${radius ?? 5}`);

    return this.searchService.searchNearbyRestaurants(
      lat,
      lon,
      radius ?? 5,
      page ?? 1,
      pageSize ?? 20,
    );
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Get('dishes')
  async searchDishes(@Query() query: SearchDishesDto) {
    this.logger.log(
      `Dish search: q='${query.q}', category='${query.category}', page=${query.page}`,
    );

    return this.searchService.searchDishes({
      q: query.q,
      dietary: query.dietary,
      category: query.category,
      maxPrice: query.maxPrice,
      sortBy: query.sortBy,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('dishes/similar/:id')
  async getSimilarDishes(@Param('id') id: string) {
    this.logger.log(`Similar dishes: id=${id}`);

    return this.searchService.getSimilarDishes(id);
  }
}

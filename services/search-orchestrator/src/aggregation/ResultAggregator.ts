/**
 * Result aggregator that combines results from multiple sources,
 * deduplicates, and applies filters.
 */

import pino from 'pino';

import type { SearchRequest, UnifiedSearchResult } from '../types/search.types';
import type { SourceQueryResult } from '../types/source.types';
import type { AggregatedResults } from '../types/result.types';
import { CuisineFilter } from '../filters/CuisineFilter';
import { PriceRangeFilter } from '../filters/PriceRangeFilter';
import { RatingFilter } from '../filters/RatingFilter';
import { LocationFilter } from '../filters/LocationFilter';
import { AvailabilityFilter } from '../filters/AvailabilityFilter';

import { Deduplicator } from './Deduplicator';

export class ResultAggregator {
  private readonly logger: pino.Logger;
  private readonly deduplicator: Deduplicator;
  private readonly cuisineFilter: CuisineFilter;
  private readonly priceRangeFilter: PriceRangeFilter;
  private readonly ratingFilter: RatingFilter;
  private readonly locationFilter: LocationFilter;
  private readonly availabilityFilter: AvailabilityFilter;

  constructor(logger: pino.Logger) {
    this.logger = logger.child({ component: 'ResultAggregator' });
    this.deduplicator = new Deduplicator(logger);
    this.cuisineFilter = new CuisineFilter();
    this.priceRangeFilter = new PriceRangeFilter();
    this.ratingFilter = new RatingFilter();
    this.locationFilter = new LocationFilter();
    this.availabilityFilter = new AvailabilityFilter();
  }

  /**
   * Aggregates results from all sources into a single list.
   * Steps: merge -> deduplicate -> filter
   */
  aggregate(
    sourceResults: SourceQueryResult[],
    request: SearchRequest,
  ): AggregatedResults {
    // 1. Merge all results
    const allResults = this.mergeResults(sourceResults);
    const totalFromAllSources = allResults.length;

    this.logger.debug(
      { totalFromAllSources, sourceCount: sourceResults.length },
      'Merging results from all sources',
    );

    // 2. Deduplicate
    const deduped = this.deduplicator.deduplicate(allResults);
    const deduplicatedCount = deduped.duplicateCount;

    // 3. Apply filters
    const filtered = this.applyFilters(deduped.unique, request);
    const filteredCount = deduped.unique.length - filtered.length;

    this.logger.info(
      {
        totalFromAllSources,
        afterDedup: deduped.unique.length,
        afterFilters: filtered.length,
        deduplicatedCount,
        filteredCount,
      },
      'Aggregation completed',
    );

    return {
      results: filtered,
      totalFromAllSources,
      deduplicatedCount,
      filteredCount,
    };
  }

  private mergeResults(sourceResults: SourceQueryResult[]): UnifiedSearchResult[] {
    const merged: UnifiedSearchResult[] = [];

    for (const sourceResult of sourceResults) {
      if (sourceResult.error) {
        this.logger.debug(
          { source: sourceResult.source, error: sourceResult.error.message },
          'Skipping results from errored source',
        );
        continue;
      }

      merged.push(...sourceResult.results);
    }

    return merged;
  }

  private applyFilters(
    results: UnifiedSearchResult[],
    request: SearchRequest,
  ): UnifiedSearchResult[] {
    let filtered = results;

    if (request.filters?.cuisines && request.filters.cuisines.length > 0) {
      filtered = this.cuisineFilter.apply(filtered, request.filters.cuisines);
    }

    if (request.filters?.priceRange) {
      filtered = this.priceRangeFilter.apply(filtered, request.filters.priceRange);
    }

    if (request.filters?.minRating !== undefined) {
      filtered = this.ratingFilter.apply(filtered, request.filters.minRating);
    }

    if (request.filters?.location && request.filters?.radiusKm) {
      filtered = this.locationFilter.apply(
        filtered,
        request.filters.location,
        request.filters.radiusKm,
      );
    }

    if (request.filters?.isAvailable !== undefined) {
      filtered = this.availabilityFilter.apply(filtered, request.filters.isAvailable);
    }

    return filtered;
  }
}

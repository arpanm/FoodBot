/**
 * Parallel executor for running queries across multiple sources concurrently.
 * Collects results as they arrive and handles partial failures gracefully.
 */

import pino from 'pino';

import type { SearchRequest } from '../types/search.types';
import type { SearchSource, SourceQueryResult } from '../types/source.types';

import { TimeoutManager } from './TimeoutManager';

export interface ParallelExecutionResult {
  results: SourceQueryResult[];
  totalLatencyMs: number;
  completedSources: string[];
  timedOutSources: string[];
  failedSources: string[];
}

export class ParallelExecutor {
  private readonly logger: pino.Logger;
  private readonly timeoutManager: TimeoutManager;

  constructor(timeoutManager: TimeoutManager, logger: pino.Logger) {
    this.timeoutManager = timeoutManager;
    this.logger = logger.child({ component: 'ParallelExecutor' });
  }

  /**
   * Executes search queries across all provided sources in parallel.
   * Each source has its own timeout. Returns partial results if some sources fail.
   */
  async executeAll(
    sources: SearchSource[],
    request: SearchRequest,
  ): Promise<ParallelExecutionResult> {
    const startTime = Date.now();
    const completedSources: string[] = [];
    const timedOutSources: string[] = [];
    const failedSources: string[] = [];

    this.logger.info(
      { sourceCount: sources.length, sources: sources.map((s) => s.name) },
      'Starting parallel search across sources',
    );

    const emptyResult: SourceQueryResult = {
      source: 'elasticsearch',
      results: [],
      totalCount: 0,
      latencyMs: 0,
    };

    const promises = sources.map(async (source) => {
      const fallback: SourceQueryResult = {
        ...emptyResult,
        source: source.name,
      };

      const { value, timedOut } = await this.timeoutManager.withSourceTimeout(
        source.name,
        () => source.search(request),
        fallback,
      );

      if (timedOut) {
        timedOutSources.push(source.name);
      } else if (value.error) {
        failedSources.push(source.name);
      } else {
        completedSources.push(source.name);
      }

      return value;
    });

    const results = await Promise.allSettled(promises);

    const successfulResults = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      this.logger.error(
        { error: result.reason },
        'Unexpected error in parallel execution',
      );

      return {
        ...emptyResult,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          source: 'elasticsearch' as const,
          retryable: false,
          timestamp: new Date(),
        },
      };
    });

    const totalLatencyMs = Date.now() - startTime;

    this.logger.info(
      {
        totalLatencyMs,
        completed: completedSources,
        timedOut: timedOutSources,
        failed: failedSources,
      },
      `Parallel search completed in ${totalLatencyMs}ms`,
    );

    return {
      results: successfulResults,
      totalLatencyMs,
      completedSources,
      timedOutSources,
      failedSources,
    };
  }

  /**
   * Executes searches with early return once the first source responds successfully.
   * Used for fast search strategy.
   */
  async executeFirst(
    sources: SearchSource[],
    request: SearchRequest,
  ): Promise<SourceQueryResult> {
    const emptyResult: SourceQueryResult = {
      source: sources[0]?.name ?? 'elasticsearch',
      results: [],
      totalCount: 0,
      latencyMs: 0,
    };

    if (sources.length === 0) {
      return emptyResult;
    }

    return new Promise((resolve) => {
      let resolved = false;
      let completedCount = 0;

      for (const source of sources) {
        const fallback: SourceQueryResult = { ...emptyResult, source: source.name };

        this.timeoutManager
          .withSourceTimeout(source.name, () => source.search(request), fallback)
          .then(({ value }) => {
            completedCount++;

            if (!resolved && value.results.length > 0 && !value.error) {
              resolved = true;
              resolve(value);
            }

            if (completedCount === sources.length && !resolved) {
              resolved = true;
              resolve(emptyResult);
            }
          })
          .catch(() => {
            completedCount++;
            if (completedCount === sources.length && !resolved) {
              resolved = true;
              resolve(emptyResult);
            }
          });
      }
    });
  }
}

/**
 * Result ranker that uses ScoreCalculator to sort results by computed scores.
 */

import pino from 'pino';

import type { UnifiedSearchResult } from '../types/search.types';
import type { ScoringConfig, RankingContext } from '../types/result.types';

import { ScoreCalculator } from './ScoreCalculator';

export class Ranker {
  private readonly logger: pino.Logger;
  private readonly scoreCalculator: ScoreCalculator;

  constructor(scoringConfig: ScoringConfig, logger: pino.Logger) {
    this.logger = logger.child({ component: 'Ranker' });
    this.scoreCalculator = new ScoreCalculator(scoringConfig, logger);
  }

  /**
   * Ranks results by calculating a final score and sorting descending.
   */
  rank(
    results: UnifiedSearchResult[],
    context: RankingContext,
  ): UnifiedSearchResult[] {
    const scored = results.map((result) => {
      const components = this.scoreCalculator.calculateScore(result, context);
      return {
        result: { ...result, score: components.finalScore },
        finalScore: components.finalScore,
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);

    this.logger.debug(
      { resultCount: results.length, topScore: scored[0]?.finalScore ?? 0 },
      'Results ranked',
    );

    return scored.map((s) => s.result);
  }
}

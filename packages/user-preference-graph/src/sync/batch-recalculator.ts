import { GraphService } from '../graph/graph-service';
import { DecayConfig, DEFAULT_DECAY_CONFIG } from '../types/preference.types';
import { DecayManager, DecayResult } from '../preference/decay-manager';

export interface BatchRecalculationResult {
  totalRelationships: number;
  updated: number;
  pruned: number;
  durationMs: number;
}

export class BatchRecalculator {
  private readonly decayManager: DecayManager;

  constructor(
    private readonly graph: GraphService,
    config?: Partial<DecayConfig>
  ) {
    const mergedConfig = { ...DEFAULT_DECAY_CONFIG, ...config };
    this.decayManager = new DecayManager(graph, mergedConfig);
  }

  recalculateAll(currentDate?: Date): BatchRecalculationResult {
    const start = Date.now();
    const effectiveDate = currentDate ?? new Date();
    const totalRelationships = this.graph.getAllRelationships().length;

    const decayResult: DecayResult = this.decayManager.applyDecayToAll(effectiveDate);
    const prunedCount = this.decayManager.pruneStaleEdges(effectiveDate);

    const durationMs = Date.now() - start;

    return {
      totalRelationships,
      updated: decayResult.updatedCount,
      pruned: decayResult.prunedCount + prunedCount,
      durationMs,
    };
  }
}

export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly variants: ExperimentVariant[];
  readonly active: boolean;
}

export interface ExperimentVariant {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  readonly config: Record<string, unknown>;
}

export interface VariantAssignment {
  readonly experimentId: string;
  readonly variantId: string;
  readonly variantName: string;
  readonly config: Record<string, unknown>;
}

export class AbTestRouter {
  private experiments: Map<string, Experiment> = new Map();
  private impressions: Map<string, Map<string, number>> = new Map();

  registerExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
    this.impressions.set(experiment.id, new Map());
  }

  assignVariant(
    userId: string,
    experimentId: string
  ): VariantAssignment | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.active) {
      return null;
    }

    const variant = selectVariant(userId, experiment);
    if (!variant) {
      return null;
    }

    this.trackImpression(experimentId, variant.id);

    return {
      experimentId: experiment.id,
      variantId: variant.id,
      variantName: variant.name,
      config: variant.config,
    };
  }

  getImpressions(experimentId: string): Map<string, number> {
    return this.impressions.get(experimentId) ?? new Map();
  }

  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  private trackImpression(
    experimentId: string,
    variantId: string
  ): void {
    const expImpressions = this.impressions.get(experimentId) ?? new Map();
    const current = expImpressions.get(variantId) ?? 0;
    expImpressions.set(variantId, current + 1);
    this.impressions.set(experimentId, expImpressions);
  }
}

function selectVariant(
  userId: string,
  experiment: Experiment
): ExperimentVariant | null {
  if (experiment.variants.length === 0) {
    return null;
  }

  const hash = consistentHash(userId, experiment.id);
  const totalWeight = experiment.variants.reduce(
    (sum, v) => sum + v.weight,
    0
  );

  const bucket = hash % totalWeight;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }

  return experiment.variants[experiment.variants.length - 1] ?? null;
}

function consistentHash(userId: string, experimentId: string): number {
  const combined = `${userId}:${experimentId}`;
  let hash = 0;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash * 31 + char) >>> 0;
  }

  return hash;
}

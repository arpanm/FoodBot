import { WeightParams, DecayConfig, DEFAULT_DECAY_CONFIG } from '../types/preference.types';

export class WeightCalculator {
  private readonly config: DecayConfig;

  constructor(config?: Partial<DecayConfig>) {
    this.config = { ...DEFAULT_DECAY_CONFIG, ...config };
  }

  calculateWeight(params: WeightParams): number {
    const raw = params.frequency * params.recencyDecay * params.rating * params.contextMultiplier;
    return this.clampWeight(raw);
  }

  calculateFrequencyScore(orderCount: number, maxOrders: number): number {
    if (maxOrders <= 0) {
      return 0;
    }
    return Math.min(orderCount / maxOrders, 1.0);
  }

  calculateRecencyDecay(daysSinceLastOrder: number): number {
    if (daysSinceLastOrder < 0) {
      return 1.0;
    }
    return Math.pow(0.5, daysSinceLastOrder / this.config.halfLifeDays);
  }

  calculateRatingScore(rating: number | null): number {
    if (rating === null) {
      return 0.7;
    }
    return this.clampWeight(rating / 5.0);
  }

  calculateContextMultiplier(
    matchesDayOfWeek: boolean,
    matchesTimeSlot: boolean
  ): number {
    let multiplier = 1.0;
    if (matchesDayOfWeek) {
      multiplier *= 1.2;
    }
    if (matchesTimeSlot) {
      multiplier *= 1.3;
    }
    return multiplier;
  }

  computeFullWeight(
    orderCount: number,
    maxOrders: number,
    daysSinceLastOrder: number,
    rating: number | null,
    matchesDayOfWeek: boolean,
    matchesTimeSlot: boolean
  ): number {
    const params: WeightParams = {
      frequency: this.calculateFrequencyScore(orderCount, maxOrders),
      recencyDecay: this.calculateRecencyDecay(daysSinceLastOrder),
      rating: this.calculateRatingScore(rating),
      contextMultiplier: this.calculateContextMultiplier(matchesDayOfWeek, matchesTimeSlot),
    };
    return this.calculateWeight(params);
  }

  isAboveThreshold(weight: number): boolean {
    return weight >= this.config.minimumWeight;
  }

  getConfig(): DecayConfig {
    return { ...this.config };
  }

  private clampWeight(value: number): number {
    return Math.max(0, Math.min(value, 1.0));
  }
}

import type { FusedResult } from '../types/search.types';

export interface PopularityConfig {
  readonly trendingWeight: number;
  readonly orderCountWeight: number;
  readonly maxBoost: number;
}

const DEFAULT_POPULARITY_CONFIG: PopularityConfig = {
  trendingWeight: 0.7,
  orderCountWeight: 0.3,
  maxBoost: 2.0,
};

export function applyPopularityBoosts(
  results: FusedResult[],
  config: PopularityConfig = DEFAULT_POPULARITY_CONFIG
): FusedResult[] {
  const maxRecentOrders = findMaxRecentOrders(results);
  const maxTotalOrders = findMaxTotalOrders(results);

  return results.map((result) => {
    const boost = computePopularityBoost(
      result,
      maxRecentOrders,
      maxTotalOrders,
      config
    );

    return {
      ...result,
      fusedScore: result.fusedScore * boost,
    };
  });
}

export function computeTrendingScore(
  recentOrderCount: number,
  totalOrderCount: number,
  daysSinceLastOrder: number = 0
): number {
  if (totalOrderCount === 0) {
    return 0;
  }

  const recencyMultiplier = 1 / (1 + daysSinceLastOrder * 0.1);
  const recentRatio = recentOrderCount / Math.max(totalOrderCount, 1);

  return recentRatio * recencyMultiplier * recentOrderCount;
}

function computePopularityBoost(
  result: FusedResult,
  maxRecentOrders: number,
  maxTotalOrders: number,
  config: PopularityConfig
): number {
  const recentOrders = result.document.recentOrderCount ?? 0;
  const totalOrders = result.document.orderCount ?? 0;

  const trendingScore = normalizeScore(recentOrders, maxRecentOrders);
  const orderScore = normalizeScore(totalOrders, maxTotalOrders);

  const combinedScore =
    config.trendingWeight * trendingScore +
    config.orderCountWeight * orderScore;

  const boost = 1 + combinedScore * (config.maxBoost - 1);

  return Math.min(boost, config.maxBoost);
}

function normalizeScore(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }
  return value / max;
}

function findMaxRecentOrders(results: FusedResult[]): number {
  return Math.max(
    0,
    ...results.map((r) => r.document.recentOrderCount ?? 0)
  );
}

function findMaxTotalOrders(results: FusedResult[]): number {
  return Math.max(
    0,
    ...results.map((r) => r.document.orderCount ?? 0)
  );
}

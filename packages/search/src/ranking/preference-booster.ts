import type { FusedResult } from '../types/search.types';

export interface UserPreferences {
  readonly cuisineBoosts: Map<string, number>;
  readonly dietaryBoosts: Map<string, number>;
  readonly priceBoost?: number;
  readonly ratingBoost?: number;
}

export interface PreferenceProvider {
  getPreferences(userId: string): Promise<UserPreferences | null>;
}

export class InMemoryPreferenceProvider implements PreferenceProvider {
  private preferences: Map<string, UserPreferences> = new Map();

  setPreferences(userId: string, prefs: UserPreferences): void {
    this.preferences.set(userId, prefs);
  }

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return this.preferences.get(userId) ?? null;
  }
}

export async function applyPreferenceBoosts(
  results: FusedResult[],
  userId: string | undefined,
  provider: PreferenceProvider
): Promise<FusedResult[]> {
  if (!userId) {
    return results;
  }

  const prefs = await provider.getPreferences(userId);
  if (!prefs) {
    return results;
  }

  return results.map((result) => ({
    ...result,
    fusedScore: result.fusedScore * computeBoostFactor(result, prefs),
    personalizedScore: computeBoostFactor(result, prefs),
  }));
}

function computeBoostFactor(
  result: FusedResult,
  prefs: UserPreferences
): number {
  let boost = 1.0;

  boost *= getCuisineBoost(result, prefs);
  boost *= getDietaryBoost(result, prefs);
  boost *= getRatingBoost(result, prefs);

  return boost;
}

function getCuisineBoost(
  result: FusedResult,
  prefs: UserPreferences
): number {
  const cuisineBoost = prefs.cuisineBoosts.get(result.document.cuisine);
  return cuisineBoost ?? 1.0;
}

function getDietaryBoost(
  result: FusedResult,
  prefs: UserPreferences
): number {
  let maxBoost = 1.0;

  for (const dietary of result.document.dietary) {
    const boost = prefs.dietaryBoosts.get(dietary);
    if (boost && boost > maxBoost) {
      maxBoost = boost;
    }
  }

  return maxBoost;
}

function getRatingBoost(
  result: FusedResult,
  prefs: UserPreferences
): number {
  if (!prefs.ratingBoost) {
    return 1.0;
  }

  const rating = result.document.rating;
  if (rating >= 4.5) {
    return 1.0 + prefs.ratingBoost;
  }
  if (rating >= 4.0) {
    return 1.0 + prefs.ratingBoost * 0.5;
  }

  return 1.0;
}

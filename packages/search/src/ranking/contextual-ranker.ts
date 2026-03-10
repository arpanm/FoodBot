import type {
  FusedResult,
  SearchContext,
  TimeOfDay,
  GeoLocation,
} from '../types/search.types';
import { haversineDistance } from '../engine/geo-spatial-searcher';

interface MealTimeConfig {
  readonly cuisines: string[];
  readonly tags: string[];
  readonly boost: number;
}

const MEAL_TIME_BOOSTS: ReadonlyMap<TimeOfDay, MealTimeConfig> = new Map([
  ['morning', {
    cuisines: ['bakery', 'cafe', 'breakfast'],
    tags: ['breakfast', 'brunch', 'morning', 'coffee', 'tea'],
    boost: 1.5,
  }],
  ['lunch', {
    cuisines: ['indian', 'chinese', 'italian', 'mexican'],
    tags: ['lunch', 'thali', 'combo', 'meal'],
    boost: 1.3,
  }],
  ['evening', {
    cuisines: ['indian', 'chinese', 'italian', 'american'],
    tags: ['dinner', 'evening', 'family', 'special'],
    boost: 1.3,
  }],
  ['late_night', {
    cuisines: ['american', 'chinese', 'mexican'],
    tags: ['late night', 'midnight', 'snack', 'fast food'],
    boost: 1.4,
  }],
]);

const WEEKEND_BOOST_TAGS = ['brunch', 'family', 'special', 'buffet'];
const WEEKEND_BOOST_FACTOR = 1.2;
const PROXIMITY_MAX_KM = 10;

export function applyContextualBoosts(
  results: FusedResult[],
  context?: SearchContext
): FusedResult[] {
  if (!context) {
    return results;
  }

  return results.map((result) => {
    let boost = 1.0;

    boost *= getTimeOfDayBoost(result, context.timeOfDay);
    boost *= getDayOfWeekBoost(result, context.dayOfWeek);
    boost *= getLocationBoost(result, context.location);

    return {
      ...result,
      fusedScore: result.fusedScore * boost,
    };
  });
}

function getTimeOfDayBoost(
  result: FusedResult,
  timeOfDay?: TimeOfDay
): number {
  if (!timeOfDay) {
    return 1.0;
  }

  const config = MEAL_TIME_BOOSTS.get(timeOfDay);
  if (!config) {
    return 1.0;
  }

  const cuisine = result.document.cuisine.toLowerCase();
  if (config.cuisines.includes(cuisine)) {
    return config.boost;
  }

  const tags = result.document.tags ?? [];
  if (tags.some((tag) => config.tags.includes(tag.toLowerCase()))) {
    return config.boost;
  }

  return 1.0;
}

function getDayOfWeekBoost(
  result: FusedResult,
  dayOfWeek?: number
): number {
  if (dayOfWeek === undefined) {
    return 1.0;
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (!isWeekend) {
    return 1.0;
  }

  const tags = result.document.tags ?? [];
  if (tags.some((tag) => WEEKEND_BOOST_TAGS.includes(tag.toLowerCase()))) {
    return WEEKEND_BOOST_FACTOR;
  }

  return 1.0;
}

function getLocationBoost(
  result: FusedResult,
  location?: GeoLocation
): number {
  if (!location || !result.document.location) {
    return 1.0;
  }

  const distance = haversineDistance(location, result.document.location);

  if (distance > PROXIMITY_MAX_KM) {
    return 0.8;
  }

  return 1 + (1 - distance / PROXIMITY_MAX_KM) * 0.5;
}

export function detectTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 11) {
    return 'morning';
  }
  if (hour >= 11 && hour < 15) {
    return 'lunch';
  }
  if (hour >= 15 && hour < 21) {
    return 'evening';
  }
  return 'late_night';
}

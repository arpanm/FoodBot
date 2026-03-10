import type { SearchDocument, GeoLocation } from '../types/search.types';
import type { Facet, FacetBucket } from '../types/facet.types';
import {
  DEFAULT_PRICE_RANGES,
  DEFAULT_RATING_BUCKETS,
  DEFAULT_DELIVERY_TIME_BUCKETS,
  DEFAULT_DISTANCE_BUCKETS,
} from '../types/facet.types';
import { haversineDistance } from '../engine/geo-spatial-searcher';

export function buildCuisineFacet(
  documents: SearchDocument[],
  selected: string[]
): Facet {
  const counts = countValues(documents.map((d) => d.cuisine));

  return {
    type: 'cuisine',
    label: 'Cuisine',
    buckets: mapToBuckets(counts, selected),
  };
}

export function buildPriceRangeFacet(
  documents: SearchDocument[],
  selected: string[]
): Facet {
  const buckets: FacetBucket[] = DEFAULT_PRICE_RANGES.map((range) => {
    const count = documents.filter(
      (d) => d.price >= range.min && d.price < range.max
    ).length;

    return {
      value: range.label,
      label: range.label,
      count,
      selected: selected.includes(range.label),
    };
  }).filter((b) => b.count > 0);

  return { type: 'price_range', label: 'Price Range', buckets };
}

export function buildRatingFacet(
  documents: SearchDocument[],
  selected: string[]
): Facet {
  const thresholds = [4.5, 4.0, 3.5, 3.0];
  const buckets: FacetBucket[] = [];

  for (let i = 0; i < thresholds.length; i++) {
    const threshold = thresholds[i]!;
    const label = DEFAULT_RATING_BUCKETS[i]!;
    const count = documents.filter((d) => d.rating >= threshold).length;

    buckets.push({
      value: label,
      label,
      count,
      selected: selected.includes(label),
    });
  }

  return {
    type: 'rating',
    label: 'Rating',
    buckets: buckets.filter((b) => b.count > 0),
  };
}

export function buildDietaryFacet(
  documents: SearchDocument[],
  selected: string[]
): Facet {
  const allDietary: string[] = [];
  for (const doc of documents) {
    allDietary.push(...doc.dietary);
  }

  const counts = countValues(allDietary);

  return {
    type: 'dietary',
    label: 'Dietary',
    buckets: mapToBuckets(counts, selected),
  };
}

export function buildDeliveryTimeFacet(
  documents: SearchDocument[],
  selected: string[]
): Facet {
  const ranges = [
    { max: 15, label: DEFAULT_DELIVERY_TIME_BUCKETS[0]! },
    { max: 30, label: DEFAULT_DELIVERY_TIME_BUCKETS[1]! },
    { max: 45, label: DEFAULT_DELIVERY_TIME_BUCKETS[2]! },
    { max: 60, label: DEFAULT_DELIVERY_TIME_BUCKETS[3]! },
    { max: Infinity, label: DEFAULT_DELIVERY_TIME_BUCKETS[4]! },
  ];

  let prevMax = 0;
  const buckets: FacetBucket[] = ranges.map((range) => {
    const count = documents.filter(
      (d) => d.deliveryTime > prevMax && d.deliveryTime <= range.max
    ).length;
    prevMax = range.max === Infinity ? 60 : range.max;

    return {
      value: range.label,
      label: range.label,
      count,
      selected: selected.includes(range.label),
    };
  }).filter((b) => b.count > 0);

  return { type: 'delivery_time', label: 'Delivery Time', buckets };
}

export function buildDistanceFacet(
  documents: SearchDocument[],
  selected: string[],
  userLocation?: GeoLocation
): Facet {
  if (!userLocation) {
    return { type: 'distance', label: 'Distance', buckets: [] };
  }

  const ranges = [
    { max: 1, label: DEFAULT_DISTANCE_BUCKETS[0]! },
    { max: 3, label: DEFAULT_DISTANCE_BUCKETS[1]! },
    { max: 5, label: DEFAULT_DISTANCE_BUCKETS[2]! },
    { max: 10, label: DEFAULT_DISTANCE_BUCKETS[3]! },
    { max: Infinity, label: DEFAULT_DISTANCE_BUCKETS[4]! },
  ];

  let prevMax = 0;
  const buckets: FacetBucket[] = ranges.map((range) => {
    const count = documents.filter((d) => {
      if (!d.location) {
        return false;
      }
      const dist = haversineDistance(userLocation, d.location);
      return dist > prevMax && dist <= range.max;
    }).length;
    prevMax = range.max === Infinity ? 10 : range.max;

    return {
      value: range.label,
      label: range.label,
      count,
      selected: selected.includes(range.label),
    };
  }).filter((b) => b.count > 0);

  return { type: 'distance', label: 'Distance', buckets };
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const lower = value.toLowerCase();
    counts.set(lower, (counts.get(lower) ?? 0) + 1);
  }
  return counts;
}

function mapToBuckets(
  counts: Map<string, number>,
  selected: string[]
): FacetBucket[] {
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: capitalize(value),
      count,
      selected: selected.includes(value),
    }))
    .sort((a, b) => b.count - a.count);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

import type { SearchDocument, SearchFilters, GeoLocation } from '../types/search.types';
import type { FacetSelection } from '../types/facet.types';
import {
  DEFAULT_PRICE_RANGES,
  DEFAULT_DELIVERY_TIME_BUCKETS,
  DEFAULT_DISTANCE_BUCKETS,
} from '../types/facet.types';
import { haversineDistance } from '../engine/geo-spatial-searcher';

type FilterPredicate = (doc: SearchDocument) => boolean;

export function applyFilters(
  documents: SearchDocument[],
  filters: SearchFilters
): SearchDocument[] {
  const predicates = buildFilterPredicates(filters);
  return documents.filter((doc) => predicates.every((pred) => pred(doc)));
}

export function applyFacetSelections(
  documents: SearchDocument[],
  selections: FacetSelection[],
  userLocation?: GeoLocation
): SearchDocument[] {
  if (selections.length === 0) {
    return documents;
  }

  return documents.filter((doc) =>
    selections.every((selection) =>
      matchesFacetSelection(doc, selection, userLocation)
    )
  );
}

function buildFilterPredicates(
  filters: SearchFilters
): FilterPredicate[] {
  const predicates: FilterPredicate[] = [];

  if (filters.cuisine && filters.cuisine.length > 0) {
    predicates.push(buildCuisineFilter(filters.cuisine));
  }

  if (filters.priceRange) {
    predicates.push(buildPriceFilter(filters.priceRange));
  }

  if (filters.minRating !== undefined) {
    predicates.push(buildRatingFilter(filters.minRating));
  }

  if (filters.dietary && filters.dietary.length > 0) {
    predicates.push(buildDietaryFilter(filters.dietary));
  }

  if (filters.maxDeliveryTime !== undefined) {
    predicates.push(buildDeliveryTimeFilter(filters.maxDeliveryTime));
  }

  if (filters.maxDistance !== undefined && filters.location) {
    predicates.push(
      buildDistanceFilter(filters.maxDistance, filters.location)
    );
  }

  return predicates;
}

function buildCuisineFilter(cuisines: string[]): FilterPredicate {
  const lowerCuisines = cuisines.map((c) => c.toLowerCase());
  return (doc) => lowerCuisines.includes(doc.cuisine.toLowerCase());
}

function buildPriceFilter(
  range: { min: number; max: number }
): FilterPredicate {
  return (doc) => doc.price >= range.min && doc.price <= range.max;
}

function buildRatingFilter(minRating: number): FilterPredicate {
  return (doc) => doc.rating >= minRating;
}

function buildDietaryFilter(dietary: string[]): FilterPredicate {
  const lowerDietary = dietary.map((d) => d.toLowerCase());
  return (doc) =>
    lowerDietary.some((d) =>
      doc.dietary.map((dd) => dd.toLowerCase()).includes(d)
    );
}

function buildDeliveryTimeFilter(
  maxDeliveryTime: number
): FilterPredicate {
  return (doc) => doc.deliveryTime <= maxDeliveryTime;
}

function buildDistanceFilter(
  maxDistance: number,
  center: GeoLocation
): FilterPredicate {
  return (doc) => {
    if (!doc.location) {
      return false;
    }
    return haversineDistance(center, doc.location) <= maxDistance;
  };
}

function matchesFacetSelection(
  doc: SearchDocument,
  selection: FacetSelection,
  userLocation?: GeoLocation
): boolean {
  if (selection.values.length === 0) {
    return true;
  }

  switch (selection.type) {
    case 'cuisine':
      return selection.values.includes(doc.cuisine.toLowerCase());
    case 'price_range':
      return matchesPriceRange(doc.price, selection.values);
    case 'rating':
      return matchesRating(doc.rating, selection.values);
    case 'dietary':
      return matchesDietary(doc.dietary, selection.values);
    case 'delivery_time':
      return matchesDeliveryTime(doc.deliveryTime, selection.values);
    case 'distance':
      return matchesDistance(doc, selection.values, userLocation);
    default:
      return true;
  }
}

function matchesPriceRange(price: number, values: string[]): boolean {
  return values.some((label) => {
    const range = DEFAULT_PRICE_RANGES.find((r) => r.label === label);
    return range ? price >= range.min && price < range.max : false;
  });
}

function matchesRating(rating: number, values: string[]): boolean {
  return values.some((label) => {
    const threshold = parseFloat(label.replace('+', ''));
    return !isNaN(threshold) && rating >= threshold;
  });
}

function matchesDietary(dietary: string[], values: string[]): boolean {
  const lowerDietary = dietary.map((d) => d.toLowerCase());
  return values.some((v) => lowerDietary.includes(v.toLowerCase()));
}

function matchesDeliveryTime(time: number, values: string[]): boolean {
  const ranges = [
    { label: DEFAULT_DELIVERY_TIME_BUCKETS[0]!, min: 0, max: 15 },
    { label: DEFAULT_DELIVERY_TIME_BUCKETS[1]!, min: 15, max: 30 },
    { label: DEFAULT_DELIVERY_TIME_BUCKETS[2]!, min: 30, max: 45 },
    { label: DEFAULT_DELIVERY_TIME_BUCKETS[3]!, min: 45, max: 60 },
    { label: DEFAULT_DELIVERY_TIME_BUCKETS[4]!, min: 60, max: Infinity },
  ];

  return values.some((label) => {
    const range = ranges.find((r) => r.label === label);
    return range ? time > range.min && time <= range.max : false;
  });
}

function matchesDistance(
  doc: SearchDocument,
  values: string[],
  userLocation?: GeoLocation
): boolean {
  if (!userLocation || !doc.location) {
    return false;
  }

  const dist = haversineDistance(userLocation, doc.location);
  const ranges = [
    { label: DEFAULT_DISTANCE_BUCKETS[0]!, min: 0, max: 1 },
    { label: DEFAULT_DISTANCE_BUCKETS[1]!, min: 1, max: 3 },
    { label: DEFAULT_DISTANCE_BUCKETS[2]!, min: 3, max: 5 },
    { label: DEFAULT_DISTANCE_BUCKETS[3]!, min: 5, max: 10 },
    { label: DEFAULT_DISTANCE_BUCKETS[4]!, min: 10, max: Infinity },
  ];

  return values.some((label) => {
    const range = ranges.find((r) => r.label === label);
    return range ? dist > range.min && dist <= range.max : false;
  });
}

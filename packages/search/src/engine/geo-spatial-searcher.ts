import type {
  SearchDocument,
  SearchResult,
  GeoLocation,
} from '../types/search.types';

const EARTH_RADIUS_KM = 6371;

export interface GeoSearchConfig {
  readonly radiusKm: number;
  readonly maxResults?: number;
}

export function searchByRadius(
  documents: SearchDocument[],
  center: GeoLocation,
  config: GeoSearchConfig
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const doc of documents) {
    if (!doc.location) {
      continue;
    }

    const distance = haversineDistance(center, doc.location);
    if (distance <= config.radiusKm) {
      const score = computeDistanceScore(distance, config.radiusKm);
      results.push({ document: doc, score, source: 'geo' });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxResults ?? 50);
}

export function sortByDistance(
  documents: SearchDocument[],
  center: GeoLocation
): Array<{ document: SearchDocument; distanceKm: number }> {
  return documents
    .filter((doc) => doc.location !== undefined)
    .map((doc) => ({
      document: doc,
      distanceKm: haversineDistance(center, doc.location!),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function haversineDistance(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function computeDistanceScore(
  distance: number,
  maxRadius: number
): number {
  return Math.max(0, 1 - distance / maxRadius);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

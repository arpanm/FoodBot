import {
  haversineDistance,
  searchByRadius,
  sortByDistance,
} from '../engine/geo-spatial-searcher';
import type { SearchDocument, GeoLocation } from '../types/search.types';

function createGeoDocuments(): SearchDocument[] {
  return [
    {
      id: 'r-1',
      name: 'Restaurant A',
      description: 'Close by',
      cuisine: 'Indian',
      price: 200,
      rating: 4.5,
      dietary: [],
      deliveryTime: 30,
      location: { lat: 28.6139, lng: 77.2090 },
    },
    {
      id: 'r-2',
      name: 'Restaurant B',
      description: 'Medium distance',
      cuisine: 'Chinese',
      price: 300,
      rating: 4.0,
      dietary: [],
      deliveryTime: 25,
      location: { lat: 28.6300, lng: 77.2200 },
    },
    {
      id: 'r-3',
      name: 'Restaurant C',
      description: 'Far away',
      cuisine: 'Italian',
      price: 500,
      rating: 4.8,
      dietary: ['vegetarian'],
      deliveryTime: 45,
      location: { lat: 28.7000, lng: 77.3000 },
    },
    {
      id: 'r-4',
      name: 'Restaurant D (no location)',
      description: 'No location',
      cuisine: 'American',
      price: 250,
      rating: 4.2,
      dietary: [],
      deliveryTime: 20,
    },
  ];
}

describe('GeoSpatialSearcher', () => {
  const userLocation: GeoLocation = { lat: 28.6139, lng: 77.2090 };
  let documents: SearchDocument[];

  beforeEach(() => {
    documents = createGeoDocuments();
  });

  describe('haversineDistance', () => {
    it('should return 0 for same coordinates', () => {
      const dist = haversineDistance(
        { lat: 28.6139, lng: 77.2090 },
        { lat: 28.6139, lng: 77.2090 }
      );
      expect(dist).toBeCloseTo(0, 5);
    });

    it('should compute correct distance between known points', () => {
      const newDelhi: GeoLocation = { lat: 28.6139, lng: 77.2090 };
      const mumbai: GeoLocation = { lat: 19.0760, lng: 72.8777 };
      const dist = haversineDistance(newDelhi, mumbai);
      expect(dist).toBeGreaterThan(1100);
      expect(dist).toBeLessThan(1200);
    });

    it('should return positive distance for different points', () => {
      const dist = haversineDistance(
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 }
      );
      expect(dist).toBeGreaterThan(0);
    });

    it('should be symmetric', () => {
      const a: GeoLocation = { lat: 28.6139, lng: 77.2090 };
      const b: GeoLocation = { lat: 19.0760, lng: 72.8777 };
      expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 5);
    });
  });

  describe('searchByRadius', () => {
    it('should find restaurants within radius', () => {
      const results = searchByRadius(documents, userLocation, {
        radiusKm: 5,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      const ids = results.map((r) => r.document.id);
      expect(ids).toContain('r-1');
    });

    it('should exclude restaurants outside radius', () => {
      const results = searchByRadius(documents, userLocation, {
        radiusKm: 1,
      });

      const ids = results.map((r) => r.document.id);
      expect(ids).not.toContain('r-3');
    });

    it('should exclude documents without location', () => {
      const results = searchByRadius(documents, userLocation, {
        radiusKm: 100,
      });

      const ids = results.map((r) => r.document.id);
      expect(ids).not.toContain('r-4');
    });

    it('should score closer restaurants higher', () => {
      const results = searchByRadius(documents, userLocation, {
        radiusKm: 20,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score);
    });

    it('should tag results with geo source', () => {
      const results = searchByRadius(documents, userLocation, {
        radiusKm: 20,
      });

      for (const result of results) {
        expect(result.source).toBe('geo');
      }
    });

    it('should respect maxResults', () => {
      const results = searchByRadius(documents, userLocation, {
        radiusKm: 100,
        maxResults: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('sortByDistance', () => {
    it('should sort documents by distance ascending', () => {
      const sorted = sortByDistance(documents, userLocation);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1]!.distanceKm).toBeLessThanOrEqual(
          sorted[i]!.distanceKm
        );
      }
    });

    it('should exclude documents without location', () => {
      const sorted = sortByDistance(documents, userLocation);
      const ids = sorted.map((s) => s.document.id);
      expect(ids).not.toContain('r-4');
    });

    it('should include distance in km', () => {
      const sorted = sortByDistance(documents, userLocation);
      for (const item of sorted) {
        expect(item.distanceKm).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

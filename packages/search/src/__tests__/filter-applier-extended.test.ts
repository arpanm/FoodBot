import { applyFilters, applyFacetSelections } from '../facets/filter-applier';
import type { SearchDocument } from '../types/search.types';
import type { FacetSelection } from '../types/facet.types';

function createDocuments(): SearchDocument[] {
  return [
    {
      id: 'f-1',
      name: 'Biryani',
      description: 'Indian rice',
      cuisine: 'Indian',
      price: 250,
      rating: 4.5,
      dietary: ['halal'],
      deliveryTime: 30,
      location: { lat: 28.614, lng: 77.209 },
    },
    {
      id: 'f-2',
      name: 'Pizza',
      description: 'Italian pie',
      cuisine: 'Italian',
      price: 350,
      rating: 4.2,
      dietary: ['vegetarian'],
      deliveryTime: 25,
      location: { lat: 28.615, lng: 77.210 },
    },
    {
      id: 'f-3',
      name: 'Sushi',
      description: 'Japanese rolls',
      cuisine: 'Japanese',
      price: 500,
      rating: 4.8,
      dietary: ['gluten-free'],
      deliveryTime: 45,
      location: { lat: 28.650, lng: 77.250 },
    },
    {
      id: 'f-4',
      name: 'Vegan Bowl',
      description: 'Healthy bowl',
      cuisine: 'American',
      price: 150,
      rating: 3.5,
      dietary: ['vegan', 'vegetarian'],
      deliveryTime: 10,
      location: { lat: 28.700, lng: 77.300 },
    },
  ];
}

describe('FilterApplier extended', () => {
  let documents: SearchDocument[];

  beforeEach(() => {
    documents = createDocuments();
  });

  describe('applyFilters with distance', () => {
    it('should filter by max distance with location', () => {
      const filtered = applyFilters(documents, {
        maxDistance: 5,
        location: { lat: 28.614, lng: 77.209 },
      });

      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.some((d) => d.id === 'f-1')).toBe(true);
    });

    it('should exclude items without location when distance filter', () => {
      const docsWithNoLocation: SearchDocument[] = [
        {
          id: 'no-loc',
          name: 'No Location',
          description: 'Missing',
          cuisine: 'Indian',
          price: 200,
          rating: 4.0,
          dietary: [],
          deliveryTime: 30,
        },
      ];

      const filtered = applyFilters(docsWithNoLocation, {
        maxDistance: 5,
        location: { lat: 28.614, lng: 77.209 },
      });

      expect(filtered).toHaveLength(0);
    });
  });

  describe('applyFacetSelections with price_range', () => {
    it('should filter by price range facet selection', () => {
      const selections: FacetSelection[] = [
        { type: 'price_range', values: ['100-300'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered.every((d) => d.price >= 100 && d.price < 300)).toBe(
        true
      );
    });
  });

  describe('applyFacetSelections with rating', () => {
    it('should filter by rating facet selection', () => {
      const selections: FacetSelection[] = [
        { type: 'rating', values: ['4.5+'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered.every((d) => d.rating >= 4.5)).toBe(true);
    });
  });

  describe('applyFacetSelections with dietary', () => {
    it('should filter by dietary facet selection', () => {
      const selections: FacetSelection[] = [
        { type: 'dietary', values: ['vegetarian'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(
        filtered.every((d) =>
          d.dietary.some((dd) => dd.toLowerCase() === 'vegetarian')
        )
      ).toBe(true);
    });
  });

  describe('applyFacetSelections with delivery_time', () => {
    it('should filter by delivery time facet selection', () => {
      const selections: FacetSelection[] = [
        { type: 'delivery_time', values: ['Under 15 min'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered.every((d) => d.deliveryTime <= 15)).toBe(true);
    });

    it('should filter by 30-45 min delivery time', () => {
      const selections: FacetSelection[] = [
        { type: 'delivery_time', values: ['30-45 min'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(
        filtered.every((d) => d.deliveryTime > 30 && d.deliveryTime <= 45)
      ).toBe(true);
    });
  });

  describe('applyFacetSelections with distance', () => {
    it('should filter by distance facet with user location', () => {
      const selections: FacetSelection[] = [
        { type: 'distance', values: ['Under 1 km'] },
      ];

      const filtered = applyFacetSelections(
        documents,
        selections,
        { lat: 28.614, lng: 77.209 }
      );

      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty when no user location for distance', () => {
      const selections: FacetSelection[] = [
        { type: 'distance', values: ['Under 1 km'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered).toHaveLength(0);
    });

    it('should return empty for items without location for distance', () => {
      const noLocDocs: SearchDocument[] = [
        {
          id: 'no-loc',
          name: 'Test',
          description: 'No loc',
          cuisine: 'Indian',
          price: 200,
          rating: 4.0,
          dietary: [],
          deliveryTime: 20,
        },
      ];

      const selections: FacetSelection[] = [
        { type: 'distance', values: ['Under 1 km'] },
      ];

      const filtered = applyFacetSelections(
        noLocDocs,
        selections,
        { lat: 28.614, lng: 77.209 }
      );

      expect(filtered).toHaveLength(0);
    });
  });

  describe('applyFacetSelections with empty values', () => {
    it('should return all docs when values array is empty', () => {
      const selections: FacetSelection[] = [
        { type: 'cuisine', values: [] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered).toHaveLength(documents.length);
    });
  });
});

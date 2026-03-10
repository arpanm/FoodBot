import { FacetEngine } from '../facets/facet-engine';
import { applyFilters, applyFacetSelections } from '../facets/filter-applier';
import type { SearchDocument } from '../types/search.types';
import type { FacetSelection } from '../types/facet.types';

function createFacetDocuments(): SearchDocument[] {
  return [
    {
      id: 'f-1',
      name: 'Chicken Biryani',
      description: 'Spicy rice dish',
      cuisine: 'Indian',
      price: 250,
      rating: 4.5,
      dietary: ['halal'],
      deliveryTime: 30,
      location: { lat: 28.614, lng: 77.209 },
    },
    {
      id: 'f-2',
      name: 'Margherita Pizza',
      description: 'Classic pizza',
      cuisine: 'Italian',
      price: 350,
      rating: 4.2,
      dietary: ['vegetarian'],
      deliveryTime: 25,
      location: { lat: 28.615, lng: 77.210 },
    },
    {
      id: 'f-3',
      name: 'Paneer Tikka',
      description: 'Grilled paneer',
      cuisine: 'Indian',
      price: 200,
      rating: 4.0,
      dietary: ['vegetarian'],
      deliveryTime: 20,
      location: { lat: 28.616, lng: 77.211 },
    },
    {
      id: 'f-4',
      name: 'Sushi Roll',
      description: 'Fresh sushi',
      cuisine: 'Japanese',
      price: 500,
      rating: 4.8,
      dietary: ['gluten-free'],
      deliveryTime: 35,
      location: { lat: 28.620, lng: 77.215 },
    },
    {
      id: 'f-5',
      name: 'Vegan Bowl',
      description: 'Healthy vegan bowl',
      cuisine: 'American',
      price: 150,
      rating: 3.8,
      dietary: ['vegan', 'vegetarian'],
      deliveryTime: 15,
      location: { lat: 28.625, lng: 77.220 },
    },
  ];
}

describe('FacetEngine', () => {
  let engine: FacetEngine;
  let documents: SearchDocument[];

  beforeEach(() => {
    engine = new FacetEngine();
    documents = createFacetDocuments();
  });

  describe('buildFacets', () => {
    it('should build cuisine facet with counts', () => {
      const facets = engine.buildFacets(documents);
      const cuisineFacet = facets.find((f) => f.type === 'cuisine');

      expect(cuisineFacet).toBeDefined();
      expect(cuisineFacet!.buckets.length).toBeGreaterThanOrEqual(1);

      const indianBucket = cuisineFacet!.buckets.find(
        (b) => b.value === 'indian'
      );
      expect(indianBucket).toBeDefined();
      expect(indianBucket!.count).toBe(2);
    });

    it('should build price range facet', () => {
      const facets = engine.buildFacets(documents);
      const priceFacet = facets.find((f) => f.type === 'price_range');

      expect(priceFacet).toBeDefined();
      expect(priceFacet!.buckets.length).toBeGreaterThanOrEqual(1);
    });

    it('should build rating facet', () => {
      const facets = engine.buildFacets(documents);
      const ratingFacet = facets.find((f) => f.type === 'rating');

      expect(ratingFacet).toBeDefined();
    });

    it('should build dietary facet', () => {
      const facets = engine.buildFacets(documents);
      const dietaryFacet = facets.find((f) => f.type === 'dietary');

      expect(dietaryFacet).toBeDefined();
      const vegBucket = dietaryFacet!.buckets.find(
        (b) => b.value === 'vegetarian'
      );
      expect(vegBucket).toBeDefined();
      expect(vegBucket!.count).toBe(3);
    });

    it('should build delivery time facet', () => {
      const facets = engine.buildFacets(documents);
      const deliveryFacet = facets.find((f) => f.type === 'delivery_time');

      expect(deliveryFacet).toBeDefined();
      expect(deliveryFacet!.buckets.length).toBeGreaterThanOrEqual(1);
    });

    it('should mark selected values', () => {
      const selectedValues = new Map<
        import('../types/facet.types').FacetType,
        string[]
      >();
      selectedValues.set('cuisine', ['indian']);

      const facets = engine.buildFacets(documents, selectedValues);
      const cuisineFacet = facets.find((f) => f.type === 'cuisine');
      const indianBucket = cuisineFacet!.buckets.find(
        (b) => b.value === 'indian'
      );

      expect(indianBucket!.selected).toBe(true);
    });
  });

  describe('enableFacet / disableFacet', () => {
    it('should disable a facet', () => {
      engine.disableFacet('rating');
      const facets = engine.buildFacets(documents);
      const ratingFacet = facets.find((f) => f.type === 'rating');
      expect(ratingFacet).toBeUndefined();
    });

    it('should enable a disabled facet', () => {
      engine.enableFacet('distance');
      const facets = engine.buildFacets(
        documents,
        undefined,
        { lat: 28.614, lng: 77.209 }
      );
      const distanceFacet = facets.find((f) => f.type === 'distance');
      expect(distanceFacet).toBeDefined();
    });
  });
});

describe('FilterApplier', () => {
  let documents: SearchDocument[];

  beforeEach(() => {
    documents = createFacetDocuments();
  });

  describe('applyFilters', () => {
    it('should filter by cuisine', () => {
      const filtered = applyFilters(documents, { cuisine: ['Indian'] });
      expect(filtered).toHaveLength(2);
      expect(filtered.every((d) => d.cuisine === 'Indian')).toBe(true);
    });

    it('should filter by price range', () => {
      const filtered = applyFilters(documents, {
        priceRange: { min: 200, max: 400 },
      });
      expect(filtered.every((d) => d.price >= 200 && d.price <= 400)).toBe(
        true
      );
    });

    it('should filter by minimum rating', () => {
      const filtered = applyFilters(documents, { minRating: 4.5 });
      expect(filtered.every((d) => d.rating >= 4.5)).toBe(true);
    });

    it('should filter by dietary restriction', () => {
      const filtered = applyFilters(documents, {
        dietary: ['vegetarian'],
      });
      expect(
        filtered.every((d) =>
          d.dietary.some((dd) => dd.toLowerCase() === 'vegetarian')
        )
      ).toBe(true);
    });

    it('should filter by max delivery time', () => {
      const filtered = applyFilters(documents, { maxDeliveryTime: 25 });
      expect(filtered.every((d) => d.deliveryTime <= 25)).toBe(true);
    });

    it('should combine multiple filters with AND', () => {
      const filtered = applyFilters(documents, {
        cuisine: ['Indian'],
        minRating: 4.0,
      });
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(
        filtered.every(
          (d) => d.cuisine === 'Indian' && d.rating >= 4.0
        )
      ).toBe(true);
    });

    it('should return all documents when no filters applied', () => {
      const filtered = applyFilters(documents, {});
      expect(filtered).toHaveLength(documents.length);
    });
  });

  describe('applyFacetSelections', () => {
    it('should filter by facet selections with OR within facet', () => {
      const selections: FacetSelection[] = [
        { type: 'cuisine', values: ['indian', 'italian'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered.length).toBe(3);
    });

    it('should filter with AND across multiple facets', () => {
      const selections: FacetSelection[] = [
        { type: 'cuisine', values: ['indian'] },
        { type: 'dietary', values: ['vegetarian'] },
      ];

      const filtered = applyFacetSelections(documents, selections);
      expect(filtered.length).toBe(1);
      expect(filtered[0]!.id).toBe('f-3');
    });

    it('should return all when no selections', () => {
      const filtered = applyFacetSelections(documents, []);
      expect(filtered).toHaveLength(documents.length);
    });
  });
});

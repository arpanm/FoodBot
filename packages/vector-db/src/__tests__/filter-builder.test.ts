import { FilterBuilder, createFilterBuilder } from '../vector-store/filter-builder';

describe('FilterBuilder', () => {
  let builder: FilterBuilder;

  beforeEach(() => {
    builder = new FilterBuilder();
  });

  describe('match', () => {
    it('should add match condition to must', () => {
      const filter = builder.match('cuisine', 'italian').build();
      expect(filter.must).toHaveLength(1);
      expect(filter.must![0]).toEqual({
        type: 'match',
        key: 'cuisine',
        value: 'italian',
      });
    });

    it('should support boolean values', () => {
      const filter = builder.match('isVegan', true).build();
      expect(filter.must![0]).toEqual({
        type: 'match',
        key: 'isVegan',
        value: true,
      });
    });

    it('should support numeric values', () => {
      const filter = builder.match('rating', 5).build();
      expect(filter.must![0]).toEqual({
        type: 'match',
        key: 'rating',
        value: 5,
      });
    });
  });

  describe('range', () => {
    it('should add range condition with gte and lte', () => {
      const filter = builder.range('price', { gte: 10, lte: 50 }).build();
      expect(filter.must).toHaveLength(1);
      expect(filter.must![0]).toEqual({
        type: 'range',
        key: 'price',
        gte: 10,
        lte: 50,
      });
    });

    it('should support gt and lt', () => {
      const filter = builder.range('price', { gt: 0, lt: 100 }).build();
      expect(filter.must![0]).toEqual({
        type: 'range',
        key: 'price',
        gt: 0,
        lt: 100,
      });
    });
  });

  describe('keyword', () => {
    it('should add keyword condition', () => {
      const filter = builder.keyword('tags', ['spicy', 'vegetarian']).build();
      expect(filter.must).toHaveLength(1);
      expect(filter.must![0]).toEqual({
        type: 'keyword',
        key: 'tags',
        values: ['spicy', 'vegetarian'],
      });
    });
  });

  describe('geo', () => {
    it('should add geo condition', () => {
      const center = { lat: 40.7128, lon: -74.006 };
      const filter = builder.geo('location', center, 5).build();
      expect(filter.must).toHaveLength(1);
      expect(filter.must![0]).toEqual({
        type: 'geo',
        key: 'location',
        center,
        radiusKm: 5,
      });
    });
  });

  describe('must / should / must_not', () => {
    it('should add to must array', () => {
      const filter = builder
        .must({ type: 'match', key: 'a', value: 1 })
        .build();
      expect(filter.must).toHaveLength(1);
    });

    it('should add to should array', () => {
      const filter = builder
        .should({ type: 'match', key: 'a', value: 1 })
        .should({ type: 'match', key: 'b', value: 2 })
        .build();
      expect(filter.should).toHaveLength(2);
    });

    it('should add to must_not array', () => {
      const filter = builder
        .mustNot({ type: 'match', key: 'a', value: 1 })
        .build();
      expect(filter.must_not).toHaveLength(1);
    });
  });

  describe('excludeMatch', () => {
    it('should add match condition to must_not', () => {
      const filter = builder.excludeMatch('status', 'cancelled').build();
      expect(filter.must_not).toHaveLength(1);
      expect(filter.must_not![0]).toEqual({
        type: 'match',
        key: 'status',
        value: 'cancelled',
      });
    });
  });

  describe('excludeKeyword', () => {
    it('should add keyword condition to must_not', () => {
      const filter = builder
        .excludeKeyword('tags', ['expired', 'hidden'])
        .build();
      expect(filter.must_not).toHaveLength(1);
      expect(filter.must_not![0]).toEqual({
        type: 'keyword',
        key: 'tags',
        values: ['expired', 'hidden'],
      });
    });
  });

  describe('chaining', () => {
    it('should support chaining multiple conditions', () => {
      const filter = builder
        .match('cuisine', 'italian')
        .range('price', { gte: 10, lte: 30 })
        .keyword('tags', ['popular'])
        .excludeMatch('status', 'closed')
        .build();

      expect(filter.must).toHaveLength(3);
      expect(filter.must_not).toHaveLength(1);
    });
  });

  describe('build', () => {
    it('should return empty filter when no conditions added', () => {
      const filter = builder.build();
      expect(filter).toEqual({});
    });

    it('should not include empty arrays', () => {
      const filter = builder.match('a', 1).build();
      expect(filter.should).toBeUndefined();
      expect(filter.must_not).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should clear all conditions', () => {
      builder
        .match('a', 1)
        .should({ type: 'match', key: 'b', value: 2 })
        .mustNot({ type: 'match', key: 'c', value: 3 });

      builder.reset();
      const filter = builder.build();
      expect(filter).toEqual({});
    });
  });

  describe('createFilterBuilder factory', () => {
    it('should create a new FilterBuilder', () => {
      const fb = createFilterBuilder();
      expect(fb).toBeInstanceOf(FilterBuilder);
    });
  });
});

import {
  understandQuery,
  classifyIntent,
  extractEntities,
} from '../query/query-understanding';

describe('QueryUnderstanding', () => {
  describe('classifyIntent', () => {
    it('should classify food search queries', () => {
      expect(classifyIntent('chicken biryani')).toBe('food_search');
      expect(classifyIntent('pizza near me')).toBe('food_search');
      expect(classifyIntent('best pasta')).toBe('food_search');
    });

    it('should classify restaurant search queries', () => {
      expect(classifyIntent('italian restaurant')).toBe('restaurant_search');
      expect(classifyIntent('best place for pizza')).toBe('restaurant_search');
      expect(classifyIntent('nearby cafe')).toBe('restaurant_search');
      expect(classifyIntent('diner open now')).toBe('restaurant_search');
    });

    it('should classify filter command queries', () => {
      expect(classifyIntent('under 200 rupees')).toBe('filter_command');
      expect(classifyIntent('less than 30 minutes')).toBe('filter_command');
      expect(classifyIntent('rated above 4 star')).toBe('filter_command');
      expect(classifyIntent('within 5 km')).toBe('filter_command');
    });
  });

  describe('extractEntities', () => {
    it('should extract cuisine entities', () => {
      const entities = extractEntities('indian food');
      const cuisines = entities.filter((e) => e.type === 'cuisine');
      expect(cuisines.length).toBeGreaterThanOrEqual(1);
      expect(cuisines.some((e) => e.value === 'indian')).toBe(true);
    });

    it('should extract multiple cuisine entities', () => {
      const entities = extractEntities('indian or chinese food');
      const cuisines = entities.filter((e) => e.type === 'cuisine');
      expect(cuisines.some((e) => e.value === 'indian')).toBe(true);
      expect(cuisines.some((e) => e.value === 'chinese')).toBe(true);
    });

    it('should extract dietary entities', () => {
      const entities = extractEntities('vegetarian pizza');
      const dietary = entities.filter((e) => e.type === 'dietary');
      expect(dietary.some((e) => e.value === 'vegetarian')).toBe(true);
    });

    it('should extract vegan dietary entity', () => {
      const entities = extractEntities('vegan burger');
      const dietary = entities.filter((e) => e.type === 'dietary');
      expect(dietary.some((e) => e.value === 'vegan')).toBe(true);
    });

    it('should extract gluten-free dietary entity', () => {
      const entities = extractEntities('gluten free pasta');
      const dietary = entities.filter((e) => e.type === 'dietary');
      expect(dietary.some((e) => e.value === 'gluten-free')).toBe(true);
    });

    it('should extract price range entities', () => {
      const entities = extractEntities('cheap food');
      const prices = entities.filter((e) => e.type === 'price_range');
      expect(prices.some((e) => e.value === 'cheap')).toBe(true);
    });

    it('should extract dish entities', () => {
      const entities = extractEntities('chicken biryani');
      const dishes = entities.filter((e) => e.type === 'dish');
      expect(dishes.some((e) => e.value === 'biryani')).toBe(true);
    });

    it('should extract multiple dish entities', () => {
      const entities = extractEntities('pizza and burger');
      const dishes = entities.filter((e) => e.type === 'dish');
      expect(dishes.some((e) => e.value === 'pizza')).toBe(true);
      expect(dishes.some((e) => e.value === 'burger')).toBe(true);
    });

    it('should return empty array for ambiguous query', () => {
      const entities = extractEntities('something good');
      expect(entities.length).toBe(0);
    });

    it('should have confidence scores between 0 and 1', () => {
      const entities = extractEntities('indian biryani');
      for (const entity of entities) {
        expect(entity.confidence).toBeGreaterThan(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('understandQuery', () => {
    it('should produce full query understanding', () => {
      const result = understandQuery('vegetarian indian restaurant', [
        'vegetarian',
        'indian',
        'restaurant',
      ]);

      expect(result.intent).toBe('restaurant_search');
      expect(result.normalizedQuery).toBe('vegetarian indian restaurant');
      expect(result.expandedTerms).toEqual([
        'vegetarian',
        'indian',
        'restaurant',
      ]);
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should include intent, entities, and expanded terms', () => {
      const result = understandQuery('cheap pizza', ['cheap', 'pizza']);

      expect(result.intent).toBe('food_search');
      expect(result.entities.some((e) => e.type === 'price_range')).toBe(true);
      expect(result.entities.some((e) => e.type === 'dish')).toBe(true);
      expect(result.expandedTerms).toEqual(['cheap', 'pizza']);
    });
  });
});

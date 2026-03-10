import { Autocompleter } from '../query/autocompleter';

describe('Autocompleter', () => {
  let autocompleter: Autocompleter;

  beforeEach(() => {
    autocompleter = new Autocompleter();
    autocompleter.addTerm('pizza', 50);
    autocompleter.addTerm('pasta', 40);
    autocompleter.addTerm('pad thai', 30);
    autocompleter.addTerm('paneer tikka', 25);
    autocompleter.addTerm('paratha', 20);
    autocompleter.addTerm('burger', 45);
    autocompleter.addTerm('biryani', 60);
    autocompleter.addTerm('butter chicken', 55);
  });

  describe('prefix suggestions', () => {
    it('should suggest items matching prefix "pi"', () => {
      const result = autocompleter.suggest('pi');
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestions.some((s) => s.text === 'pizza')).toBe(true);
    });

    it('should suggest items matching prefix "pa"', () => {
      const result = autocompleter.suggest('pa');
      const texts = result.suggestions.map((s) => s.text);
      expect(texts).toContain('pasta');
      expect(texts).toContain('pad thai');
      expect(texts).toContain('paneer tikka');
      expect(texts).toContain('paratha');
    });

    it('should suggest items matching prefix "b"', () => {
      const result = autocompleter.suggest('b');
      const texts = result.suggestions.map((s) => s.text);
      expect(texts).toContain('burger');
      expect(texts).toContain('biryani');
      expect(texts).toContain('butter chicken');
    });

    it('should return empty for non-matching prefix', () => {
      const result = autocompleter.suggest('xyz');
      expect(result.suggestions).toHaveLength(0);
    });

    it('should respect limit parameter', () => {
      const result = autocompleter.suggest('p', 2);
      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should be case insensitive', () => {
      const result = autocompleter.suggest('PI');
      expect(result.suggestions.some((s) => s.text === 'pizza')).toBe(true);
    });
  });

  describe('popular suggestions', () => {
    it('should mark high-popularity items as popular', () => {
      const result = autocompleter.suggest('bi');
      const biryaniSuggestion = result.suggestions.find(
        (s) => s.text === 'biryani'
      );
      expect(biryaniSuggestion).toBeDefined();
      expect(biryaniSuggestion!.source).toBe('popular');
    });

    it('should sort popular items by score descending', () => {
      const result = autocompleter.suggest('b');
      expect(result.suggestions[0]!.score).toBeGreaterThanOrEqual(
        result.suggestions[result.suggestions.length - 1]!.score
      );
    });
  });

  describe('personalized suggestions', () => {
    it('should return personalized suggestions from user history', () => {
      autocompleter.addUserHistory('user-1', 'pizza margherita');
      autocompleter.addUserHistory('user-1', 'pizza pepperoni');

      const result = autocompleter.suggest('pizza', 10, 'user-1');
      const personalized = result.suggestions.filter(
        (s) => s.source === 'personalized'
      );
      expect(personalized.length).toBeGreaterThanOrEqual(1);
    });

    it('should not return personalized suggestions for unknown user', () => {
      const result = autocompleter.suggest('pizza', 10, 'unknown-user');
      const personalized = result.suggestions.filter(
        (s) => s.source === 'personalized'
      );
      expect(personalized).toHaveLength(0);
    });

    it('should not return personalized suggestions when no userId', () => {
      autocompleter.addUserHistory('user-1', 'pizza margherita');
      const result = autocompleter.suggest('pizza');
      const personalized = result.suggestions.filter(
        (s) => s.source === 'personalized'
      );
      expect(personalized).toHaveLength(0);
    });

    it('should deduplicate personalized and prefix suggestions', () => {
      autocompleter.addUserHistory('user-1', 'pizza');
      const result = autocompleter.suggest('pizza', 10, 'user-1');
      const pizzaCount = result.suggestions.filter(
        (s) => s.text === 'pizza'
      ).length;
      expect(pizzaCount).toBe(1);
    });
  });

  describe('addTerm', () => {
    it('should allow adding new terms after initialization', () => {
      autocompleter.addTerm('quesadilla', 15);
      const result = autocompleter.suggest('que');
      expect(result.suggestions.some((s) => s.text === 'quesadilla')).toBe(true);
    });
  });
});

/**
 * Intent Detection Service Unit Tests
 */

import { intentDetectionService } from '../intent-detection.service';

describe('IntentDetectionService', () => {
  describe('Greeting Detection', () => {
    it('should detect "hello" as greeting', () => {
      const intent = intentDetectionService.detectIntent('hello');
      expect(intent.type).toBe('greeting');
      expect(intent.confidence).toBeGreaterThan(0.9);
    });

    it('should detect "hi" as greeting', () => {
      const intent = intentDetectionService.detectIntent('hi');
      expect(intent.type).toBe('greeting');
    });

    it('should detect "good morning" as greeting', () => {
      const intent = intentDetectionService.detectIntent('good morning');
      expect(intent.type).toBe('greeting');
    });

    it('should be case insensitive', () => {
      const intent = intentDetectionService.detectIntent('HELLO');
      expect(intent.type).toBe('greeting');
    });
  });

  describe('Help Detection', () => {
    it('should detect "help" as help request', () => {
      const intent = intentDetectionService.detectIntent('help');
      expect(intent.type).toBe('help');
    });

    it('should detect "what can you do"', () => {
      const intent = intentDetectionService.detectIntent('what can you do');
      expect(intent.type).toBe('help');
    });

    it('should detect "how do i"', () => {
      const intent = intentDetectionService.detectIntent('how do i order food');
      expect(intent.type).toBe('help');
    });
  });

  describe('Restaurant Search Detection', () => {
    it('should detect "order pizza"', () => {
      const intent = intentDetectionService.detectIntent('order pizza');
      expect(intent.type).toBe('search_restaurant');
    });

    it('should detect "find restaurants"', () => {
      const intent = intentDetectionService.detectIntent('find restaurants');
      expect(intent.type).toBe('search_restaurant');
    });

    it('should detect "want biryani"', () => {
      const intent = intentDetectionService.detectIntent('I want biryani');
      expect(intent.type).toBe('search_restaurant');
    });

    it('should detect "hungry"', () => {
      const intent = intentDetectionService.detectIntent('I am hungry');
      expect(intent.type).toBe('search_restaurant');
    });

    it('should detect cuisine types', () => {
      const intents = [
        'chinese food',
        'indian restaurant',
        'italian cuisine',
      ].map((msg) => intentDetectionService.detectIntent(msg));

      intents.forEach((intent) => {
        expect(intent.type).toBe('search_restaurant');
      });
    });
  });

  describe('Dish Search Detection', () => {
    it('should detect "show menu"', () => {
      const intent = intentDetectionService.detectIntent('show menu');
      expect(intent.type).toBe('search_dish');
    });

    it('should detect "vegetarian dishes"', () => {
      const intent = intentDetectionService.detectIntent('vegetarian dishes');
      expect(intent.type).toBe('search_dish');
    });

    it('should detect "vegan options"', () => {
      const intent = intentDetectionService.detectIntent('vegan options');
      expect(intent.type).toBe('search_dish');
    });

    it('should detect "gluten-free"', () => {
      const intent = intentDetectionService.detectIntent('gluten-free dishes');
      expect(intent.type).toBe('search_dish');
    });
  });

  describe('Order Tracking Detection', () => {
    it('should detect "track order"', () => {
      const intent = intentDetectionService.detectIntent('track my order');
      expect(intent.type).toBe('track_order');
    });

    it('should detect "where is my order"', () => {
      const intent = intentDetectionService.detectIntent('where is my order');
      expect(intent.type).toBe('track_order');
    });

    it('should detect "order status"', () => {
      const intent = intentDetectionService.detectIntent('check order status');
      expect(intent.type).toBe('track_order');
    });

    it('should detect "when will it arrive"', () => {
      const intent = intentDetectionService.detectIntent('when will my food arrive');
      expect(intent.type).toBe('track_order');
    });
  });

  describe('Order History Detection', () => {
    it('should detect "order history"', () => {
      const intent = intentDetectionService.detectIntent('show order history');
      expect(intent.type).toBe('get_order_history');
    });

    it('should detect "past orders"', () => {
      const intent = intentDetectionService.detectIntent('my past orders');
      expect(intent.type).toBe('get_order_history');
    });

    it('should detect "previous orders"', () => {
      const intent = intentDetectionService.detectIntent('previous orders');
      expect(intent.type).toBe('get_order_history');
    });
  });

  describe('Query Extraction', () => {
    it('should extract query from "order pizza"', () => {
      const intent = intentDetectionService.detectIntent('order pizza');
      expect(intent.query).toBe('pizza');
    });

    it('should extract query from "find biryani restaurants"', () => {
      const intent = intentDetectionService.detectIntent('find biryani restaurants');
      expect(intent.query).toContain('biryani');
    });

    it('should remove action words', () => {
      const intent = intentDetectionService.detectIntent('I want to order pizza');
      expect(intent.query).not.toContain('want');
      expect(intent.query).not.toContain('order');
    });

    it('should handle complex queries', () => {
      const intent = intentDetectionService.detectIntent(
        'Find me some good Italian restaurants'
      );
      expect(intent.query).toContain('Italian');
      expect(intent.query).toContain('restaurants');
    });
  });

  describe('Platform Extraction', () => {
    it('should extract Swiggy platform', () => {
      const intent = intentDetectionService.detectIntent('order from Swiggy');
      expect(intent.platform).toBe('swiggy');
    });

    it('should extract Zomato platform', () => {
      const intent = intentDetectionService.detectIntent('find on Zomato');
      expect(intent.platform).toBe('zomato');
    });

    it('should default to mock platform', () => {
      const intent = intentDetectionService.detectIntent('order pizza');
      expect(intent.platform).toBe('mock');
    });

    it('should be case insensitive', () => {
      const intent1 = intentDetectionService.detectIntent('order from SWIGGY');
      const intent2 = intentDetectionService.detectIntent('order from swiggy');
      expect(intent1.platform).toBe(intent2.platform);
    });
  });

  describe('Location Extraction', () => {
    it('should extract location from "near Koramangala"', () => {
      const intent = intentDetectionService.detectIntent(
        'Find restaurants near Koramangala'
      );
      expect(intent.location).toBe('Koramangala');
    });

    it('should extract location from "in Bangalore"', () => {
      const intent = intentDetectionService.detectIntent(
        'Order pizza in Bangalore'
      );
      expect(intent.location).toBe('Bangalore');
    });

    it('should extract location from "at HSR Layout"', () => {
      const intent = intentDetectionService.detectIntent(
        'Find food at HSR Layout'
      );
      expect(intent.location).toBe('HSR Layout');
    });

    it('should return undefined if no location', () => {
      const intent = intentDetectionService.detectIntent('Order pizza');
      expect(intent.location).toBeUndefined();
    });
  });

  describe('Unknown Intent', () => {
    it('should detect unknown for gibberish', () => {
      const intent = intentDetectionService.detectIntent('xyz123abc');
      expect(intent.type).toBe('unknown');
      expect(intent.confidence).toBe(0.0);
    });

    it('should detect unknown for random text', () => {
      const intent = intentDetectionService.detectIntent('asdfghjkl');
      expect(intent.type).toBe('unknown');
    });
  });

  describe('Response Templates', () => {
    it('should have greeting template', () => {
      const template = intentDetectionService.getResponseTemplate({
        type: 'greeting',
        confidence: 0.95,
      });
      expect(template).toContain('FoodBot assistant');
    });

    it('should have help template', () => {
      const template = intentDetectionService.getResponseTemplate({
        type: 'help',
        confidence: 0.95,
      });
      expect(template).toContain('Search for restaurants');
    });

    it('should have search restaurant template', () => {
      const template = intentDetectionService.getResponseTemplate({
        type: 'search_restaurant',
        query: 'pizza',
        platform: 'swiggy',
        confidence: 0.85,
      });
      expect(template).toContain('pizza');
      expect(template).toContain('swiggy');
    });

    it('should have unknown template', () => {
      const template = intentDetectionService.getResponseTemplate({
        type: 'unknown',
        confidence: 0.0,
      });
      expect(template).toContain("didn't understand");
    });
  });

  describe('Confidence Scores', () => {
    it('should have high confidence for greetings', () => {
      const intent = intentDetectionService.detectIntent('hello');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have high confidence for help', () => {
      const intent = intentDetectionService.detectIntent('help');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have good confidence for restaurant search', () => {
      const intent = intentDetectionService.detectIntent('find pizza');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should have zero confidence for unknown', () => {
      const intent = intentDetectionService.detectIntent('xyz123');
      expect(intent.confidence).toBe(0.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const intent = intentDetectionService.detectIntent('');
      expect(intent.type).toBe('unknown');
    });

    it('should handle whitespace only', () => {
      const intent = intentDetectionService.detectIntent('   ');
      expect(intent.type).toBe('unknown');
    });

    it('should handle very long messages', () => {
      const longMessage = 'I want to order ' + 'pizza '.repeat(100);
      const intent = intentDetectionService.detectIntent(longMessage);
      expect(intent.type).toBe('search_restaurant');
    });

    it('should handle special characters', () => {
      const intent = intentDetectionService.detectIntent('find pizza!!!');
      expect(intent.type).toBe('search_restaurant');
    });

    it('should handle mixed case', () => {
      const intent = intentDetectionService.detectIntent('FiNd PiZzA');
      expect(intent.type).toBe('search_restaurant');
    });
  });
});

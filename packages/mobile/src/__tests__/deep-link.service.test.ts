import { DeepLinkService } from '../deep-link/deep-link.service';

describe('DeepLinkService', () => {
  let service: DeepLinkService;

  beforeEach(() => {
    service = new DeepLinkService();
  });

  describe('onDeepLink', () => {
    it('should invoke handler when deep link is simulated', () => {
      const handler = jest.fn();
      service.onDeepLink(handler);

      service.simulateDeepLink('foodbot://app.foodbot.com/order/123');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        path: '/order/123',
        params: { id: '123' },
      });
    });

    it('should invoke multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.onDeepLink(handler1);
      service.onDeepLink(handler2);

      service.simulateDeepLink('foodbot://app.foodbot.com/order/456');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe handler', () => {
      const handler = jest.fn();
      const unsubscribe = service.onDeepLink(handler);

      unsubscribe();
      service.simulateDeepLink('foodbot://app.foodbot.com/order/123');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should track handler count', () => {
      expect(service.getHandlerCount()).toBe(0);

      const unsub1 = service.onDeepLink(jest.fn());
      expect(service.getHandlerCount()).toBe(1);

      service.onDeepLink(jest.fn());
      expect(service.getHandlerCount()).toBe(2);

      unsub1();
      expect(service.getHandlerCount()).toBe(1);
    });
  });

  describe('parseDeepLink', () => {
    it('should parse order deep link', () => {
      const result = service.parseDeepLink(
        'foodbot://app.foodbot.com/order/order-123'
      );

      expect(result.path).toBe('/order/order-123');
      expect(result.params).toEqual({ id: 'order-123' });
    });

    it('should parse restaurant deep link', () => {
      const result = service.parseDeepLink(
        'foodbot://app.foodbot.com/restaurant/rest-456'
      );

      expect(result.path).toBe('/restaurant/rest-456');
      expect(result.params).toEqual({ id: 'rest-456' });
    });

    it('should parse diet-plan deep link', () => {
      const result = service.parseDeepLink(
        'foodbot://app.foodbot.com/diet-plan/plan-789'
      );

      expect(result.path).toBe('/diet-plan/plan-789');
      expect(result.params).toEqual({ id: 'plan-789' });
    });

    it('should parse party-plan deep link', () => {
      const result = service.parseDeepLink(
        'foodbot://app.foodbot.com/party-plan/party-101'
      );

      expect(result.path).toBe('/party-plan/party-101');
      expect(result.params).toEqual({ id: 'party-101' });
    });

    it('should parse https deep link', () => {
      const result = service.parseDeepLink(
        'https://app.foodbot.com/order/order-123'
      );

      expect(result.path).toBe('/order/order-123');
      expect(result.params).toEqual({ id: 'order-123' });
    });

    it('should parse http deep link', () => {
      const result = service.parseDeepLink(
        'http://app.foodbot.com/restaurant/rest-456'
      );

      expect(result.path).toBe('/restaurant/rest-456');
      expect(result.params).toEqual({ id: 'rest-456' });
    });

    it('should parse bare path deep link', () => {
      const result = service.parseDeepLink('/order/order-123');

      expect(result.path).toBe('/order/order-123');
      expect(result.params).toEqual({ id: 'order-123' });
    });

    it('should return empty params for unknown route', () => {
      const result = service.parseDeepLink(
        'foodbot://app.foodbot.com/unknown/path'
      );

      expect(result.path).toBe('/unknown/path');
      expect(result.params).toEqual({});
    });

    it('should handle root path', () => {
      const result = service.parseDeepLink('foodbot://app.foodbot.com');

      expect(result.path).toBe('/');
      expect(result.params).toEqual({});
    });

    it('should handle path without leading slash', () => {
      const result = service.parseDeepLink('order/123');

      expect(result.path).toBe('/order/123');
      expect(result.params).toEqual({ id: '123' });
    });
  });

  describe('buildDeepLink', () => {
    it('should build order deep link', () => {
      const result = service.buildDeepLink('/order/:id', { id: 'order-123' });

      expect(result).toBe('foodbot://app.foodbot.com/order/order-123');
    });

    it('should build restaurant deep link', () => {
      const result = service.buildDeepLink('/restaurant/:id', {
        id: 'rest-456',
      });

      expect(result).toBe('foodbot://app.foodbot.com/restaurant/rest-456');
    });

    it('should build diet-plan deep link', () => {
      const result = service.buildDeepLink('/diet-plan/:id', {
        id: 'plan-789',
      });

      expect(result).toBe('foodbot://app.foodbot.com/diet-plan/plan-789');
    });

    it('should build party-plan deep link', () => {
      const result = service.buildDeepLink('/party-plan/:id', {
        id: 'party-101',
      });

      expect(result).toBe('foodbot://app.foodbot.com/party-plan/party-101');
    });

    it('should handle empty params', () => {
      const result = service.buildDeepLink('/menu', {});

      expect(result).toBe('foodbot://app.foodbot.com/menu');
    });
  });
});

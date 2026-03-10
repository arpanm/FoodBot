/**
 * Integration tests for MCP Protocol Client
 */

import { MCPClient } from '../src/mcp/MCPClient.js';
import type { Restaurant, Menu, OrderRequest } from '../src/types/provider.types.js';

describe('MCPClient Integration Tests', () => {
  let mcpClient: MCPClient;

  beforeEach(() => {
    mcpClient = new MCPClient({
      baseUrl: 'https://mcp.example.com',
      apiKey: 'test-api-key',
      timeout: 5000,
      maxRetries: 2,
      provider: 'mock',
    });
  });

  describe('Basic MCP Protocol', () => {
    it('should make successful MCP call', async () => {
      const mockRestaurants: Restaurant[] = [
        {
          id: 'rest-1',
          externalId: 'ext-1',
          provider: 'mock',
          name: 'Test Restaurant',
          imageUrl: 'https://example.com/image.jpg',
          address: '123 Main St',
          cuisines: ['Italian'],
          rating: 4.5,
          reviewCount: 100,
          deliveryTimeMinutes: 30,
          distanceKm: 2.5,
          priceRange: 2,
          isOpen: true,
          isAvailable: true,
          offers: [],
          operatingHours: null,
          location: { lat: 12.9716, lng: 77.5946 },
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: mockRestaurants,
          id: 'test-request-id',
        }),
      });

      const result = await mcpClient.searchRestaurants({
        query: 'pizza',
        location: { lat: 12.9716, lng: 77.5946 },
      });

      expect(result).toEqual(mockRestaurants);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mcp.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle MCP protocol errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid request',
            data: { details: 'Missing required parameter' },
          },
          id: 'test-request-id',
        }),
      });

      await expect(
        mcpClient.searchRestaurants({
          query: 'pizza',
          location: { lat: 12.9716, lng: 77.5946 },
        })
      ).rejects.toThrow('MCP protocol error');
    });

    it('should handle HTTP errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error occurred',
      });

      await expect(
        mcpClient.searchRestaurants({
          query: 'pizza',
          location: { lat: 12.9716, lng: 77.5946 },
        })
      ).rejects.toThrow('MCP server returned error');
    });

    it('should handle request timeout', async () => {
      const slowClient = new MCPClient({
        baseUrl: 'https://mcp.example.com',
        timeout: 100,
        maxRetries: 1,
        provider: 'mock',
      });

      global.fetch = jest.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve({ ok: true }), 1000);
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                const abortError = new Error('The operation was aborted');
                abortError.name = 'AbortError';
                reject(abortError);
              });
            }
          })
      );

      await expect(
        slowClient.searchRestaurants({
          query: 'pizza',
          location: { lat: 12.9716, lng: 77.5946 },
        })
      ).rejects.toThrow('timeout');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      let callCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => 'Temporary error',
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            jsonrpc: '2.0',
            result: [],
            id: 'test-id',
          }),
        });
      });

      const result = await mcpClient.searchRestaurants({
        query: 'pizza',
        location: { lat: 12.9716, lng: 77.5946 },
      });

      expect(callCount).toBe(2);
      expect(result).toEqual([]);
    });

    it('should fail after max retries', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Persistent error',
      });

      await expect(
        mcpClient.searchRestaurants({
          query: 'pizza',
          location: { lat: 12.9716, lng: 77.5946 },
        })
      ).rejects.toThrow('failed after 2 attempts');
    });
  });

  describe('MCP Tool Methods', () => {
    it('should get restaurant menu', async () => {
      const mockMenu: Menu = {
        restaurantId: 'rest-1',
        restaurantName: 'Test Restaurant',
        categories: [],
        lastUpdated: new Date().toISOString(),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: mockMenu,
          id: 'test-id',
        }),
      });

      const result = await mcpClient.getMenu('rest-1');

      expect(result).toEqual(mockMenu);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('tools/getMenu'),
        })
      );
    });

    it('should place order', async () => {
      const orderRequest: OrderRequest = {
        userId: 'user-123',
        restaurantId: 'rest-1',
        items: [
          {
            dishId: 'dish-1',
            quantity: 2,
            customizations: [],
            specialInstructions: '',
          },
        ],
        deliveryAddress: {
          addressLine1: '123 Main St',
          addressLine2: '',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          location: { lat: 12.9716, lng: 77.5946 },
          label: 'Home',
        },
        paymentMethod: 'card',
        notes: '',
      };

      const mockOrderResponse = {
        orderId: 'order-123',
        status: 'placed' as const,
        estimatedDeliveryMinutes: 30,
        totalAmount: 500,
        currency: 'INR' as const,
        trackingUrl: 'https://track.example.com/order-123',
        message: 'Order placed successfully',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: mockOrderResponse,
          id: 'test-id',
        }),
      });

      const result = await mcpClient.placeOrder(orderRequest);

      expect(result).toEqual(mockOrderResponse);
    });

    it('should check restaurant availability', async () => {
      const mockAvailability = {
        available: true,
        estimatedDeliveryMinutes: 30,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: mockAvailability,
          id: 'test-id',
        }),
      });

      const result = await mcpClient.checkAvailability('rest-1');

      expect(result).toEqual(mockAvailability);
    });

    it('should perform health check', async () => {
      const mockHealth = {
        status: 'ok',
        version: '1.0.0',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: mockHealth,
          id: 'test-id',
        }),
      });

      const result = await mcpClient.healthCheck();

      expect(result).toEqual(mockHealth);
    });
  });
});

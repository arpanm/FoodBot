/**
 * Jest Unit Test Setup
 * Runs before all unit tests
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase test timeout for all tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // Errors should always be visible
  error: console.error,
};

// Global test utilities
global.testUtils = {
  // Add global test utilities here
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock user ID for tests
  mockUserId: 'test-user-123',

  // Mock correlation ID
  mockCorrelationId: 'test-correlation-456',
};

// Jest matchers extensions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },

  toBeValidISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date`
          : `expected ${received} to be a valid ISO date`,
    };
  },
});

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections, cleanup resources
  await new Promise(resolve => setTimeout(resolve, 500));
});

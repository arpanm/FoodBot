/**
 * Jest Integration Test Setup
 * Runs before all integration tests
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';

// Longer timeout for integration tests
jest.setTimeout(30000);

// Test containers setup (if using testcontainers)
// import { startTestContainers, stopTestContainers } from './testcontainers';

// Global setup before all tests
beforeAll(async () => {
  console.warn('🧪 Starting integration test environment...');

  // Start test containers (Redis, Postgres, etc.)
  // await startTestContainers();

  // Wait for services to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.warn('✅ Integration test environment ready');
});

// Global cleanup after all tests
// eslint-disable-next-line @typescript-eslint/require-await
afterAll(async () => {
  console.warn('🧹 Cleaning up integration test environment...');

  // Stop test containers
  // await stopTestContainers();

  console.warn('✅ Integration test environment cleaned up');
});

// Cleanup between tests
afterEach(() => {
  // Clear database, reset state, etc.
});

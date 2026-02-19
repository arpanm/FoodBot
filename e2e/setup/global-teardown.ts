import { FullConfig } from '@playwright/test';

/**
 * Global teardown runs once after all tests complete
 * Cleans up test environment and resources
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('\n🧹 Starting E2E Test Global Teardown...');

  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  // Clean up test database
  console.log('🗄️  Cleaning up test database...');
  await cleanupTestDatabase();

  // Clean up test files and artifacts
  console.log('📁 Cleaning up test artifacts...');
  await cleanupTestArtifacts();

  console.log('✅ Global Teardown Complete\n');
}

async function cleanupTestDatabase(): Promise<void> {
  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  try {
    // Call cleanup endpoint if available
    const response = await fetch(`${gatewayUrl}/test/cleanup`, {
      method: 'POST',
    });

    if (response.ok) {
      console.log('✅ Test database cleaned up');
    }
  } catch (error) {
    console.warn('⚠️  Test database cleanup endpoint not available, skipping...');
  }
}

async function cleanupTestArtifacts(): Promise<void> {
  // Clean up temporary files, downloads, etc.
  // This is handled by Playwright's outputDir cleanup
  console.log('✅ Test artifacts will be preserved in test-results/');
}

export default globalTeardown;

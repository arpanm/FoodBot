import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup runs once before all tests
 * Sets up test environment, databases, and initial state
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🚀 Starting E2E Test Global Setup...');

  const { baseURL } = config.projects[0]?.use ?? {};
  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  // Wait for services to be ready
  console.log('⏳ Waiting for services to be ready...');
  await waitForService(gatewayUrl, 'Gateway API');
  await waitForService(baseURL || 'http://localhost:3001', 'Customer App');

  // Set up test database
  console.log('🗄️  Setting up test database...');
  await setupTestDatabase();

  // Create test users and data
  console.log('👤 Creating test users and data...');
  await createTestUsers();

  // Set up Chrome Extension (if needed)
  console.log('🧩 Building Chrome Extension...');
  await buildChromeExtension();

  console.log('✅ Global Setup Complete\n');
}

async function waitForService(url: string, name: string): Promise<void> {
  const maxRetries = 30;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        console.log(`✅ ${name} is ready at ${url}`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }

    if (i < maxRetries - 1) {
      console.log(`⏳ Waiting for ${name} (attempt ${i + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`❌ ${name} failed to start at ${url}`);
}

async function setupTestDatabase(): Promise<void> {
  // This would typically:
  // 1. Run database migrations
  // 2. Seed test data
  // 3. Clear any existing test data

  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  try {
    // Call setup endpoint if available
    const response = await fetch(`${gatewayUrl}/test/setup`, {
      method: 'POST',
    });

    if (response.ok) {
      console.log('✅ Test database setup complete');
    }
  } catch (error) {
    console.warn('⚠️  Test database setup endpoint not available, skipping...');
  }
}

async function createTestUsers(): Promise<void> {
  const gatewayUrl = process.env.GATEWAY_API_URL || 'http://localhost:3000';

  const testUsers = [
    {
      email: 'test.user@example.com',
      password: 'Test123!@#',
      name: 'Test User',
      role: 'customer',
    },
    {
      email: 'admin@example.com',
      password: 'Admin123!@#',
      name: 'Admin User',
      role: 'admin',
    },
  ];

  for (const user of testUsers) {
    try {
      await fetch(`${gatewayUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
    } catch (error) {
      // User might already exist, continue
    }
  }

  console.log(`✅ Created ${testUsers.length} test users`);
}

async function buildChromeExtension(): Promise<void> {
  // Check if extension dist exists
  const { execSync } = await import('child_process');

  try {
    execSync('cd chrome-extension && npm run build', {
      stdio: 'inherit',
    });
    console.log('✅ Chrome Extension built successfully');
  } catch (error) {
    console.warn('⚠️  Chrome Extension build failed, tests may fail');
  }
}

export default globalSetup;

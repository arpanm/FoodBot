/** @type {import('jest').Config} */
module.exports = {
  // Use different projects for different types of tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/*.test.ts', '**/*.test.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.next/', '/e2e/'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@foodbot/(.*)$': '<rootDir>/packages/$1/src',
        '^@apps/(.*)$': '<rootDir>/apps/$1/src',
        '^@services/(.*)$': '<rootDir>/services/$1/src',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          },
        ],
      },
      collectCoverageFrom: [
        'apps/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'packages/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/build/**',
        '!**/*.test.{ts,tsx}',
        '!**/*.spec.{ts,tsx}',
        '!**/index.ts',
        '!**/*.generated.ts',
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      coverageDirectory: '<rootDir>/coverage/unit',
    },
    {
      displayName: 'integration',
      testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.next/', '/e2e/'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup/jest.integration.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@foodbot/(.*)$': '<rootDir>/packages/$1/src',
        '^@apps/(.*)$': '<rootDir>/apps/$1/src',
        '^@services/(.*)$': '<rootDir>/services/$1/src',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.integration.json',
          },
        ],
      },
      coverageDirectory: '<rootDir>/coverage/integration',
    },
  ],

  // Global settings
  verbose: true,
  bail: false, // Continue running tests even if one fails
  maxWorkers: '50%', // Use half of available CPU cores

  // Watch mode settings
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/'],

  // Global test timeout
  testTimeout: 10000,

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'json', 'html', 'json-summary'],

  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Notify on test completion (disabled for compatibility)
  notify: false,
};

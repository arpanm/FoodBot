/**
 * Temporal Workflow Testing Environment
 * Utilities for testing Temporal workflows and activities
 */

import { WorkflowCoverage } from '@temporalio/nyc-test-coverage';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { DefaultLogger, Runtime, Worker } from '@temporalio/worker';

/**
 * Temporal Test Environment Wrapper
 */
export class TemporalTestEnv {
  private static instance: TestWorkflowEnvironment | null = null;
  private static coverage: WorkflowCoverage | null = null;

  /**
   * Get or create test environment
   */
  static async getTestEnvironment(): Promise<TestWorkflowEnvironment> {
    if (!this.instance) {
      // Enable time skipping for faster tests
      this.instance = await TestWorkflowEnvironment.createTimeSkipping();
    }
    return this.instance;
  }

  /**
   * Create a test worker
   */
  static async createTestWorker(
    testEnv: TestWorkflowEnvironment,
    options: {
      workflowsPath: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activities?: Record<string, (...args: any[]) => any>;
      taskQueue?: string;
    }
  ): Promise<Worker> {
    const { workflowsPath, activities = {}, taskQueue = 'test-queue' } = options;

     
    return await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities,
      enableSDKTracing: true,
    });
  }

  /**
   * Initialize workflow coverage tracking
   */
  static initializeCoverage(): void {
    if (!this.coverage) {
      this.coverage = new WorkflowCoverage();
       
      Runtime.install({
         
        logger: new DefaultLogger('WARN'),
        telemetryOptions: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tracingFilter: this.coverage.tracingFilter,
        },
      });
    }
  }

  /**
   * Generate coverage report
   */
  static async generateCoverageReport(): Promise<void> {
    if (this.coverage) {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await this.coverage.mergeIntoGlobalCoverage();
    }
  }

  /**
   * Cleanup test environment
   */
  static async cleanup(): Promise<void> {
    if (this.instance) {
      await this.instance.teardown();
      this.instance = null;
    }

    if (this.coverage) {
      await this.generateCoverageReport();
      this.coverage = null;
    }
  }
}

/**
 * Jest helpers for Temporal testing
 */
export const temporalTestHelpers = {
  /**
   * Create a mock activity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockActivity: <T extends (...args: any[]) => any>(
    name: string,
    implementation?: T
  ): jest.MockedFunction<T> => {
    return jest.fn(implementation) as jest.MockedFunction<T>;
  },

  /**
   * Wait for workflow to complete with timeout
   */
  waitForWorkflow: async <T>(
    workflowHandle: { result: () => Promise<T> },
    timeoutMs: number = 10000
  ): Promise<T> => {
    return Promise.race([
      workflowHandle.result(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Workflow timeout')), timeoutMs)
      ),
    ]);
  },

  /**
   * Create test workflow input
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createWorkflowInput: <T extends Record<string, any>>(overrides?: Partial<T>): T => {
    return {
      userId: 'test-user-123',
      correlationId: 'test-correlation-456',
      timestamp: new Date().toISOString(),
      ...overrides,
    } as T;
  },
};

/**
 * Temporal test fixture builder
 */
export class TemporalTestFixture {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activities: Record<string, jest.MockedFunction<any>> = {};

  /**
   * Add mock activity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addActivity<T extends (...args: any[]) => any>(name: string, implementation?: T): this {
    this.activities[name] = temporalTestHelpers.mockActivity(name, implementation);
    return this;
  }

  /**
   * Get activities
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActivities(): Record<string, jest.MockedFunction<any>> {
    return this.activities;
  }

  /**
   * Reset all activity mocks
   */
  reset(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    Object.values(this.activities).forEach(mock => mock.mockReset());
  }

  /**
   * Clear all activity mocks
   */
  clear(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    Object.values(this.activities).forEach(mock => mock.mockClear());
  }
}

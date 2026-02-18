/**
 * Temporal Test Helpers
 *
 * Utility functions for setting up and managing Temporal test environments
 */

import { WorkflowFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import type { LogEntry } from '@temporalio/worker';
import { Worker, DefaultLogger } from '@temporalio/worker';

export interface TestEnvConfig {
  workflowsPath?: string;
  activities?: Record<string, (...args: any[]) => any>;
  taskQueue?: string;
}

export class TemporalTestHelper {
  private testEnv: TestWorkflowEnvironment | null = null;
  private worker: Worker | null = null;

  /**
   * Create and initialize a local test environment
   */
  async createTestEnvironment(): Promise<TestWorkflowEnvironment> {
    this.testEnv = await TestWorkflowEnvironment.createLocal({
      testServer: {
        stdio: 'ignore',
      },
    });
    return this.testEnv;
  }

  /**
   * Create a worker for testing
   */
  async createWorker(config: TestEnvConfig): Promise<Worker> {
    if (!this.testEnv) {
      throw new Error('Test environment not initialized');
    }

    const { nativeConnection } = this.testEnv;

    this.worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: config.taskQueue || 'test',
      workflowsPath: config.workflowsPath || require.resolve('../workflows'),
      activities: config.activities || {},
      dataConverter: {
        payloadConverterPath: require.resolve('./payload-converter'),
      },
    });

    return this.worker;
  }

  /**
   * Run a workflow with the test worker
   */
  async runWorkflow<T>(
    workflowFn: (...args: any[]) => Promise<T>,
    args: any[],
    config: TestEnvConfig = {}
  ): Promise<T> {
    if (!this.testEnv) {
      throw new Error('Test environment not initialized');
    }

    const { client, nativeConnection } = this.testEnv;
    const taskQueue = config.taskQueue || 'test';

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue,
      workflowsPath: config.workflowsPath || require.resolve('../workflows'),
      activities: config.activities || {},
    });

    return await worker.runUntil(async () => {
      const handle = await client.workflow.start(workflowFn, {
        workflowId: `test-${Date.now()}-${Math.random()}`,
        taskQueue,
        args,
      });

      return await handle.result();
    });
  }

  /**
   * Execute a workflow and expect it to fail
   */
  async expectWorkflowToFail(
    workflowFn: (...args: any[]) => Promise<any>,
    args: any[],
    config: TestEnvConfig = {}
  ): Promise<WorkflowFailedError> {
    try {
      await this.runWorkflow(workflowFn, args, config);
      throw new Error('Expected workflow to fail but it succeeded');
    } catch (error) {
      if (error instanceof WorkflowFailedError) {
        return error;
      }
      throw error;
    }
  }

  /**
   * Tear down the test environment
   */
  async teardown(): Promise<void> {
    if (this.testEnv) {
      await this.testEnv.teardown();
      this.testEnv = null;
    }
  }

  /**
   * Get the test environment (for direct access)
   */
  getTestEnv(): TestWorkflowEnvironment {
    if (!this.testEnv) {
      throw new Error('Test environment not initialized');
    }
    return this.testEnv;
  }
}

/**
 * Mock activity with call tracking
 */
export class MockActivity<TArgs extends any[] = any[], TResult = any> {
  private calls: TArgs[] = [];
  private responses: TResult[] = [];
  private errors: Error[] = [];
  private currentIndex = 0;

  /**
   * Set up the activity to return specific responses in sequence
   */
  respondWith(...responses: TResult[]): this {
    this.responses = responses;
    this.currentIndex = 0;
    return this;
  }

  /**
   * Set up the activity to throw specific errors in sequence
   */
  throwErrors(...errors: Error[]): this {
    this.errors = errors;
    this.currentIndex = 0;
    return this;
  }

  /**
   * The mock function to use as an activity
   */
  fn = async (...args: TArgs): Promise<TResult> => {
    this.calls.push(args);

    if (this.errors.length > 0 && this.currentIndex < this.errors.length) {
      throw this.errors[this.currentIndex++];
    }

    if (this.responses.length > 0) {
      const response = this.responses[this.currentIndex % this.responses.length];
      this.currentIndex++;
      return response;
    }

    return {} as TResult;
  };

  /**
   * Get all calls made to this activity
   */
  getCalls(): TArgs[] {
    return this.calls;
  }

  /**
   * Get the number of times this activity was called
   */
  getCallCount(): number {
    return this.calls.length;
  }

  /**
   * Check if activity was called with specific arguments
   */
  wasCalledWith(...args: TArgs): boolean {
    return this.calls.some((call) => JSON.stringify(call) === JSON.stringify(args));
  }

  /**
   * Reset the mock
   */
  reset(): void {
    this.calls = [];
    this.responses = [];
    this.errors = [];
    this.currentIndex = 0;
  }
}

/**
 * Create a mock activity
 */
export function createMockActivity<TArgs extends any[] = any[], TResult = any>(): MockActivity<
  TArgs,
  TResult
> {
  return new MockActivity<TArgs, TResult>();
}

/**
 * Sleep utility for testing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Capture logs during workflow execution
 */
export class LogCapture {
  private logs: LogEntry[] = [];

  logger = new DefaultLogger('INFO', (entry) => {
    this.logs.push(entry);
  });

  getLogs(): LogEntry[] {
    return this.logs;
  }

  getLogMessages(): string[] {
    return this.logs.map((entry) => entry.message);
  }

  hasLogMatching(pattern: string | RegExp): boolean {
    return this.logs.some((entry) => {
      if (typeof pattern === 'string') {
        return entry.message.includes(pattern);
      }
      return pattern.test(entry.message);
    });
  }

  clear(): void {
    this.logs = [];
  }
}

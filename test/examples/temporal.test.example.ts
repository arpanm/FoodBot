/**
 * Example Temporal Workflow Test
 * Demonstrates testing Temporal workflows and activities
 */

import {
  TemporalTestEnv,
  temporalTestHelpers,
  TemporalTestFixture,
} from '../temporal/temporal-test-env';

describe('Temporal Workflow Testing Example', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _testEnv: any;
  let fixture: TemporalTestFixture;

  beforeAll(async () => {
    _testEnv = await TemporalTestEnv.getTestEnvironment();
    TemporalTestEnv.initializeCoverage();
  });

  afterAll(async () => {
    await TemporalTestEnv.cleanup();
  });

  beforeEach(() => {
    fixture = new TemporalTestFixture();
  });

  afterEach(() => {
    fixture.reset();
  });

  describe('Simple Workflow Example', () => {
    // Example activity
    // eslint-disable-next-line @typescript-eslint/require-await
    const mockEnrichContext = fixture.addActivity('enrichContext', async (userId: string) => {
      return {
        userId,
        preferences: ['italian', 'chinese'],
        recentOrders: [],
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/require-await
    const mockGenerateWorkflow = fixture.addActivity('generateWorkflow', async (_input: any) => {
      return {
        intent: 'ORDER_FOOD',
        steps: [
          { action: 'SEARCH_RESTAURANTS', params: { cuisine: 'italian' } },
          { action: 'SELECT_RESTAURANT', params: {} },
        ],
      };
    });

    it('should execute workflow with activities.', async () => {
      // Example workflow (would be in separate file)
      const exampleWorkflow = async (input: {
        userId: string;
        prompt: string;
      }): Promise<{ success: boolean; workflow: unknown }> => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const context = await mockEnrichContext.getMockImplementation()(input.userId);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const workflow = await mockGenerateWorkflow.getMockImplementation()({
          prompt: input.prompt,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          context,
        });
        return { success: true, workflow };
      };

      // Arrange
      const input = {
        userId: 'user-123',
        prompt: 'Order Italian food',
      };

      // Act
      const result = await exampleWorkflow(input);

      // Assert
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      expect((result.workflow as any).intent).toBe('ORDER_FOOD');
      expect(mockEnrichContext).toHaveBeenCalledWith('user-123');
      expect(mockGenerateWorkflow).toHaveBeenCalled();
    });
  });

  describe('Workflow Error Handling Example', () => {
    it('should handle activity failures with retry.', async () => {
      // Mock activity that fails first 2 times, then succeeds
      let callCount = 0;
      // eslint-disable-next-line @typescript-eslint/require-await
      const mockFailingActivity = fixture.addActivity('failingActivity', async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      // Example workflow with retry
      const workflowWithRetry = async (): Promise<{ success: boolean } | undefined> => {
        let attempts = 0;
        let result: { success: boolean } | undefined;

        while (attempts < 3) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            result = await mockFailingActivity.getMockImplementation()();
            break;
          } catch (error) {
            attempts++;
            if (attempts >= 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        return result;
      };

      // Act
      const result = await workflowWithRetry();

      // Assert
      expect(result).toEqual({ success: true });
      expect(callCount).toBe(3);
    });
  });

  describe('Workflow Time Management Example', () => {
    it('should handle time-based operations.', async () => {
      // This would use testEnv.sleep() in actual Temporal workflows
      const workflowWithDelay = async (): Promise<{ duration: number }> => {
        const start = Date.now();
        // In actual Temporal: await workflow.sleep('1 minute')
        await new Promise(resolve => setTimeout(resolve, 100));
        const end = Date.now();
        return { duration: end - start };
      };

      const result = await workflowWithDelay();
      expect(result.duration).toBeGreaterThan(90);
    });
  });

  describe('Workflow Input Validation Example', () => {
    it('should validate workflow input.', () => {
      const input = temporalTestHelpers.createWorkflowInput({
        userId: 'custom-user',
        prompt: 'Test prompt',
      });

      expect(input.userId).toBe('custom-user');
      expect(input.prompt).toBe('Test prompt');
      expect(input.correlationId).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(input.timestamp).toBeValidISODate();
    });
  });
});

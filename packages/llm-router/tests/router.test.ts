/**
 * Integration tests for LLM Router
 */

import { LLMRouter } from '../src/router.js';
import type { LLMProvider, CompletionResponse } from '../src/types.js';

describe('LLMRouter Integration Tests', () => {
  let router: LLMRouter;
  let mockClaudeProvider: LLMProvider;
  let mockOpenAIProvider: LLMProvider;
  let mockGeminiProvider: LLMProvider;

  beforeEach(() => {
    mockClaudeProvider = {
      name: 'claude',
      models: ['claude-sonnet-4-5'],
      generateCompletion: jest.fn().mockResolvedValue({
        text: 'Claude response',
        model: 'claude-sonnet-4-5',
        provider: 'claude',
        finishReason: 'complete',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 500,
      }),
      generateStream: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({
        provider: 'claude',
        status: 'healthy',
        latencyMs: 200,
        lastChecked: new Date().toISOString(),
      }),
    };

    mockOpenAIProvider = {
      name: 'openai',
      models: ['gpt-4-turbo'],
      generateCompletion: jest.fn().mockResolvedValue({
        text: 'OpenAI response',
        model: 'gpt-4-turbo',
        provider: 'openai',
        finishReason: 'complete',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 400,
      }),
      generateStream: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({
        provider: 'openai',
        status: 'healthy',
        latencyMs: 180,
        lastChecked: new Date().toISOString(),
      }),
    };

    mockGeminiProvider = {
      name: 'gemini',
      models: ['gemini-1.5-flash'],
      generateCompletion: jest.fn().mockResolvedValue({
        text: 'Gemini response',
        model: 'gemini-1.5-flash',
        provider: 'gemini',
        finishReason: 'complete',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 300,
      }),
      generateStream: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({
        provider: 'gemini',
        status: 'healthy',
        latencyMs: 150,
        lastChecked: new Date().toISOString(),
      }),
    };

    router = new LLMRouter({
      providers: [
        { name: 'claude', apiKey: 'test', enabled: true, priority: 1 },
        { name: 'openai', apiKey: 'test', enabled: true, priority: 2 },
        { name: 'gemini', apiKey: 'test', enabled: true, priority: 3 },
      ],
      strategy: 'quality',
      fallbackEnabled: true,
      timeout: 30000,
    });

    router.registerProvider(mockClaudeProvider, true);
    router.registerProvider(mockOpenAIProvider, true);
    router.registerProvider(mockGeminiProvider, true);
  });

  describe('Provider Registration', () => {
    it('should register providers successfully', () => {
      const newRouter = new LLMRouter({
        providers: [],
        strategy: 'performance',
        fallbackEnabled: false,
      });

      newRouter.registerProvider(mockClaudeProvider, true);
      expect(() => newRouter.route('test prompt')).not.toThrow();
    });

    it('should enable and disable providers', async () => {
      router.disableProvider('claude');

      const result = await router.route('analyze this complex data');

      expect(mockClaudeProvider.generateCompletion).not.toHaveBeenCalled();
      expect(
        mockOpenAIProvider.generateCompletion ||
          mockGeminiProvider.generateCompletion
      ).toHaveBeenCalled();
    });
  });

  describe('Routing Strategy', () => {
    it('should route complex reasoning to Claude', async () => {
      const result = await router.route(
        'Analyze this complex philosophical question with deep reasoning'
      );

      expect(mockClaudeProvider.generateCompletion).toHaveBeenCalled();
      expect(result.text).toBe('Claude response');
    });

    it('should route code generation to OpenAI', async () => {
      const result = await router.route('Write a function to sort an array');

      expect(mockOpenAIProvider.generateCompletion).toHaveBeenCalled();
      expect(result.text).toBe('OpenAI response');
    });

    it('should handle custom generation options', async () => {
      await router.route('Test prompt', {
        model: 'custom-model',
        maxTokens: 1000,
        temperature: 0.7,
      });

      expect(mockClaudeProvider.generateCompletion).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          model: 'custom-model',
          maxTokens: 1000,
          temperature: 0.7,
        })
      );
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to another provider on failure', async () => {
      (mockClaudeProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Claude API error')
      );

      const result = await router.route('analyze this data');

      expect(mockClaudeProvider.generateCompletion).toHaveBeenCalled();
      expect(
        mockOpenAIProvider.generateCompletion ||
          mockGeminiProvider.generateCompletion
      ).toHaveBeenCalled();
      expect(result.text).toBeTruthy();
    });

    it('should fail if all providers fail', async () => {
      (mockClaudeProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Claude error')
      );
      (mockOpenAIProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('OpenAI error')
      );
      (mockGeminiProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Gemini error')
      );

      await expect(router.route('test prompt')).rejects.toThrow(
        'All LLM providers failed'
      );
    });

    it('should not fallback when disabled', async () => {
      const noFallbackRouter = new LLMRouter({
        providers: [{ name: 'claude', apiKey: 'test', enabled: true, priority: 1 }],
        strategy: 'quality',
        fallbackEnabled: false,
      });

      noFallbackRouter.registerProvider(mockClaudeProvider, true);

      (mockClaudeProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Claude error')
      );

      await expect(noFallbackRouter.route('test')).rejects.toThrow('routing failed');
    });
  });

  describe('Metrics Tracking', () => {
    it('should track successful requests', async () => {
      await router.route('test prompt 1');
      await router.route('test prompt 2');

      const metrics = router.getMetrics();

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageLatencyMs).toBeGreaterThan(0);
    });

    it('should track failed requests', async () => {
      (mockClaudeProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Error')
      );
      (mockOpenAIProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Error')
      );
      (mockGeminiProvider.generateCompletion as jest.Mock).mockRejectedValue(
        new Error('Error')
      );

      await expect(router.route('test')).rejects.toThrow();

      const metrics = router.getMetrics();

      expect(metrics.failedRequests).toBe(1);
    });

    it('should track provider usage', async () => {
      await router.route('analyze complex reasoning');
      await router.route('write code function');

      const metrics = router.getMetrics();

      expect(metrics.providerUsage).toBeDefined();
      expect(Object.keys(metrics.providerUsage).length).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      await router.route('test');

      router.resetMetrics();
      const metrics = router.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
    });
  });

  describe('Health Checks', () => {
    it('should check health of all providers', async () => {
      const health = await router.healthCheckAll();

      expect(health.claude).toEqual({
        healthy: true,
        latencyMs: 200,
      });
      expect(health.openai).toEqual({
        healthy: true,
        latencyMs: 180,
      });
      expect(health.gemini).toEqual({
        healthy: true,
        latencyMs: 150,
      });
    });

    it('should report unhealthy providers', async () => {
      (mockClaudeProvider.healthCheck as jest.Mock).mockRejectedValue(
        new Error('Health check failed')
      );

      const health = await router.healthCheckAll();

      expect(health.claude.healthy).toBe(false);
      expect(health.claude.details).toContain('Health check failed');
    });
  });

  describe('Prompt Classification', () => {
    it('should classify complex reasoning prompts', () => {
      const type = router.classifyPrompt(
        'Analyze the philosophical implications of artificial intelligence'
      );
      expect(type).toBe('complex_reasoning');
    });

    it('should classify quick classification prompts', () => {
      const type = router.classifyPrompt('Classify the sentiment: I love this!');
      expect(type).toBe('quick_classification');
    });

    it('should classify creative writing prompts', () => {
      const type = router.classifyPrompt('Write a short story about a dragon');
      expect(type).toBe('creative_writing');
    });

    it('should classify code generation prompts', () => {
      const type = router.classifyPrompt('Write a function to reverse a string');
      expect(type).toBe('code_generation');
    });

    it('should classify summarization prompts', () => {
      const type = router.classifyPrompt('Summarize the following article...');
      expect(type).toBe('summarization');
    });

    it('should classify question answering prompts', () => {
      const type = router.classifyPrompt('What is the capital of France?');
      expect(type).toBe('question_answering');
    });

    it('should default to general for unknown types', () => {
      const type = router.classifyPrompt('Random text here');
      expect(type).toBe('general');
    });
  });

  describe('Streaming Support', () => {
    it('should stream responses from provider', async () => {
      const chunks = [
        { text: 'Hello ', isComplete: false },
        { text: 'world', isComplete: false },
        { text: '', isComplete: true, finishReason: 'complete' as const },
      ];

      const mockAsyncIterator = (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })();

      (mockClaudeProvider.generateStream as jest.Mock).mockReturnValue(
        mockAsyncIterator
      );

      const receivedChunks = [];
      for await (const chunk of router.routeStream('test prompt')) {
        receivedChunks.push(chunk);
      }

      expect(receivedChunks).toEqual(chunks);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no providers available', async () => {
      const emptyRouter = new LLMRouter({
        providers: [],
        strategy: 'quality',
        fallbackEnabled: false,
      });

      await expect(emptyRouter.route('test')).rejects.toThrow(
        'No LLM providers are available'
      );
    });

    it('should handle timeout', async () => {
      const timeoutRouter = new LLMRouter({
        providers: [{ name: 'claude', apiKey: 'test', enabled: true, priority: 1 }],
        strategy: 'quality',
        fallbackEnabled: false,
        timeout: 100,
      });

      timeoutRouter.registerProvider(mockClaudeProvider, true);

      (mockClaudeProvider.generateCompletion as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ text: 'Late response' }), 1000);
          })
      );

      await expect(timeoutRouter.route('test')).rejects.toThrow('timeout');
    });
  });
});

import { EmbeddingService } from '../embedding/embedding.service';
import { LocalEmbedder } from '../embedding/local-embedder';
import { OpenAiEmbedder } from '../embedding/openai-embedder';
import type { EmbeddingProvider, EmbeddingResult } from '../types/embedding.types';
import type { OpenAiApiClient } from '../embedding/openai-embedder';

function createMockOpenAiClient(): jest.Mocked<OpenAiApiClient> {
  return {
    createEmbedding: jest.fn().mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
      usage: { total_tokens: 10 },
      model: 'text-embedding-3-small',
    }),
  };
}

function createFailingProvider(): EmbeddingProvider {
  return {
    config: { name: 'failing', dimension: 384, maxBatchSize: 10, timeoutMs: 1000 },
    embed: jest.fn().mockRejectedValue(new Error('Provider failed')),
    embedBatch: jest.fn().mockRejectedValue(new Error('Batch provider failed')),
    isAvailable: jest.fn().mockResolvedValue(false),
  };
}

describe('EmbeddingService', () => {
  describe('embed with single provider', () => {
    it('should return embedding from local provider', async () => {
      const localEmbedder = new LocalEmbedder();
      const service = new EmbeddingService({ providers: [localEmbedder] });

      const result = await service.embed('hello world');
      expect(result.vector).toHaveLength(384);
      expect(result.model).toBe('local-hash-384');
      expect(result.dimension).toBe(384);
    });

    it('should return cached embedding on second call', async () => {
      const localEmbedder = new LocalEmbedder();
      const embedSpy = jest.spyOn(localEmbedder, 'embed');
      const service = new EmbeddingService({ providers: [localEmbedder] });

      const result1 = await service.embed('hello world');
      const result2 = await service.embed('hello world');

      expect(result1.vector).toEqual(result2.vector);
      expect(embedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('embed with fallback chain', () => {
    it('should fall back to second provider when first fails', async () => {
      const failing = createFailingProvider();
      const localEmbedder = new LocalEmbedder();
      const service = new EmbeddingService({
        providers: [failing, localEmbedder],
        maxRetries: 0,
      });

      const result = await service.embed('test text');
      expect(result.model).toBe('local-hash-384');
    });

    it('should throw when all providers fail', async () => {
      const failing1 = createFailingProvider();
      const failing2 = createFailingProvider();
      const service = new EmbeddingService({
        providers: [failing1, failing2],
        maxRetries: 0,
      });

      await expect(service.embed('test')).rejects.toThrow('All embedding providers failed');
    });

    it('should retry before falling back', async () => {
      const failing = createFailingProvider();
      const localEmbedder = new LocalEmbedder();
      const service = new EmbeddingService({
        providers: [failing, localEmbedder],
        maxRetries: 2,
      });

      const result = await service.embed('test');
      expect(failing.embed).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(result.model).toBe('local-hash-384');
    });
  });

  describe('embedBatch', () => {
    it('should batch embed multiple texts', async () => {
      const localEmbedder = new LocalEmbedder();
      const service = new EmbeddingService({ providers: [localEmbedder] });

      const result = await service.embedBatch(['hello', 'world', 'test']);
      expect(result.embeddings).toHaveLength(3);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should use cached embeddings in batch', async () => {
      const localEmbedder = new LocalEmbedder();
      const service = new EmbeddingService({ providers: [localEmbedder] });

      await service.embed('hello');
      const result = await service.embedBatch(['hello', 'world']);
      expect(result.embeddings.length).toBeGreaterThanOrEqual(2);
    });

    it('should fall back for batch when primary fails', async () => {
      const failing = createFailingProvider();
      const localEmbedder = new LocalEmbedder();
      const service = new EmbeddingService({
        providers: [failing, localEmbedder],
        maxRetries: 0,
      });

      const result = await service.embedBatch(['hello', 'world']);
      expect(result.embeddings).toHaveLength(2);
    });
  });

  describe('OpenAI embedder', () => {
    it('should call OpenAI API and return result', async () => {
      const client = createMockOpenAiClient();
      const embedder = new OpenAiEmbedder(client);

      const result = await embedder.embed('test');
      expect(result.vector).toHaveLength(1536);
      expect(result.model).toBe('text-embedding-3-small');
      expect(client.createEmbedding).toHaveBeenCalledTimes(1);
    });

    it('should handle batch embedding', async () => {
      const client = createMockOpenAiClient();
      client.createEmbedding.mockResolvedValue({
        data: [
          { embedding: new Array(1536).fill(0.1), index: 0 },
          { embedding: new Array(1536).fill(0.2), index: 1 },
        ],
        usage: { total_tokens: 20 },
        model: 'text-embedding-3-small',
      });
      const embedder = new OpenAiEmbedder(client);

      const result = await embedder.embedBatch(['hello', 'world']);
      expect(result.embeddings).toHaveLength(2);
      expect(result.totalTokens).toBe(20);
    });

    it('should report availability when API works', async () => {
      const client = createMockOpenAiClient();
      const embedder = new OpenAiEmbedder(client);
      expect(await embedder.isAvailable()).toBe(true);
    });

    it('should report unavailable when API fails', async () => {
      const client = createMockOpenAiClient();
      client.createEmbedding.mockRejectedValue(new Error('API down'));
      const embedder = new OpenAiEmbedder(client);
      expect(await embedder.isAvailable()).toBe(false);
    });
  });

  describe('LocalEmbedder', () => {
    it('should generate deterministic embeddings', async () => {
      const embedder = new LocalEmbedder();
      const r1 = await embedder.embed('hello');
      const r2 = await embedder.embed('hello');
      expect(r1.vector).toEqual(r2.vector);
    });

    it('should generate different embeddings for different text', async () => {
      const embedder = new LocalEmbedder();
      const r1 = await embedder.embed('hello');
      const r2 = await embedder.embed('world');
      expect(r1.vector).not.toEqual(r2.vector);
    });

    it('should generate normalized vectors', async () => {
      const embedder = new LocalEmbedder();
      const result = await embedder.embed('test text');
      const norm = Math.sqrt(
        result.vector.reduce((s, v) => s + v * v, 0)
      );
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it('should always be available', async () => {
      const embedder = new LocalEmbedder();
      expect(await embedder.isAvailable()).toBe(true);
    });

    it('should handle batch embedding with empty strings', async () => {
      const embedder = new LocalEmbedder();
      const result = await embedder.embedBatch(['hello', '', 'world']);
      expect(result.embeddings).toHaveLength(2);
      expect(result.failedIndices).toContain(1);
    });

    it('should support custom dimension', async () => {
      const embedder = new LocalEmbedder(128);
      const result = await embedder.embed('test');
      expect(result.vector).toHaveLength(128);
      expect(result.dimension).toBe(128);
    });
  });

  describe('EmbeddingService cache management', () => {
    it('should expose cache stats', () => {
      const service = new EmbeddingService({ providers: [new LocalEmbedder()] });
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear cache', async () => {
      const service = new EmbeddingService({ providers: [new LocalEmbedder()] });
      await service.embed('test');
      expect(service.getCacheStats().size).toBe(1);
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });

    it('should return active provider', () => {
      const local = new LocalEmbedder();
      const service = new EmbeddingService({ providers: [local] });
      expect(service.getActiveProvider()).toBe(local);
    });

    it('should return undefined when no providers', () => {
      const service = new EmbeddingService({ providers: [] });
      expect(service.getActiveProvider()).toBeUndefined();
    });
  });
});

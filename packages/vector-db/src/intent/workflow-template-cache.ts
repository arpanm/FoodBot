/**
 * Workflow template cache for caching workflow patterns as templates
 * and matching intents to pre-cached workflow templates.
 */

import type { EmbeddingProvider } from '../types/embedding.types.js';
import type { VectorStore } from '../types/vector-store.types.js';
import { normalizePrompt } from '../cache/prompt-hasher.js';

const DEFAULT_COLLECTION = 'workflow_templates';
const DEFAULT_THRESHOLD = 0.90;
const DEFAULT_TIMEOUT_MS = 5000;

export interface WorkflowStep {
  name: string;
  type: string;
  config: Record<string, unknown>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  intentPatterns: string[];
  steps: WorkflowStep[];
  metadata: Record<string, unknown>;
}

export interface TemplateMatchResult {
  matched: boolean;
  template: WorkflowTemplate | null;
  score: number;
  latencyMs: number;
}

export class WorkflowTemplateCache {
  private readonly store: VectorStore;
  private readonly embedder: EmbeddingProvider;
  private readonly templates: Map<string, WorkflowTemplate> = new Map();
  private readonly collection: string;
  private readonly threshold: number;
  private readonly timeoutMs: number;

  constructor(
    store: VectorStore,
    embedder: EmbeddingProvider,
    config?: {
      collection?: string;
      threshold?: number;
      timeoutMs?: number;
    }
  ) {
    this.store = store;
    this.embedder = embedder;
    this.collection = config?.collection ?? DEFAULT_COLLECTION;
    this.threshold = config?.threshold ?? DEFAULT_THRESHOLD;
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async registerTemplate(template: WorkflowTemplate): Promise<void> {
    this.templates.set(template.id, template);
    await this.indexTemplate(template);
  }

  async matchTemplate(intentText: string): Promise<TemplateMatchResult> {
    const start = Date.now();

    try {
      const normalized = normalizePrompt(intentText);
      const embedding = await this.embedder.embed(normalized);

      const results = await this.withTimeout(
        this.store.search(this.collection, embedding.vector, {
          limit: 1,
          scoreThreshold: this.threshold,
          withPayload: true,
        })
      );

      const top = results[0];
      if (!top) {
        return this.noMatch(start);
      }

      const template = this.templates.get(top.id);
      if (!template) {
        return this.noMatch(start);
      }

      return {
        matched: true,
        template,
        score: top.score,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      // eslint-disable-next-line no-console -- operational log for failed template match
      console.warn('[WorkflowTemplateCache] Template match failed:', error instanceof Error ? error.message : 'unknown');
      return this.noMatch(start);
    }
  }

  async removeTemplate(templateId: string): Promise<void> {
    this.templates.delete(templateId);
    try {
      await this.store.deletePoints(this.collection, [templateId]);
    } catch {
      // Ignore if not found
    }
  }

  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.templates.get(templateId);
  }

  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  private async indexTemplate(template: WorkflowTemplate): Promise<void> {
    const text = this.buildTemplateText(template);
    const normalized = normalizePrompt(text);
    const embedding = await this.embedder.embed(normalized);

    await this.store.upsertPoints(this.collection, [
      {
        id: template.id,
        vector: embedding.vector,
        payload: {
          name: template.name,
          description: template.description,
          intentPatterns: template.intentPatterns,
        },
      },
    ]);
  }

  private buildTemplateText(template: WorkflowTemplate): string {
    const parts = [
      template.name,
      template.description,
      ...template.intentPatterns,
    ];
    return parts.join(' ');
  }

  private noMatch(start: number): TemplateMatchResult {
    return {
      matched: false,
      template: null,
      score: 0,
      latencyMs: Date.now() - start,
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Template match timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs
      );
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (error) {
      clearTimeout(timer!);
      throw error;
    }
  }
}

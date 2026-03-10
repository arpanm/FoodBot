import type { SearchDocument, SearchResult } from '../types/search.types';

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  dimensions(): number;
}

export interface SemanticSearchConfig {
  readonly embeddingProvider: EmbeddingProvider;
  readonly similarityThreshold?: number;
}

export class SemanticSearcher {
  private documents: Map<string, SearchDocument> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private readonly provider: EmbeddingProvider;
  private readonly threshold: number;

  constructor(config: SemanticSearchConfig) {
    this.provider = config.embeddingProvider;
    this.threshold = config.similarityThreshold ?? 0.3;
  }

  async indexDocuments(docs: SearchDocument[]): Promise<void> {
    for (const doc of docs) {
      this.documents.set(doc.id, doc);
      const text = buildDocumentText(doc);
      const embedding = await this.provider.embed(text);
      this.embeddings.set(doc.id, embedding);
    }
  }

  async search(queryText: string, limit: number = 20): Promise<SearchResult[]> {
    const queryEmbedding = await this.provider.embed(queryText);
    const scores: Array<{ docId: string; score: number }> = [];

    for (const [docId, docEmbedding] of this.embeddings) {
      const score = cosineSimilarity(queryEmbedding, docEmbedding);
      if (score >= this.threshold) {
        scores.push({ docId, score });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ docId, score }) => ({
        document: this.documents.get(docId)!,
        score,
        source: 'semantic' as const,
      }))
      .filter((r) => r.document !== undefined);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

export class InMemoryEmbeddingProvider implements EmbeddingProvider {
  private readonly dims: number;
  private readonly termVectors: Map<string, number[]> = new Map();

  constructor(dims: number = 64) {
    this.dims = dims;
  }

  async embed(text: string): Promise<number[]> {
    const tokens = text.toLowerCase().split(/\s+/);
    const result = new Array<number>(this.dims).fill(0);

    for (const token of tokens) {
      const vector = this.getTermVector(token);
      for (let i = 0; i < this.dims; i++) {
        result[i]! += vector[i]!;
      }
    }

    return normalizeVector(result);
  }

  dimensions(): number {
    return this.dims;
  }

  private getTermVector(term: string): number[] {
    if (this.termVectors.has(term)) {
      return this.termVectors.get(term)!;
    }

    const vector = deterministicHash(term, this.dims);
    this.termVectors.set(term, vector);
    return vector;
  }
}

function buildDocumentText(doc: SearchDocument): string {
  const parts = [doc.name, doc.cuisine, doc.description];
  if (doc.tags) {
    parts.push(...doc.tags);
  }
  if (doc.dietary) {
    parts.push(...doc.dietary);
  }
  return parts.join(' ');
}

function normalizeVector(vector: number[]): number[] {
  let norm = 0;
  for (const v of vector) {
    norm += v * v;
  }
  norm = Math.sqrt(norm);
  if (norm === 0) {
    return vector;
  }
  return vector.map((v) => v / norm);
}

function deterministicHash(str: string, dims: number): number[] {
  const vector = new Array<number>(dims).fill(0);
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const idx = (charCode * (i + 1)) % dims;
    vector[idx] += (charCode % 10) / 10 - 0.5;
  }
  return vector;
}

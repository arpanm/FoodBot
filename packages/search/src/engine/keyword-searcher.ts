import type { SearchDocument, SearchResult } from '../types/search.types';
import { levenshteinDistance } from '../query/spell-checker';

interface FieldWeight {
  readonly field: keyof SearchDocument;
  readonly weight: number;
}

const DEFAULT_FIELD_WEIGHTS: readonly FieldWeight[] = [
  { field: 'name', weight: 3 },
  { field: 'cuisine', weight: 2 },
  { field: 'description', weight: 1 },
] as const;

const BM25_K1 = 1.2;
const BM25_B = 0.75;
const MAX_FUZZY_DISTANCE = 2;

interface InvertedIndexEntry {
  docId: string;
  field: string;
  termFrequency: number;
}

export class KeywordSearcher {
  private documents: Map<string, SearchDocument> = new Map();
  private invertedIndex: Map<string, InvertedIndexEntry[]> = new Map();
  private fieldLengths: Map<string, number> = new Map();
  private avgFieldLengths: Map<string, number> = new Map();
  private docCount: number = 0;

  indexDocuments(docs: SearchDocument[]): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.fieldLengths.clear();
    this.docCount = docs.length;

    for (const doc of docs) {
      this.documents.set(doc.id, doc);
      this.indexDocument(doc);
    }

    this.computeAvgFieldLengths();
  }

  search(
    queryTerms: string[],
    limit: number = 20,
    enableFuzzy: boolean = true
  ): SearchResult[] {
    const scores = new Map<string, number>();

    for (const term of queryTerms) {
      this.scoreTermExact(term, scores);
      if (enableFuzzy) {
        this.scoreTermFuzzy(term, scores);
      }
    }

    return this.buildResults(scores, limit);
  }

  private indexDocument(doc: SearchDocument): void {
    for (const fw of DEFAULT_FIELD_WEIGHTS) {
      const fieldValue = getFieldText(doc, fw.field);
      const tokens = tokenizeField(fieldValue);
      const fieldKey = `${doc.id}:${fw.field}`;

      this.fieldLengths.set(fieldKey, tokens.length);
      this.indexFieldTokens(doc.id, fw.field, tokens);
    }
  }

  private indexFieldTokens(
    docId: string,
    field: string,
    tokens: string[]
  ): void {
    const termFreqs = countTermFrequencies(tokens);

    for (const [term, freq] of termFreqs) {
      const entries = this.invertedIndex.get(term) ?? [];
      entries.push({ docId, field, termFrequency: freq });
      this.invertedIndex.set(term, entries);
    }
  }

  private computeAvgFieldLengths(): void {
    const sums = new Map<string, number>();
    const counts = new Map<string, number>();

    for (const [key, length] of this.fieldLengths) {
      const field = key.split(':')[1]!;
      sums.set(field, (sums.get(field) ?? 0) + length);
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }

    for (const [field, sum] of sums) {
      const count = counts.get(field) ?? 1;
      this.avgFieldLengths.set(field, sum / count);
    }
  }

  private scoreTermExact(
    term: string,
    scores: Map<string, number>
  ): void {
    const entries = this.invertedIndex.get(term);
    if (!entries) {
      return;
    }

    const docFreq = countUniqueDocIds(entries);

    for (const entry of entries) {
      const bm25Score = this.computeBm25(entry, docFreq);
      const fieldWeight = getWeightForField(entry.field);
      const totalScore = bm25Score * fieldWeight;
      const current = scores.get(entry.docId) ?? 0;
      scores.set(entry.docId, current + totalScore);
    }
  }

  private scoreTermFuzzy(
    term: string,
    scores: Map<string, number>
  ): void {
    for (const [indexedTerm, entries] of this.invertedIndex) {
      if (indexedTerm === term) {
        continue;
      }
      const distance = levenshteinDistance(term, indexedTerm);
      if (distance > MAX_FUZZY_DISTANCE) {
        continue;
      }

      const fuzzyPenalty = 1 / (1 + distance);
      const docFreq = countUniqueDocIds(entries);

      for (const entry of entries) {
        const bm25Score = this.computeBm25(entry, docFreq);
        const fieldWeight = getWeightForField(entry.field);
        const totalScore = bm25Score * fieldWeight * fuzzyPenalty;
        const current = scores.get(entry.docId) ?? 0;
        scores.set(entry.docId, current + totalScore);
      }
    }
  }

  private computeBm25(
    entry: InvertedIndexEntry,
    docFreq: number
  ): number {
    const idf = Math.log(
      (this.docCount - docFreq + 0.5) / (docFreq + 0.5) + 1
    );
    const fieldKey = `${entry.docId}:${entry.field}`;
    const fieldLength = this.fieldLengths.get(fieldKey) ?? 1;
    const avgLength = this.avgFieldLengths.get(entry.field) ?? 1;
    const tf = entry.termFrequency;

    const numerator = tf * (BM25_K1 + 1);
    const denominator =
      tf + BM25_K1 * (1 - BM25_B + BM25_B * (fieldLength / avgLength));

    return idf * (numerator / denominator);
  }

  private buildResults(
    scores: Map<string, number>,
    limit: number
  ): SearchResult[] {
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, score]) => ({
        document: this.documents.get(docId)!,
        score,
        source: 'keyword' as const,
      }))
      .filter((r) => r.document !== undefined);
  }
}

function getFieldText(doc: SearchDocument, field: keyof SearchDocument): string {
  const value = doc[field];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(' ');
  }
  return String(value ?? '');
}

function tokenizeField(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function countTermFrequencies(tokens: string[]): Map<string, number> {
  const freqs = new Map<string, number>();
  for (const token of tokens) {
    freqs.set(token, (freqs.get(token) ?? 0) + 1);
  }
  return freqs;
}

function countUniqueDocIds(entries: InvertedIndexEntry[]): number {
  return new Set(entries.map((e) => e.docId)).size;
}

function getWeightForField(field: string): number {
  const match = DEFAULT_FIELD_WEIGHTS.find((fw) => fw.field === field);
  return match?.weight ?? 1;
}

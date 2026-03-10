import type { SearchResult, FusedResult } from '../types/search.types';

export interface FusionConfig {
  readonly method: 'rrf' | 'linear';
  readonly keywordWeight?: number;
  readonly semanticWeight?: number;
  readonly rrfK?: number;
}

const DEFAULT_CONFIG: FusionConfig = {
  method: 'rrf',
  keywordWeight: 0.4,
  semanticWeight: 0.6,
  rrfK: 60,
};

export function fuseResults(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  config: FusionConfig = DEFAULT_CONFIG
): FusedResult[] {
  if (config.method === 'linear') {
    return linearCombination(keywordResults, semanticResults, config);
  }

  return reciprocalRankFusion(keywordResults, semanticResults, config);
}

function reciprocalRankFusion(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  config: FusionConfig
): FusedResult[] {
  const k = config.rrfK ?? 60;
  const keywordWeight = config.keywordWeight ?? 0.4;
  const semanticWeight = config.semanticWeight ?? 0.6;
  const fusedScores = new Map<string, FusedResultBuilder>();

  addRrfScores(keywordResults, fusedScores, k, keywordWeight, 'keyword');
  addRrfScores(semanticResults, fusedScores, k, semanticWeight, 'semantic');

  return buildSortedResults(fusedScores);
}

function addRrfScores(
  results: SearchResult[],
  fusedScores: Map<string, FusedResultBuilder>,
  k: number,
  weight: number,
  source: 'keyword' | 'semantic'
): void {
  for (let rank = 0; rank < results.length; rank++) {
    const result = results[rank]!;
    const rrfScore = weight * (1 / (k + rank + 1));

    const existing = fusedScores.get(result.document.id) ?? {
      document: result.document,
      fusedScore: 0,
    };

    existing.fusedScore += rrfScore;

    if (source === 'keyword') {
      existing.keywordRank = rank + 1;
    } else {
      existing.semanticRank = rank + 1;
    }

    fusedScores.set(result.document.id, existing);
  }
}

function linearCombination(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  config: FusionConfig
): FusedResult[] {
  const keywordWeight = config.keywordWeight ?? 0.4;
  const semanticWeight = config.semanticWeight ?? 0.6;
  const fusedScores = new Map<string, FusedResultBuilder>();

  const keywordMax = normalizeMax(keywordResults);
  const semanticMax = normalizeMax(semanticResults);

  addLinearScores(keywordResults, fusedScores, keywordWeight, keywordMax, 'keyword');
  addLinearScores(semanticResults, fusedScores, semanticWeight, semanticMax, 'semantic');

  return buildSortedResults(fusedScores);
}

function addLinearScores(
  results: SearchResult[],
  fusedScores: Map<string, FusedResultBuilder>,
  weight: number,
  maxScore: number,
  source: 'keyword' | 'semantic'
): void {
  for (let rank = 0; rank < results.length; rank++) {
    const result = results[rank]!;
    const normalizedScore = maxScore > 0 ? result.score / maxScore : 0;

    const existing = fusedScores.get(result.document.id) ?? {
      document: result.document,
      fusedScore: 0,
    };

    existing.fusedScore += weight * normalizedScore;

    if (source === 'keyword') {
      existing.keywordRank = rank + 1;
    } else {
      existing.semanticRank = rank + 1;
    }

    fusedScores.set(result.document.id, existing);
  }
}

function normalizeMax(results: SearchResult[]): number {
  if (results.length === 0) {
    return 0;
  }
  return Math.max(...results.map((r) => r.score));
}

function buildSortedResults(
  fusedScores: Map<string, FusedResultBuilder>
): FusedResult[] {
  return [...fusedScores.values()]
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .map((builder) => ({
      document: builder.document,
      fusedScore: builder.fusedScore,
      keywordRank: builder.keywordRank,
      semanticRank: builder.semanticRank,
    }));
}

interface FusedResultBuilder {
  document: SearchResult['document'];
  fusedScore: number;
  keywordRank?: number;
  semanticRank?: number;
}

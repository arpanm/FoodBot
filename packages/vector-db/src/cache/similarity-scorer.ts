/**
 * Cosine similarity calculation and threshold checking
 * for semantic cache matching.
 */

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`
    );
  }

  if (a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dot / denominator;
}

export function meetsThreshold(
  similarity: number,
  threshold: number
): boolean {
  return similarity >= threshold;
}

export function findBestMatch<T>(
  queryVector: number[],
  candidates: Array<{ vector: number[]; data: T }>,
  threshold: number
): { data: T; score: number } | null {
  let bestScore = -Infinity;
  let bestData: T | null = null;

  for (const candidate of candidates) {
    const score = cosineSimilarity(queryVector, candidate.vector);
    if (score > bestScore && meetsThreshold(score, threshold)) {
      bestScore = score;
      bestData = candidate.data;
    }
  }

  if (bestData === null) return null;

  return { data: bestData, score: bestScore };
}

export function rankBySimilarity<T>(
  queryVector: number[],
  candidates: Array<{ vector: number[]; data: T }>,
  limit: number
): Array<{ data: T; score: number }> {
  const scored = candidates.map((c) => ({
    data: c.data,
    score: cosineSimilarity(queryVector, c.vector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

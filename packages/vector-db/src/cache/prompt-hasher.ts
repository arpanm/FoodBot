/**
 * Prompt normalization and hashing for exact-match cache lookups.
 * Normalizes text by lowercasing, stripping whitespace, and removing stopwords.
 */

import { createHash } from 'crypto';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about',
  'up', 'that', 'this', 'it', 'its', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'please', 'thanks', 'thank',
]);

export function normalizePrompt(text: string): string {
  const lowered = text.toLowerCase().trim();
  const stripped = lowered.replace(/[^\w\s]/g, ' ');
  const tokens = stripped.split(/\s+/).filter((t) => t.length > 0);
  const filtered = tokens.filter((t) => !STOPWORDS.has(t));
  return filtered.join(' ');
}

export function hashPrompt(text: string): string {
  const normalized = normalizePrompt(text);
  return createHash('sha256').update(normalized).digest('hex');
}

export function hashRaw(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function arePromptsEquivalent(a: string, b: string): boolean {
  return hashPrompt(a) === hashPrompt(b);
}

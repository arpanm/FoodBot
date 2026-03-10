export interface PreprocessedQuery {
  readonly original: string;
  readonly cleaned: string;
  readonly language: string;
  readonly tokens: string[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'and', 'or', 'but', 'not', 'no', 'i', 'me',
  'my', 'want', 'need', 'get', 'give', 'some', 'please',
]);

const HINDI_PATTERN = /[\u0900-\u097F]/;
const CHINESE_PATTERN = /[\u4E00-\u9FFF]/;
const ARABIC_PATTERN = /[\u0600-\u06FF]/;

export function preprocessQuery(raw: string): PreprocessedQuery {
  const original = raw;
  const cleaned = cleanQuery(raw);
  const language = detectLanguage(cleaned);
  const tokens = tokenize(cleaned);

  return { original, cleaned, language, tokens };
}

function cleanQuery(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '');
}

function detectLanguage(text: string): string {
  if (HINDI_PATTERN.test(text)) {
    return 'hi';
  }
  if (CHINESE_PATTERN.test(text)) {
    return 'zh';
  }
  if (ARABIC_PATTERN.test(text)) {
    return 'ar';
  }
  return 'en';
}

function tokenize(cleaned: string): string[] {
  return cleaned
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .filter((token) => !STOP_WORDS.has(token));
}

const FOOD_DICTIONARY: readonly string[] = [
  'biryani', 'pizza', 'burger', 'sushi', 'ramen', 'tacos',
  'pasta', 'noodles', 'curry', 'tandoori', 'kebab', 'falafel',
  'hummus', 'samosa', 'dosa', 'idli', 'paneer', 'tikka',
  'masala', 'naan', 'paratha', 'chapati', 'dal', 'rice',
  'chicken', 'mutton', 'fish', 'prawn', 'shrimp', 'lobster',
  'steak', 'ribs', 'wings', 'nuggets', 'fries', 'salad',
  'sandwich', 'wrap', 'bowl', 'soup', 'dim sum', 'spring roll',
  'pad thai', 'pho', 'gyoza', 'tempura', 'teriyaki', 'miso',
  'momos', 'chole', 'rajma', 'palak', 'butter chicken',
  'chocolate', 'ice cream', 'cake', 'brownie', 'cookie',
  'milkshake', 'smoothie', 'juice', 'coffee', 'tea',
  'chinese', 'italian', 'mexican', 'indian', 'japanese',
  'thai', 'korean', 'mediterranean', 'american', 'french',
  'vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher',
] as const;

export interface SpellCheckResult {
  readonly original: string;
  readonly corrected: string;
  readonly wasCorrected: boolean;
  readonly corrections: TokenCorrection[];
}

export interface TokenCorrection {
  readonly original: string;
  readonly corrected: string;
  readonly distance: number;
}

const MAX_EDIT_DISTANCE = 2;

export function checkSpelling(query: string): SpellCheckResult {
  const tokens = query.split(/\s+/);
  const corrections: TokenCorrection[] = [];
  const correctedTokens: string[] = [];

  for (const token of tokens) {
    const correction = correctToken(token);
    correctedTokens.push(correction.corrected);
    if (correction.original !== correction.corrected) {
      corrections.push(correction);
    }
  }

  const corrected = correctedTokens.join(' ');

  return {
    original: query,
    corrected,
    wasCorrected: corrections.length > 0,
    corrections,
  };
}

function correctToken(token: string): TokenCorrection {
  if (FOOD_DICTIONARY.includes(token)) {
    return { original: token, corrected: token, distance: 0 };
  }

  let bestMatch = token;
  let bestDistance = MAX_EDIT_DISTANCE + 1;

  for (const word of FOOD_DICTIONARY) {
    const distance = levenshteinDistance(token, word);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = word;
    }
  }

  if (bestDistance <= MAX_EDIT_DISTANCE) {
    return { original: token, corrected: bestMatch, distance: bestDistance };
  }

  return { original: token, corrected: token, distance: 0 };
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }

  return dp[m]![n]!;
}

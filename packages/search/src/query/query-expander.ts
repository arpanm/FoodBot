const FOOD_SYNONYMS: ReadonlyMap<string, readonly string[]> = new Map([
  ['burger', ['hamburger', 'cheeseburger']],
  ['pizza', ['flatbread', 'pie']],
  ['fries', ['french fries', 'chips']],
  ['soda', ['soft drink', 'pop', 'cola']],
  ['sub', ['submarine sandwich', 'hoagie', 'hero']],
  ['biryani', ['biriyani', 'briyani']],
  ['kebab', ['kabab', 'kabob']],
  ['naan', ['nan', 'flatbread']],
  ['tikka', ['tikki']],
  ['curry', ['gravy', 'masala']],
  ['momos', ['dumplings', 'dim sum']],
  ['ramen', ['noodle soup']],
  ['wrap', ['burrito', 'roll']],
  ['wings', ['chicken wings', 'buffalo wings']],
  ['steak', ['beef steak', 'sirloin']],
  ['pasta', ['spaghetti', 'penne', 'macaroni']],
  ['salad', ['greens', 'bowl']],
  ['smoothie', ['shake', 'blend']],
  ['tea', ['chai']],
  ['coffee', ['espresso', 'latte', 'cappuccino']],
  ['chinese', ['oriental', 'asian']],
  ['indian', ['desi', 'subcontinental']],
  ['mexican', ['tex-mex', 'latino']],
  ['italian', ['mediterranean']],
  ['spicy', ['hot', 'fiery', 'pungent']],
  ['sweet', ['dessert', 'sugary']],
  ['healthy', ['nutritious', 'low-calorie', 'diet']],
  ['cheap', ['affordable', 'budget', 'value']],
  ['fast', ['quick', 'express', 'speedy']],
]);

export interface ExpandedQuery {
  readonly original: string;
  readonly expandedTerms: string[];
  readonly synonymsUsed: SynonymMatch[];
}

export interface SynonymMatch {
  readonly original: string;
  readonly synonyms: string[];
}

export function expandQuery(query: string): ExpandedQuery {
  const tokens = query.toLowerCase().split(/\s+/);
  const expandedTerms: string[] = [...tokens];
  const synonymsUsed: SynonymMatch[] = [];

  for (const token of tokens) {
    const synonyms = FOOD_SYNONYMS.get(token);
    if (synonyms) {
      expandedTerms.push(...synonyms);
      synonymsUsed.push({ original: token, synonyms: [...synonyms] });
    }
  }

  return {
    original: query,
    expandedTerms: deduplicateTerms(expandedTerms),
    synonymsUsed,
  };
}

function deduplicateTerms(terms: string[]): string[] {
  return [...new Set(terms)];
}

export function getSynonymsFor(term: string): string[] {
  return [...(FOOD_SYNONYMS.get(term.toLowerCase()) ?? [])];
}

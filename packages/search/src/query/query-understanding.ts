import type {
  SearchIntent,
  ExtractedEntity,
  EntityType,
  QueryUnderstanding,
} from '../types/search.types';

const CUISINE_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ['indian', /\b(indian|desi|north indian|south indian)\b/i],
  ['chinese', /\b(chinese|oriental|szechuan|cantonese)\b/i],
  ['italian', /\b(italian|mediterranean)\b/i],
  ['mexican', /\b(mexican|tex-mex)\b/i],
  ['japanese', /\b(japanese|sushi|ramen)\b/i],
  ['thai', /\b(thai|pad thai)\b/i],
  ['korean', /\b(korean|kimchi)\b/i],
  ['american', /\b(american|bbq|barbecue)\b/i],
  ['french', /\b(french|bistro)\b/i],
]);

const DIETARY_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ['vegetarian', /\b(vegetarian|veg|veggie)\b/i],
  ['vegan', /\b(vegan|plant[- ]based)\b/i],
  ['gluten-free', /\b(gluten[- ]free|no gluten|celiac)\b/i],
  ['halal', /\b(halal)\b/i],
  ['kosher', /\b(kosher)\b/i],
  ['keto', /\b(keto|low[- ]carb)\b/i],
  ['dairy-free', /\b(dairy[- ]free|no dairy|lactose[- ]free)\b/i],
]);

const PRICE_PATTERNS: ReadonlyMap<string, RegExp> = new Map([
  ['cheap', /\b(cheap|budget|affordable|inexpensive|value)\b/i],
  ['moderate', /\b(moderate|mid[- ]range|reasonable)\b/i],
  ['expensive', /\b(expensive|premium|fine[- ]dining|upscale|luxury)\b/i],
]);

const DISH_KEYWORDS: readonly string[] = [
  'biryani', 'pizza', 'burger', 'sushi', 'ramen', 'tacos',
  'pasta', 'noodles', 'curry', 'tandoori', 'kebab', 'falafel',
  'hummus', 'samosa', 'dosa', 'idli', 'paneer', 'tikka',
  'momos', 'steak', 'wings', 'fries', 'salad', 'sandwich',
  'wrap', 'soup', 'cake', 'brownie', 'ice cream',
] as const;

const RESTAURANT_INDICATORS: readonly string[] = [
  'restaurant', 'place', 'shop', 'cafe', 'bistro', 'diner',
  'eatery', 'joint', 'outlet', 'chain', 'nearby', 'open now',
] as const;

const FILTER_INDICATORS: readonly string[] = [
  'under', 'less than', 'more than', 'within', 'above',
  'below', 'between', 'rated', 'star', 'min', 'max',
] as const;

export function understandQuery(
  normalizedQuery: string,
  expandedTerms: string[] = []
): QueryUnderstanding {
  const intent = classifyIntent(normalizedQuery);
  const entities = extractEntities(normalizedQuery);

  return {
    intent,
    entities,
    normalizedQuery,
    expandedTerms,
  };
}

export function classifyIntent(query: string): SearchIntent {
  const lowerQuery = query.toLowerCase();

  if (matchesAny(lowerQuery, FILTER_INDICATORS)) {
    return 'filter_command';
  }

  if (matchesAny(lowerQuery, RESTAURANT_INDICATORS)) {
    return 'restaurant_search';
  }

  return 'food_search';
}

export function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  entities.push(...extractCuisines(query));
  entities.push(...extractDietary(query));
  entities.push(...extractPriceRange(query));
  entities.push(...extractDishes(query));

  return entities;
}

function extractCuisines(query: string): ExtractedEntity[] {
  return matchPatterns(query, CUISINE_PATTERNS, 'cuisine');
}

function extractDietary(query: string): ExtractedEntity[] {
  return matchPatterns(query, DIETARY_PATTERNS, 'dietary');
}

function extractPriceRange(query: string): ExtractedEntity[] {
  return matchPatterns(query, PRICE_PATTERNS, 'price_range');
}

function extractDishes(query: string): ExtractedEntity[] {
  const lowerQuery = query.toLowerCase();

  return DISH_KEYWORDS
    .filter((dish) => lowerQuery.includes(dish))
    .map((dish) => ({
      type: 'dish' as EntityType,
      value: dish,
      confidence: 0.9,
    }));
}

function matchPatterns(
  query: string,
  patterns: ReadonlyMap<string, RegExp>,
  type: EntityType
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  for (const [value, pattern] of patterns) {
    if (pattern.test(query)) {
      entities.push({ type, value, confidence: 0.85 });
    }
  }

  return entities;
}

function matchesAny(query: string, indicators: readonly string[]): boolean {
  return indicators.some((indicator) => query.includes(indicator));
}

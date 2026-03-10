export interface AutocompleteResult {
  readonly suggestions: AutocompleteSuggestion[];
}

export interface AutocompleteSuggestion {
  readonly text: string;
  readonly score: number;
  readonly source: 'popular' | 'personalized' | 'prefix';
}

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  popularity: number;
  text: string;
}

export class Autocompleter {
  private readonly root: TrieNode;
  private readonly userHistory: Map<string, string[]>;

  constructor() {
    this.root = createNode('');
    this.userHistory = new Map();
  }

  addTerm(term: string, popularity: number = 1): void {
    let current = this.root;
    const lowerTerm = term.toLowerCase();

    for (const char of lowerTerm) {
      if (!current.children.has(char)) {
        current.children.set(char, createNode(''));
      }
      current = current.children.get(char)!;
    }

    current.isEnd = true;
    current.popularity = popularity;
    current.text = lowerTerm;
  }

  addUserHistory(userId: string, query: string): void {
    const history = this.userHistory.get(userId) ?? [];
    history.push(query.toLowerCase());
    this.userHistory.set(userId, history);
  }

  suggest(
    prefix: string,
    limit: number = 10,
    userId?: string
  ): AutocompleteResult {
    const lowerPrefix = prefix.toLowerCase();
    const prefixSuggestions = this.findByPrefix(lowerPrefix, limit);
    const personalizedSuggestions = this.getPersonalized(lowerPrefix, userId);

    const merged = mergeAndDeduplicate(
      personalizedSuggestions,
      prefixSuggestions,
      limit
    );

    return { suggestions: merged };
  }

  private findByPrefix(
    prefix: string,
    limit: number
  ): AutocompleteSuggestion[] {
    const node = this.traverseToNode(prefix);
    if (!node) {
      return [];
    }

    const results: AutocompleteSuggestion[] = [];
    this.collectWords(node, results, limit);

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private traverseToNode(prefix: string): TrieNode | null {
    let current: TrieNode | undefined = this.root;
    for (const char of prefix) {
      current = current.children.get(char);
      if (!current) {
        return null;
      }
    }
    return current;
  }

  private collectWords(
    node: TrieNode,
    results: AutocompleteSuggestion[],
    limit: number
  ): void {
    if (results.length >= limit) {
      return;
    }

    if (node.isEnd) {
      results.push({
        text: node.text,
        score: node.popularity,
        source: node.popularity > 10 ? 'popular' : 'prefix',
      });
    }

    for (const child of node.children.values()) {
      this.collectWords(child, results, limit);
    }
  }

  private getPersonalized(
    prefix: string,
    userId?: string
  ): AutocompleteSuggestion[] {
    if (!userId) {
      return [];
    }

    const history = this.userHistory.get(userId) ?? [];

    return history
      .filter((q) => q.startsWith(prefix))
      .map((text) => ({
        text,
        score: 100,
        source: 'personalized' as const,
      }));
  }
}

function createNode(text: string): TrieNode {
  return {
    children: new Map(),
    isEnd: false,
    popularity: 0,
    text,
  };
}

function mergeAndDeduplicate(
  personalized: AutocompleteSuggestion[],
  prefix: AutocompleteSuggestion[],
  limit: number
): AutocompleteSuggestion[] {
  const seen = new Set<string>();
  const merged: AutocompleteSuggestion[] = [];

  for (const suggestion of [...personalized, ...prefix]) {
    if (!seen.has(suggestion.text) && merged.length < limit) {
      seen.add(suggestion.text);
      merged.push(suggestion);
    }
  }

  return merged;
}

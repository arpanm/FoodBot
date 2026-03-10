import type {
  SearchQuery,
  SearchResponse,
  SearchDocument,
  SearchResult,
  FusedResult,
  FacetResult,
} from '../types/search.types';
import type { FacetType } from '../types/facet.types';
import { preprocessQuery } from '../query/query-preprocessor';
import { checkSpelling } from '../query/spell-checker';
import { expandQuery } from '../query/query-expander';
import { understandQuery } from '../query/query-understanding';
import { KeywordSearcher } from '../engine/keyword-searcher';
import type { SemanticSearcher } from '../engine/semantic-searcher';
import { fuseResults, type FusionConfig } from '../engine/score-fusion';
import { searchByRadius } from '../engine/geo-spatial-searcher';
import {
  applyPreferenceBoosts,
  type PreferenceProvider,
} from '../ranking/preference-booster';
import { applyContextualBoosts } from '../ranking/contextual-ranker';
import { applyPopularityBoosts } from '../ranking/popularity-booster';
import { FacetEngine } from '../facets/facet-engine';
import { applyFilters } from '../facets/filter-applier';
import { QueryLogger } from '../analytics/query-logger';

export interface SearchOrchestratorConfig {
  readonly fusionConfig?: FusionConfig;
  readonly semanticSearcher?: SemanticSearcher;
  readonly preferenceProvider?: PreferenceProvider;
  readonly enableSpellCheck?: boolean;
  readonly enableQueryExpansion?: boolean;
  readonly enablePersonalization?: boolean;
  readonly enablePopularity?: boolean;
  readonly geoRadiusKm?: number;
}

const DEFAULT_LIMIT = 20;

export class SearchOrchestrator {
  private readonly keywordSearcher: KeywordSearcher;
  private readonly facetEngine: FacetEngine;
  private readonly queryLogger: QueryLogger;
  private readonly config: SearchOrchestratorConfig;
  private documents: SearchDocument[] = [];
  private queryCounter: number = 0;

  constructor(config: SearchOrchestratorConfig = {}) {
    this.config = config;
    this.keywordSearcher = new KeywordSearcher();
    this.facetEngine = new FacetEngine();
    this.queryLogger = new QueryLogger();
  }

  indexDocuments(docs: SearchDocument[]): void {
    this.documents = docs;
    this.keywordSearcher.indexDocuments(docs);
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    const queryId = this.generateQueryId();

    const preprocessed = preprocessQuery(query.text);
    const spellResult = this.runSpellCheck(preprocessed.cleaned);
    const queryText = spellResult.corrected;
    const expanded = this.runQueryExpansion(queryText);
    const understanding = understandQuery(queryText, expanded.expandedTerms);

    const filteredDocs = this.applyPreFilters(query);
    const keywordResults = this.keywordSearcher.search(
      expanded.expandedTerms,
      query.limit ?? DEFAULT_LIMIT
    );
    const semanticResults = await this.runSemanticSearch(queryText, query.limit);
    const geoResults = this.runGeoSearch(filteredDocs, query);
    let fused = fuseResults(keywordResults, semanticResults, this.config.fusionConfig);

    fused = this.mergeGeoResults(fused, geoResults);
    fused = await this.applyPersonalization(fused, query);
    fused = this.applyRankingBoosts(fused, query);
    fused = this.applyLimitOffset(fused, query);

    const facets = this.buildFacets(filteredDocs, query);
    const latencyMs = Date.now() - startTime;

    this.logQuery(queryId, query, fused.length, latencyMs, understanding.intent);

    return {
      results: fused,
      totalCount: fused.length,
      queryId,
      latencyMs,
      facets,
      correctedQuery: spellResult.wasCorrected ? spellResult.corrected : undefined,
      suggestions: expanded.expandedTerms.slice(0, 5),
    };
  }

  getQueryLogger(): QueryLogger {
    return this.queryLogger;
  }

  private runSpellCheck(query: string): { corrected: string; wasCorrected: boolean } {
    if (this.config.enableSpellCheck === false) {
      return { corrected: query, wasCorrected: false };
    }
    const result = checkSpelling(query);
    return { corrected: result.corrected, wasCorrected: result.wasCorrected };
  }

  private runQueryExpansion(query: string): { expandedTerms: string[] } {
    if (this.config.enableQueryExpansion === false) {
      return { expandedTerms: query.split(/\s+/) };
    }
    return expandQuery(query);
  }

  private applyPreFilters(query: SearchQuery): SearchDocument[] {
    if (!query.filters) {
      return this.documents;
    }
    return applyFilters(this.documents, query.filters);
  }

  private async runSemanticSearch(
    queryText: string,
    limit?: number
  ): Promise<SearchResult[]> {
    if (!this.config.semanticSearcher) {
      return [];
    }
    return this.config.semanticSearcher.search(queryText, limit ?? DEFAULT_LIMIT);
  }

  private runGeoSearch(
    docs: SearchDocument[],
    query: SearchQuery
  ): FusedResult[] {
    const location = query.filters?.location ?? query.context?.location;
    if (!location) {
      return [];
    }

    const geoResults = searchByRadius(docs, location, {
      radiusKm: this.config.geoRadiusKm ?? 10,
    });

    return geoResults.map((r) => ({
      document: r.document,
      fusedScore: r.score * 0.2,
    }));
  }

  private mergeGeoResults(
    fused: FusedResult[],
    geoResults: FusedResult[]
  ): FusedResult[] {
    const merged = new Map<string, FusedResult>();

    for (const result of fused) {
      merged.set(result.document.id, result);
    }

    for (const geo of geoResults) {
      const existing = merged.get(geo.document.id);
      if (existing) {
        merged.set(geo.document.id, {
          ...existing,
          fusedScore: existing.fusedScore + geo.fusedScore,
        });
      }
    }

    return [...merged.values()].sort((a, b) => b.fusedScore - a.fusedScore);
  }

  private async applyPersonalization(
    results: FusedResult[],
    query: SearchQuery
  ): Promise<FusedResult[]> {
    if (this.config.enablePersonalization === false || !this.config.preferenceProvider) {
      return results;
    }
    return applyPreferenceBoosts(results, query.userId, this.config.preferenceProvider);
  }

  private applyRankingBoosts(
    results: FusedResult[],
    query: SearchQuery
  ): FusedResult[] {
    let boosted = applyContextualBoosts(results, query.context);

    if (this.config.enablePopularity !== false) {
      boosted = applyPopularityBoosts(boosted);
    }

    return boosted;
  }

  private applyLimitOffset(
    results: FusedResult[],
    query: SearchQuery
  ): FusedResult[] {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? DEFAULT_LIMIT;
    return results.slice(offset, offset + limit);
  }

  private buildFacets(docs: SearchDocument[], query: SearchQuery): FacetResult[] {
    const selectedValues = new Map<FacetType, string[]>();

    if (query.filters?.cuisine) {
      selectedValues.set('cuisine', query.filters.cuisine);
    }

    const facets = this.facetEngine.buildFacets(
      docs,
      selectedValues,
      query.filters?.location ?? query.context?.location
    );

    return facets.map((f) => ({
      name: f.type,
      buckets: f.buckets.map((b) => ({
        value: b.value,
        count: b.count,
        selected: b.selected,
      })),
    }));
  }

  private generateQueryId(): string {
    this.queryCounter++;
    return `q-${Date.now()}-${this.queryCounter}`;
  }

  private logQuery(
    queryId: string,
    query: SearchQuery,
    resultCount: number,
    latencyMs: number,
    intent?: string
  ): void {
    this.queryLogger.log({
      queryId,
      userId: query.userId,
      query: query.text,
      resultCount,
      latencyMs,
      timestamp: Date.now(),
      intent,
    });
  }
}

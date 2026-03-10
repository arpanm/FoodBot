/**
 * Builder for constructing Qdrant-compatible filter conditions.
 * Supports must, should, must_not, range, keyword, and geo filters.
 */

import type {
  FilterCondition,
  FieldCondition,
  MatchCondition,
  RangeCondition,
  KeywordCondition,
  GeoCondition,
} from '../types/vector-store.types.js';

export class FilterBuilder {
  private mustConditions: FieldCondition[] = [];
  private shouldConditions: FieldCondition[] = [];
  private mustNotConditions: FieldCondition[] = [];

  must(condition: FieldCondition): FilterBuilder {
    this.mustConditions.push(condition);
    return this;
  }

  should(condition: FieldCondition): FilterBuilder {
    this.shouldConditions.push(condition);
    return this;
  }

  mustNot(condition: FieldCondition): FilterBuilder {
    this.mustNotConditions.push(condition);
    return this;
  }

  match(key: string, value: string | number | boolean): FilterBuilder {
    const condition: MatchCondition = { type: 'match', key, value };
    return this.must(condition);
  }

  range(
    key: string,
    bounds: { gte?: number; lte?: number; gt?: number; lt?: number }
  ): FilterBuilder {
    const condition: RangeCondition = { type: 'range', key, ...bounds };
    return this.must(condition);
  }

  keyword(key: string, values: string[]): FilterBuilder {
    const condition: KeywordCondition = { type: 'keyword', key, values };
    return this.must(condition);
  }

  geo(
    key: string,
    center: { lat: number; lon: number },
    radiusKm: number
  ): FilterBuilder {
    const condition: GeoCondition = { type: 'geo', key, center, radiusKm };
    return this.must(condition);
  }

  excludeMatch(key: string, value: string | number | boolean): FilterBuilder {
    const condition: MatchCondition = { type: 'match', key, value };
    return this.mustNot(condition);
  }

  excludeKeyword(key: string, values: string[]): FilterBuilder {
    const condition: KeywordCondition = { type: 'keyword', key, values };
    return this.mustNot(condition);
  }

  build(): FilterCondition {
    const filter: FilterCondition = {};

    if (this.mustConditions.length > 0) {
      filter.must = [...this.mustConditions];
    }
    if (this.shouldConditions.length > 0) {
      filter.should = [...this.shouldConditions];
    }
    if (this.mustNotConditions.length > 0) {
      filter.must_not = [...this.mustNotConditions];
    }

    return filter;
  }

  reset(): FilterBuilder {
    this.mustConditions = [];
    this.shouldConditions = [];
    this.mustNotConditions = [];
    return this;
  }
}

export function createFilterBuilder(): FilterBuilder {
  return new FilterBuilder();
}

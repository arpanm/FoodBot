export interface QueryLog {
  readonly queryId: string;
  readonly userId?: string;
  readonly query: string;
  readonly correctedQuery?: string;
  readonly resultCount: number;
  readonly latencyMs: number;
  readonly timestamp: number;
  readonly filters?: Record<string, unknown>;
  readonly intent?: string;
}

export interface ClickEvent {
  readonly queryId: string;
  readonly userId?: string;
  readonly resultId: string;
  readonly position: number;
  readonly timestamp: number;
}

export interface ConversionEvent {
  readonly queryId: string;
  readonly userId?: string;
  readonly resultId: string;
  readonly orderId: string;
  readonly timestamp: number;
}

export interface SearchStats {
  readonly totalQueries: number;
  readonly uniqueQueries: number;
  readonly avgLatencyMs: number;
  readonly zeroResultRate: number;
  readonly avgResultCount: number;
}

export interface QualityMetrics {
  readonly clickThroughRate: number;
  readonly conversionRate: number;
  readonly meanReciprocalRank: number;
  readonly avgClickPosition: number;
  readonly topQueries: QueryFrequency[];
  readonly zeroResultQueries: QueryFrequency[];
}

export interface QueryFrequency {
  readonly query: string;
  readonly count: number;
}

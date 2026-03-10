import type { ConversionEvent } from '../types/analytics.types';

export class ConversionTracker {
  private events: ConversionEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents: number = 50000) {
    this.maxEvents = maxEvents;
  }

  trackConversion(event: ConversionEvent): void {
    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  getConversionsByQuery(queryId: string): ConversionEvent[] {
    return this.events.filter((e) => e.queryId === queryId);
  }

  getConversionsByUser(userId: string): ConversionEvent[] {
    return this.events.filter((e) => e.userId === userId);
  }

  getConversionsByResult(resultId: string): ConversionEvent[] {
    return this.events.filter((e) => e.resultId === resultId);
  }

  getConversionCount(): number {
    return this.events.length;
  }

  getUniqueOrderCount(): number {
    const orderIds = new Set(this.events.map((e) => e.orderId));
    return orderIds.size;
  }

  clear(): void {
    this.events = [];
  }
}

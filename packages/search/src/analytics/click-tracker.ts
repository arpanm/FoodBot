import type { ClickEvent } from '../types/analytics.types';

export class ClickTracker {
  private events: ClickEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents: number = 50000) {
    this.maxEvents = maxEvents;
  }

  trackClick(event: ClickEvent): void {
    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  getClicksByQuery(queryId: string): ClickEvent[] {
    return this.events.filter((e) => e.queryId === queryId);
  }

  getClicksByUser(userId: string): ClickEvent[] {
    return this.events.filter((e) => e.userId === userId);
  }

  getClicksByResult(resultId: string): ClickEvent[] {
    return this.events.filter((e) => e.resultId === resultId);
  }

  getAverageClickPosition(): number {
    if (this.events.length === 0) {
      return 0;
    }

    const totalPosition = this.events.reduce(
      (sum, e) => sum + e.position,
      0
    );

    return totalPosition / this.events.length;
  }

  getClickCount(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}

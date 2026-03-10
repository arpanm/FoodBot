import type { QueryLog } from '../types/analytics.types';

export class QueryLogger {
  private logs: QueryLog[] = [];
  private readonly maxLogs: number;

  constructor(maxLogs: number = 10000) {
    this.maxLogs = maxLogs;
  }

  log(entry: QueryLog): void {
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getRecentLogs(limit: number = 100): QueryLog[] {
    return this.logs.slice(-limit);
  }

  getLogsByUser(userId: string, limit: number = 100): QueryLog[] {
    return this.logs
      .filter((log) => log.userId === userId)
      .slice(-limit);
  }

  getLogsByQuery(query: string): QueryLog[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(
      (log) => log.query.toLowerCase() === lowerQuery
    );
  }

  getZeroResultQueries(): QueryLog[] {
    return this.logs.filter((log) => log.resultCount === 0);
  }

  getLogCount(): number {
    return this.logs.length;
  }

  clear(): void {
    this.logs = [];
  }
}

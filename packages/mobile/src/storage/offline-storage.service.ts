export class OfflineStorageService {
  private readonly store: Map<string, string> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    if (value === undefined) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    this.store.set(key, serialized);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async size(): Promise<number> {
    return this.store.size;
  }
}

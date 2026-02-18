import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async increment(key: string): Promise<number> {
    const current = await this.get(key);
    const newVal = current ? parseInt(current, 10) + 1 : 1;
    const entry = this.store.get(key);
    const expiresAt = entry?.expiresAt;
    this.store.set(key, { value: String(newVal), expiresAt });
    return newVal;
  }

  clear(): void {
    this.store.clear();
  }
}

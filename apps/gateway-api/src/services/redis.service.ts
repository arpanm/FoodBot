import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private mockStore = new Map<string, { value: string; expiresAt?: number }>();
  private useMock = false;

  // Cache metrics
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    const nodeEnv = this.configService.get('NODE_ENV', 'development');

    // Use mock in test environment
    if (nodeEnv === 'test') {
      this.useMock = true;
      this.logger.log('Using mock Redis for test environment');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis error:', err);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis ready to accept commands');
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis, falling back to mock', error);
      this.useMock = true;
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useMock || !this.client) {
      return this.mockGet(key);
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        this.cacheHits++;
      } else {
        this.cacheMisses++;
      }
      return value;
    } catch (error) {
      this.logger.error('Redis get error, falling back to mock', error);
      return this.mockGet(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMock || !this.client) {
      return this.mockSet(key, value, ttlSeconds);
    }

    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error('Redis set error, falling back to mock', error);
      return this.mockSet(key, value, ttlSeconds);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.useMock || !this.client) {
      return this.mockDelete(key);
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Redis delete error, falling back to mock', error);
      return this.mockDelete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.useMock || !this.client) {
      return this.mockExists(key);
    }

    try {
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      this.logger.error('Redis exists error, falling back to mock', error);
      return this.mockExists(key);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useMock || !this.client) {
      return this.mockKeys(pattern);
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error('Redis keys error, falling back to mock', error);
      return this.mockKeys(pattern);
    }
  }

  async ttl(key: string): Promise<number> {
    if (this.useMock || !this.client) {
      return this.mockTtl(key);
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error('Redis ttl error, falling back to mock', error);
      return this.mockTtl(key);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.useMock || !this.client) {
      return this.mockExpire(key, seconds);
    }

    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error('Redis expire error, falling back to mock', error);
      return this.mockExpire(key, seconds);
    }
  }

  async increment(key: string): Promise<number> {
    if (this.useMock || !this.client) {
      return this.mockIncrement(key);
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error('Redis increment error, falling back to mock', error);
      return this.mockIncrement(key);
    }
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getCacheHitRate(),
    };
  }

  resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // Mock implementations for fallback and testing
  private mockGet(key: string): string | null {
    const entry = this.mockStore.get(key);
    if (!entry) {
      this.cacheMisses++;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.mockStore.delete(key);
      this.cacheMisses++;
      return null;
    }
    this.cacheHits++;
    return entry.value;
  }

  private mockSet(key: string, value: string, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.mockStore.set(key, { value, expiresAt });
  }

  private mockDelete(key: string): void {
    this.mockStore.delete(key);
  }

  private mockExists(key: string): boolean {
    const val = this.mockGet(key);
    return val !== null;
  }

  private mockKeys(pattern: string): string[] {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.mockStore.keys()).filter((key) => regex.test(key));
  }

  private mockTtl(key: string): number {
    const entry = this.mockStore.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  private mockExpire(key: string, seconds: number): void {
    const entry = this.mockStore.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  private mockIncrement(key: string): number {
    const current = this.mockGet(key);
    const newVal = current ? parseInt(current, 10) + 1 : 1;
    const entry = this.mockStore.get(key);
    const expiresAt = entry?.expiresAt;
    this.mockStore.set(key, { value: String(newVal), expiresAt });
    return newVal;
  }

  clear(): void {
    this.mockStore.clear();
    this.resetCacheStats();
  }
}

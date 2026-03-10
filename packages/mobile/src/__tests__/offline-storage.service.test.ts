import { OfflineStorageService } from '../storage/offline-storage.service';

describe('OfflineStorageService', () => {
  let service: OfflineStorageService;

  beforeEach(() => {
    service = new OfflineStorageService();
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return stored value', async () => {
      await service.set('key', { name: 'test' });
      const result = await service.get<{ name: string }>('key');

      expect(result).toEqual({ name: 'test' });
    });

    it('should return stored string value', async () => {
      await service.set('greeting', 'hello');
      const result = await service.get<string>('greeting');

      expect(result).toBe('hello');
    });

    it('should return stored number value', async () => {
      await service.set('count', 42);
      const result = await service.get<number>('count');

      expect(result).toBe(42);
    });

    it('should return stored array value', async () => {
      await service.set('items', [1, 2, 3]);
      const result = await service.get<number[]>('items');

      expect(result).toEqual([1, 2, 3]);
    });

    it('should return stored boolean value', async () => {
      await service.set('flag', true);
      const result = await service.get<boolean>('flag');

      expect(result).toBe(true);
    });
  });

  describe('set', () => {
    it('should store and retrieve complex objects', async () => {
      const order = {
        id: 'order-123',
        items: [
          { name: 'Burger', price: 10 },
          { name: 'Fries', price: 5 },
        ],
        total: 15,
      };

      await service.set('current-order', order);
      const result = await service.get<typeof order>('current-order');

      expect(result).toEqual(order);
    });

    it('should overwrite existing values', async () => {
      await service.set('key', 'first');
      await service.set('key', 'second');
      const result = await service.get<string>('key');

      expect(result).toBe('second');
    });

    it('should handle null values', async () => {
      await service.set('nullable', null);
      const result = await service.get('nullable');

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove an existing key', async () => {
      await service.set('key', 'value');
      await service.remove('key');
      const result = await service.get('key');

      expect(result).toBeNull();
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(service.remove('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all stored values', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      await service.clear();

      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
      expect(await service.get('key3')).toBeNull();
    });

    it('should result in empty keys list', async () => {
      await service.set('key1', 'value1');
      await service.clear();
      const keys = await service.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('keys', () => {
    it('should return empty array when no keys stored', async () => {
      const keys = await service.keys();
      expect(keys).toEqual([]);
    });

    it('should return all stored keys', async () => {
      await service.set('alpha', 1);
      await service.set('beta', 2);
      await service.set('gamma', 3);

      const keys = await service.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
      expect(keys).toContain('gamma');
    });
  });

  describe('has', () => {
    it('should return false for non-existent key', async () => {
      const result = await service.has('non-existent');
      expect(result).toBe(false);
    });

    it('should return true for existing key', async () => {
      await service.set('existing', 'value');
      const result = await service.has('existing');
      expect(result).toBe(true);
    });
  });

  describe('size', () => {
    it('should return 0 for empty storage', async () => {
      const result = await service.size();
      expect(result).toBe(0);
    });

    it('should return correct count', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      const result = await service.size();
      expect(result).toBe(2);
    });

    it('should decrease after removal', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.remove('key1');

      const result = await service.size();
      expect(result).toBe(1);
    });
  });
});

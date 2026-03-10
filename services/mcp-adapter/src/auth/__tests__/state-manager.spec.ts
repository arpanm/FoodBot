/**
 * Unit tests for StateManager.
 * Tests state generation, validation, replay prevention, and TTL expiry.
 */

import { StateManager } from '../state-manager';
import { InvalidStateError, StateExpiredError } from '../auth.errors';
import type { TokenStore, OAuthProviderName } from '../auth.types';

function createMockStore(): TokenStore & {
  _store: Map<string, { value: string; ttl: number }>;
} {
  const store = new Map<string, { value: string; ttl: number }>();
  return {
    _store: store,
    get: jest.fn(async (key: string): Promise<string | null> => {
      const entry = store.get(key);
      return entry ? entry.value : null;
    }),
    set: jest.fn(async (key: string, value: string, ttl: number): Promise<void> => {
      store.set(key, { value, ttl });
    }),
    del: jest.fn(async (key: string): Promise<void> => {
      store.delete(key);
    }),
  };
}

describe('StateManager', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let stateManager: StateManager;

  beforeEach(() => {
    mockStore = createMockStore();
    stateManager = new StateManager(mockStore);
  });

  describe('generateState', () => {
    it('should generate a hex-encoded state string', async () => {
      const state = await stateManager.generateState(
        'user-123',
        'zomato',
        'test-nonce',
        'test-verifier'
      );

      expect(typeof state).toBe('string');
      expect(state.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]+$/.test(state)).toBe(true);
    });

    it('should generate unique states each call', async () => {
      const state1 = await stateManager.generateState(
        'user-123', 'zomato', 'nonce-1', 'verifier-1'
      );
      const state2 = await stateManager.generateState(
        'user-123', 'zomato', 'nonce-2', 'verifier-2'
      );

      expect(state1).not.toBe(state2);
    });

    it('should store flow state in backing store', async () => {
      const state = await stateManager.generateState(
        'user-123',
        'swiggy',
        'my-nonce',
        'my-verifier'
      );

      expect(mockStore.set).toHaveBeenCalledWith(
        `oauth:state:${state}`,
        expect.any(String),
        600
      );

      // Verify stored data
      const storedEntry = mockStore._store.get(`oauth:state:${state}`);
      expect(storedEntry).toBeDefined();
      const storedState = JSON.parse(storedEntry!.value);
      expect(storedState.userId).toBe('user-123');
      expect(storedState.provider).toBe('swiggy');
      expect(storedState.nonce).toBe('my-nonce');
      expect(storedState.codeVerifier).toBe('my-verifier');
      expect(storedState.createdAt).toBeDefined();
      expect(storedState.expiresAt).toBeDefined();
    });

    it('should store state with custom TTL', async () => {
      const customManager = new StateManager(mockStore, { stateTtlSeconds: 300 });
      await customManager.generateState('user', 'zomato', 'nonce', 'verifier');

      expect(mockStore.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        300
      );
    });

    it('should set correct expiresAt based on TTL', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce', 'verifier'
      );

      const storedEntry = mockStore._store.get(`oauth:state:${state}`);
      const storedState = JSON.parse(storedEntry!.value);
      expect(storedState.expiresAt).toBe(now + 600 * 1000);

      jest.restoreAllMocks();
    });
  });

  describe('validateState', () => {
    it('should validate a valid state and return flow state', async () => {
      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce-abc', 'verifier-xyz'
      );

      const flowState = await stateManager.validateState(state);

      expect(flowState.userId).toBe('user-123');
      expect(flowState.provider).toBe('zomato');
      expect(flowState.nonce).toBe('nonce-abc');
      expect(flowState.codeVerifier).toBe('verifier-xyz');
    });

    it('should delete state after validation (prevent replay)', async () => {
      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce', 'verifier'
      );

      await stateManager.validateState(state);

      expect(mockStore.del).toHaveBeenCalledWith(`oauth:state:${state}`);
    });

    it('should throw InvalidStateError for non-existent state', async () => {
      await expect(
        stateManager.validateState('nonexistent-state')
      ).rejects.toThrow(InvalidStateError);
    });

    it('should throw InvalidStateError on second validation (replay prevention)', async () => {
      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce', 'verifier'
      );

      await stateManager.validateState(state);

      await expect(stateManager.validateState(state)).rejects.toThrow(
        InvalidStateError
      );
    });

    it('should throw StateExpiredError for expired state', async () => {
      const now = Date.now();
      const tenMinutesAgo = now - 11 * 60 * 1000;

      // Manually store an expired state
      const expiredState = {
        userId: 'user-123',
        provider: 'zomato' as OAuthProviderName,
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: tenMinutesAgo,
        expiresAt: tenMinutesAgo + 600 * 1000, // expired
      };

      mockStore._store.set('oauth:state:expired-state', {
        value: JSON.stringify(expiredState),
        ttl: 600,
      });

      await expect(
        stateManager.validateState('expired-state')
      ).rejects.toThrow(StateExpiredError);
    });
  });

  describe('hasState', () => {
    it('should return true for existing state', async () => {
      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce', 'verifier'
      );

      const exists = await stateManager.hasState(state);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing state', async () => {
      const exists = await stateManager.hasState('does-not-exist');
      expect(exists).toBe(false);
    });

    it('should not consume the state (non-destructive check)', async () => {
      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce', 'verifier'
      );

      await stateManager.hasState(state);
      await stateManager.hasState(state);

      // State should still be valid
      const flowState = await stateManager.validateState(state);
      expect(flowState.userId).toBe('user-123');
    });
  });

  describe('invalidateState', () => {
    it('should remove state from store', async () => {
      const state = await stateManager.generateState(
        'user-123', 'zomato', 'nonce', 'verifier'
      );

      await stateManager.invalidateState(state);

      const exists = await stateManager.hasState(state);
      expect(exists).toBe(false);
    });

    it('should not throw for non-existing state', async () => {
      await expect(
        stateManager.invalidateState('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('generateNonce', () => {
    it('should generate a hex-encoded nonce', () => {
      const nonce = StateManager.generateNonce();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(32); // 16 bytes = 32 hex chars
      expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
    });

    it('should generate unique nonces', () => {
      const nonce1 = StateManager.generateNonce();
      const nonce2 = StateManager.generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('full flow: generate -> validate -> replay rejected', () => {
    it('should complete the full lifecycle', async () => {
      // Generate
      const state = await stateManager.generateState(
        'user-abc', 'swiggy', 'nonce-123', 'verifier-456'
      );
      expect(state).toBeDefined();

      // Verify exists
      expect(await stateManager.hasState(state)).toBe(true);

      // Validate (consumes state)
      const flowState = await stateManager.validateState(state);
      expect(flowState.userId).toBe('user-abc');
      expect(flowState.provider).toBe('swiggy');

      // Verify consumed
      expect(await stateManager.hasState(state)).toBe(false);

      // Replay rejected
      await expect(stateManager.validateState(state)).rejects.toThrow(
        InvalidStateError
      );
    });
  });
});

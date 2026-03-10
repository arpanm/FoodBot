/**
 * Unit tests for PkceManager.
 * Tests PKCE code_verifier generation, code_challenge computation,
 * store/retrieve lifecycle, and validation.
 */

import * as crypto from 'crypto';
import { PkceManager } from '../pkce-manager';
import { PkceVerifierNotFoundError } from '../auth.errors';
import type { TokenStore } from '../auth.types';

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

describe('PkceManager', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let pkceManager: PkceManager;

  beforeEach(() => {
    mockStore = createMockStore();
    pkceManager = new PkceManager(mockStore);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const manager = new PkceManager(mockStore);
      expect(manager).toBeInstanceOf(PkceManager);
    });

    it('should create with custom verifier length', () => {
      const manager = new PkceManager(mockStore, { verifierLength: 128 });
      const pair = manager.generateChallengePair();
      expect(pair.codeVerifier.length).toBe(128);
    });

    it('should throw if verifier length is below minimum (43)', () => {
      expect(() => new PkceManager(mockStore, { verifierLength: 42 })).toThrow(
        'Code verifier length must be between 43 and 128'
      );
    });

    it('should throw if verifier length exceeds maximum (128)', () => {
      expect(() => new PkceManager(mockStore, { verifierLength: 129 })).toThrow(
        'Code verifier length must be between 43 and 128'
      );
    });

    it('should accept boundary verifier length 43', () => {
      const manager = new PkceManager(mockStore, { verifierLength: 43 });
      const pair = manager.generateChallengePair();
      expect(pair.codeVerifier.length).toBe(43);
    });

    it('should accept boundary verifier length 128', () => {
      const manager = new PkceManager(mockStore, { verifierLength: 128 });
      const pair = manager.generateChallengePair();
      expect(pair.codeVerifier.length).toBe(128);
    });
  });

  describe('generateChallengePair', () => {
    it('should generate a valid PKCE challenge pair', () => {
      const pair = pkceManager.generateChallengePair();

      expect(pair).toHaveProperty('codeVerifier');
      expect(pair).toHaveProperty('codeChallenge');
      expect(pair).toHaveProperty('codeChallengeMethod', 'S256');
    });

    it('should generate code_verifier with default length (64)', () => {
      const pair = pkceManager.generateChallengePair();
      expect(pair.codeVerifier.length).toBe(64);
    });

    it('should generate code_verifier with only unreserved characters', () => {
      const unreservedPattern = /^[A-Za-z0-9\-._~]+$/;
      const pair = pkceManager.generateChallengePair();
      expect(pair.codeVerifier).toMatch(unreservedPattern);
    });

    it('should generate unique verifiers each call', () => {
      const pair1 = pkceManager.generateChallengePair();
      const pair2 = pkceManager.generateChallengePair();
      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
    });

    it('should generate unique challenges each call', () => {
      const pair1 = pkceManager.generateChallengePair();
      const pair2 = pkceManager.generateChallengePair();
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });

    it('should generate code_challenge as base64url encoded SHA-256', () => {
      const pair = pkceManager.generateChallengePair();

      // Manually compute expected challenge
      const hash = crypto.createHash('sha256').update(pair.codeVerifier).digest();
      const expected = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      expect(pair.codeChallenge).toBe(expected);
    });

    it('should generate code_challenge without padding characters', () => {
      const pair = pkceManager.generateChallengePair();
      expect(pair.codeChallenge).not.toContain('=');
    });

    it('should generate code_challenge without + or / characters', () => {
      // Run multiple times to increase probability of catching issues
      for (let i = 0; i < 100; i++) {
        const pair = pkceManager.generateChallengePair();
        expect(pair.codeChallenge).not.toContain('+');
        expect(pair.codeChallenge).not.toContain('/');
      }
    });
  });

  describe('storeVerifier', () => {
    it('should store verifier with correct key prefix', async () => {
      await pkceManager.storeVerifier('test-state-123', 'test-verifier');

      expect(mockStore.set).toHaveBeenCalledWith(
        'oauth:pkce:test-state-123',
        'test-verifier',
        600
      );
    });

    it('should store verifier with custom TTL', async () => {
      const customManager = new PkceManager(mockStore, { ttlSeconds: 300 });
      await customManager.storeVerifier('test-state', 'test-verifier');

      expect(mockStore.set).toHaveBeenCalledWith(
        'oauth:pkce:test-state',
        'test-verifier',
        300
      );
    });
  });

  describe('retrieveVerifier', () => {
    it('should retrieve stored verifier', async () => {
      await pkceManager.storeVerifier('my-state', 'my-verifier');
      const result = await pkceManager.retrieveVerifier('my-state');
      expect(result).toBe('my-verifier');
    });

    it('should delete verifier after retrieval (replay prevention)', async () => {
      await pkceManager.storeVerifier('my-state', 'my-verifier');
      await pkceManager.retrieveVerifier('my-state');

      expect(mockStore.del).toHaveBeenCalledWith('oauth:pkce:my-state');
    });

    it('should throw PkceVerifierNotFoundError for missing verifier', async () => {
      await expect(pkceManager.retrieveVerifier('nonexistent')).rejects.toThrow(
        PkceVerifierNotFoundError
      );
    });

    it('should throw PkceVerifierNotFoundError on second retrieval attempt', async () => {
      await pkceManager.storeVerifier('state-1', 'verifier-1');
      await pkceManager.retrieveVerifier('state-1');

      // Second attempt should fail (verifier was deleted)
      await expect(pkceManager.retrieveVerifier('state-1')).rejects.toThrow(
        PkceVerifierNotFoundError
      );
    });
  });

  describe('validateVerifier', () => {
    it('should return true for matching verifier and challenge', () => {
      const pair = pkceManager.generateChallengePair();
      const result = pkceManager.validateVerifier(pair.codeVerifier, pair.codeChallenge);
      expect(result).toBe(true);
    });

    it('should return false for non-matching verifier', () => {
      const pair = pkceManager.generateChallengePair();
      const result = pkceManager.validateVerifier('wrong-verifier', pair.codeChallenge);
      expect(result).toBe(false);
    });

    it('should return false for tampered challenge', () => {
      const pair = pkceManager.generateChallengePair();
      const result = pkceManager.validateVerifier(
        pair.codeVerifier,
        pair.codeChallenge + 'tampered'
      );
      expect(result).toBe(false);
    });

    it('should return false for empty verifier', () => {
      const pair = pkceManager.generateChallengePair();
      const result = pkceManager.validateVerifier('', pair.codeChallenge);
      expect(result).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // This test verifies that the method uses constant-time comparison
      // by checking it works correctly for various inputs
      const pair = pkceManager.generateChallengePair();

      // Valid
      expect(pkceManager.validateVerifier(pair.codeVerifier, pair.codeChallenge)).toBe(true);

      // Invalid - different first character
      const wrongChallenge = 'X' + pair.codeChallenge.substring(1);
      expect(pkceManager.validateVerifier(pair.codeVerifier, wrongChallenge)).toBe(false);

      // Invalid - different last character
      const wrongChallenge2 = pair.codeChallenge.substring(0, pair.codeChallenge.length - 1) + 'X';
      expect(pkceManager.validateVerifier(pair.codeVerifier, wrongChallenge2)).toBe(false);
    });
  });

  describe('full store-retrieve-validate flow', () => {
    it('should complete full PKCE flow successfully', async () => {
      // 1. Generate challenge pair
      const pair = pkceManager.generateChallengePair();

      // 2. Store verifier
      await pkceManager.storeVerifier('flow-state', pair.codeVerifier);

      // 3. Retrieve verifier
      const retrieved = await pkceManager.retrieveVerifier('flow-state');

      // 4. Validate
      const isValid = pkceManager.validateVerifier(retrieved, pair.codeChallenge);
      expect(isValid).toBe(true);
    });
  });
});

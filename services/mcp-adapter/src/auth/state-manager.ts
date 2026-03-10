/**
 * OAuth State Manager for CSRF protection.
 *
 * - Generates cryptographically random state parameters
 * - Stores state in Redis with configurable TTL (default 10 minutes)
 * - Validates state on callback and deletes to prevent replay attacks
 * - Associates state with userId, provider, nonce, and PKCE verifier
 */

import * as crypto from 'crypto';
import type {
  TokenStore,
  OAuthFlowState,
  OAuthProviderName,
  StateManagerConfig,
} from './auth.types.js';
import { InvalidStateError, StateExpiredError } from './auth.errors.js';

const DEFAULT_STATE_TTL_SECONDS = 600; // 10 minutes
const STATE_BYTE_LENGTH = 32; // 256-bit random state

export class StateManager {
  private readonly store: TokenStore;
  private readonly ttlSeconds: number;

  constructor(store: TokenStore, config?: StateManagerConfig) {
    this.store = store;
    this.ttlSeconds = config?.stateTtlSeconds ?? DEFAULT_STATE_TTL_SECONDS;
  }

  /**
   * Generate a cryptographically random state parameter and store
   * the associated flow state in the backing store.
   *
   * @returns The generated state string
   */
  async generateState(
    userId: string,
    provider: OAuthProviderName,
    nonce: string,
    codeVerifier: string
  ): Promise<string> {
    const state = this.generateRandomState();
    const now = Date.now();

    const flowState: OAuthFlowState = {
      userId,
      provider,
      nonce,
      codeVerifier,
      createdAt: now,
      expiresAt: now + this.ttlSeconds * 1000,
    };

    const key = this.buildStoreKey(state);
    await this.store.set(key, JSON.stringify(flowState), this.ttlSeconds);

    return state;
  }

  /**
   * Validate a state parameter from an OAuth callback.
   * Retrieves the flow state, validates expiry, and deletes to prevent replay.
   *
   * @returns The associated flow state
   * @throws InvalidStateError if state is not found
   * @throws StateExpiredError if state has expired
   */
  async validateState(state: string): Promise<OAuthFlowState> {
    const key = this.buildStoreKey(state);
    const raw = await this.store.get(key);

    if (!raw) {
      throw new InvalidStateError({ state: this.redactState(state) });
    }

    // Delete immediately to prevent replay attacks
    await this.store.del(key);

    const flowState = JSON.parse(raw) as OAuthFlowState;

    if (Date.now() > flowState.expiresAt) {
      throw new StateExpiredError({
        state: this.redactState(state),
        createdAt: flowState.createdAt,
        expiresAt: flowState.expiresAt,
      });
    }

    return flowState;
  }

  /**
   * Check if a state parameter exists (without consuming it).
   */
  async hasState(state: string): Promise<boolean> {
    const key = this.buildStoreKey(state);
    const raw = await this.store.get(key);
    return raw !== null;
  }

  /**
   * Explicitly invalidate a state parameter.
   * Used for cleanup if the flow is abandoned.
   */
  async invalidateState(state: string): Promise<void> {
    const key = this.buildStoreKey(state);
    await this.store.del(key);
  }

  /**
   * Generate a cryptographically random state string.
   * Uses crypto.randomBytes for security, encoded as hex.
   */
  private generateRandomState(): string {
    return crypto.randomBytes(STATE_BYTE_LENGTH).toString('hex');
  }

  /**
   * Generate a cryptographically random nonce.
   */
  static generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Redact a state string for safe logging (show first 8 chars).
   */
  private redactState(state: string): string {
    if (state.length <= 8) {
      return '***';
    }
    return `${state.substring(0, 8)}...`;
  }

  private buildStoreKey(state: string): string {
    return `oauth:state:${state}`;
  }
}

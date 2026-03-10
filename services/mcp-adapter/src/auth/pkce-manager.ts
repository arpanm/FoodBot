/**
 * PKCE (Proof Key for Code Exchange) Manager for OAuth 2.1.
 * Implements RFC 7636 with S256 code challenge method.
 *
 * - Generates cryptographically secure code_verifier (43-128 chars)
 * - Computes code_challenge using SHA-256 + base64url encoding
 * - Stores verifier in Redis-backed store with TTL for callback validation
 * - Validates verifier on callback
 */

import * as crypto from 'crypto';
import type { TokenStore, PkceChallengePair } from './auth.types.js';
import { PkceVerifierNotFoundError, PkceVerificationError } from './auth.errors.js';

const VERIFIER_MIN_LENGTH = 43;
const VERIFIER_MAX_LENGTH = 128;
const DEFAULT_VERIFIER_LENGTH = 64;
const DEFAULT_TTL_SECONDS = 600; // 10 minutes

/** Characters allowed in code_verifier per RFC 7636 */
const UNRESERVED_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export interface PkceManagerConfig {
  verifierLength?: number;
  ttlSeconds?: number;
}

export class PkceManager {
  private readonly store: TokenStore;
  private readonly verifierLength: number;
  private readonly ttlSeconds: number;

  constructor(store: TokenStore, config?: PkceManagerConfig) {
    this.store = store;

    const length = config?.verifierLength ?? DEFAULT_VERIFIER_LENGTH;
    if (length < VERIFIER_MIN_LENGTH || length > VERIFIER_MAX_LENGTH) {
      throw new Error(
        `Code verifier length must be between ${VERIFIER_MIN_LENGTH} and ${VERIFIER_MAX_LENGTH}, got ${length}`
      );
    }
    this.verifierLength = length;
    this.ttlSeconds = config?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  }

  /**
   * Generate a PKCE challenge pair (code_verifier + code_challenge).
   * The verifier is generated using crypto.randomBytes for security.
   */
  generateChallengePair(): PkceChallengePair {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.computeCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Store the code verifier associated with a state parameter.
   * The verifier is stored with a TTL and retrieved during callback.
   */
  async storeVerifier(state: string, codeVerifier: string): Promise<void> {
    const key = this.buildStoreKey(state);
    await this.store.set(key, codeVerifier, this.ttlSeconds);
  }

  /**
   * Retrieve and remove the code verifier for a given state.
   * Deletion prevents replay attacks.
   */
  async retrieveVerifier(state: string): Promise<string> {
    const key = this.buildStoreKey(state);
    const verifier = await this.store.get(key);

    if (!verifier) {
      throw new PkceVerifierNotFoundError({ state });
    }

    // Delete immediately to prevent replay
    await this.store.del(key);

    return verifier;
  }

  /**
   * Validate that a code_verifier matches a code_challenge.
   * Used during callback to verify PKCE integrity.
   */
  validateVerifier(codeVerifier: string, codeChallenge: string): boolean {
    const computedChallenge = this.computeCodeChallenge(codeVerifier);
    return this.timingSafeCompare(computedChallenge, codeChallenge);
  }

  /**
   * Generate a cryptographically secure code_verifier.
   * Uses crypto.randomBytes mapped to unreserved characters per RFC 7636.
   */
  private generateCodeVerifier(): string {
    const randomBytes = crypto.randomBytes(this.verifierLength);
    const charsetLength = UNRESERVED_CHARACTERS.length;

    let verifier = '';
    for (let i = 0; i < this.verifierLength; i++) {
      const byte = randomBytes[i];
      if (byte === undefined) {
        throw new Error('Unexpected undefined byte in random buffer');
      }
      verifier += UNRESERVED_CHARACTERS[byte % charsetLength];
    }

    return verifier;
  }

  /**
   * Compute the S256 code_challenge from a code_verifier.
   * code_challenge = BASE64URL(SHA256(code_verifier))
   */
  private computeCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return this.base64UrlEncode(hash);
  }

  /**
   * Base64url encoding per RFC 4648 Section 5.
   * Replaces + with -, / with _, and removes = padding.
   */
  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  private buildStoreKey(state: string): string {
    return `oauth:pkce:${state}`;
  }
}

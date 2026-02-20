# Extract OAuth Service to Eliminate Duplication

**Task ID:** TD-002
**Priority:** High
**Status:** Open
**Created:** 2026-02-20
**Source:** MCP Code Review (2026-02-19)
**Estimated Effort:** 6-8 hours

---

## Issue Summary

OAuth token management logic is duplicated across Swiggy and Zomato authentication modules with 90% identical code.

**Files:**
- `/services/mcp-adapter/src/auth/swiggyAuth.ts` (lines 125-145)
- `/services/mcp-adapter/src/auth/zomatoAuth.ts` (lines 128-148)

**Duplication:** 20 lines × 2 files = 40 lines of duplicated code

---

## Problem Description

### Current Code Structure

Both Swiggy and Zomato authentication modules implement nearly identical OAuth token management:

**SwiggyAuth.ts:**
```typescript
class SwiggyAuthService {
  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://api.swiggy.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new TokenRefreshError('Failed to refresh Swiggy token');
    }

    const data = await response.json();
    await this.storeTokens(data.access_token, data.refresh_token);

    return data;
  }

  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    const encrypted = this.encryptToken(accessToken);
    await this.db.tokens.upsert({
      provider: 'swiggy',
      userId: this.userId,
      accessToken: encrypted,
      refreshToken: this.encryptToken(refreshToken),
      expiresAt: new Date(Date.now() + 3600000),
    });
  }

  private encryptToken(token: string): string {
    // AES-256-GCM encryption
    // ... 15 lines of encryption logic
  }
}
```

**ZomatoAuth.ts:**
```typescript
class ZomatoAuthService {
  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://api.zomato.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new TokenRefreshError('Failed to refresh Zomato token');
    }

    const data = await response.json();
    await this.storeTokens(data.access_token, data.refresh_token);

    return data;
  }

  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    const encrypted = this.encryptToken(accessToken);
    await this.db.tokens.upsert({
      provider: 'zomato',
      userId: this.userId,
      accessToken: encrypted,
      refreshToken: this.encryptToken(refreshToken),
      expiresAt: new Date(Date.now() + 3600000),
    });
  }

  private encryptToken(token: string): string {
    // AES-256-GCM encryption
    // ... 15 lines of encryption logic (IDENTICAL to Swiggy)
  }
}
```

### Issues

1. **Code Duplication:** 90% identical logic across two files
2. **Maintenance Burden:** Bug fixes must be applied twice
3. **Inconsistency Risk:** Changes to one may be missed in the other
4. **Testing Overhead:** Same tests duplicated for both providers
5. **Violation of DRY Principle:** Don't Repeat Yourself

---

## Proposed Solution

### Strategy: Extract to Shared OAuth Service

Create a generic `OAuthService` class that both Swiggy and Zomato can use:

```typescript
// New file: services/mcp-adapter/src/auth/OAuthService.ts

export interface OAuthConfig {
  provider: 'swiggy' | 'zomato';
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  redirectUri: string;
  encryptionKey: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export class OAuthService {
  constructor(
    private config: OAuthConfig,
    private userId: string,
    private db: DatabaseClient
  ) {}

  /**
   * Refresh OAuth token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new TokenRefreshError(
        `Failed to refresh ${this.config.provider} token: ${error}`
      );
    }

    const data = await response.json();
    await this.storeTokens(data.access_token, data.refresh_token, data.expires_in);

    return data;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new TokenExchangeError(`Failed to exchange code for ${this.config.provider} tokens`);
    }

    const data = await response.json();
    await this.storeTokens(data.access_token, data.refresh_token, data.expires_in);

    return data;
  }

  /**
   * Store tokens securely in database (encrypted)
   */
  private async storeTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    const encryptedAccess = this.encryptToken(accessToken);
    const encryptedRefresh = this.encryptToken(refreshToken);

    await this.db.tokens.upsert({
      provider: this.config.provider,
      userId: this.userId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    });
  }

  /**
   * Retrieve tokens from database (decrypted)
   */
  async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    const stored = await this.db.tokens.findOne({
      provider: this.config.provider,
      userId: this.userId,
    });

    if (!stored) {
      return null;
    }

    return {
      accessToken: this.decryptToken(stored.accessToken),
      refreshToken: this.decryptToken(stored.refreshToken),
    };
  }

  /**
   * Check if token is expired or expiring soon (within 5 minutes)
   */
  async isTokenExpired(): Promise<boolean> {
    const stored = await this.db.tokens.findOne({
      provider: this.config.provider,
      userId: this.userId,
    });

    if (!stored) {
      return true;
    }

    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    return stored.expiresAt.getTime() - Date.now() < expiryBuffer;
  }

  /**
   * Revoke tokens (logout)
   */
  async revokeTokens(): Promise<void> {
    await this.db.tokens.delete({
      provider: this.config.provider,
      userId: this.userId,
    });
  }

  /**
   * Encrypt token using AES-256-GCM
   */
  private encryptToken(token: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token using AES-256-GCM
   */
  private decryptToken(encryptedToken: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### Updated SwiggyAuth.ts

```typescript
import { OAuthService } from './OAuthService';

export class SwiggyAuthService {
  private oauthService: OAuthService;

  constructor(
    private config: SwiggyConfig,
    private userId: string,
    private db: DatabaseClient
  ) {
    this.oauthService = new OAuthService(
      {
        provider: 'swiggy',
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        tokenUrl: 'https://api.swiggy.com/oauth/token',
        redirectUri: config.redirectUri,
        encryptionKey: config.encryptionKey,
      },
      userId,
      db
    );
  }

  async getAccessToken(): Promise<string> {
    const tokens = await this.oauthService.getTokens();

    if (!tokens) {
      throw new NoTokensError('User not authenticated with Swiggy');
    }

    if (await this.oauthService.isTokenExpired()) {
      const refreshed = await this.oauthService.refreshToken(tokens.refreshToken);
      return refreshed.access_token;
    }

    return tokens.accessToken;
  }

  async exchangeCode(code: string): Promise<void> {
    await this.oauthService.exchangeCodeForTokens(code);
  }

  async logout(): Promise<void> {
    await this.oauthService.revokeTokens();
  }
}
```

### Updated ZomatoAuth.ts

```typescript
import { OAuthService } from './OAuthService';

export class ZomatoAuthService {
  private oauthService: OAuthService;

  constructor(
    private config: ZomatoConfig,
    private userId: string,
    private db: DatabaseClient
  ) {
    this.oauthService = new OAuthService(
      {
        provider: 'zomato',
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        tokenUrl: 'https://api.zomato.com/oauth/token',
        redirectUri: config.redirectUri,
        encryptionKey: config.encryptionKey,
      },
      userId,
      db
    );
  }

  async getAccessToken(): Promise<string> {
    const tokens = await this.oauthService.getTokens();

    if (!tokens) {
      throw new NoTokensError('User not authenticated with Zomato');
    }

    if (await this.oauthService.isTokenExpired()) {
      const refreshed = await this.oauthService.refreshToken(tokens.refreshToken);
      return refreshed.access_token;
    }

    return tokens.accessToken;
  }

  async exchangeCode(code: string): Promise<void> {
    await this.oauthService.exchangeCodeForTokens(code);
  }

  async logout(): Promise<void> {
    await this.oauthService.revokeTokens();
  }
}
```

### Benefits

1. **Eliminate Duplication:** Single source of truth for OAuth logic
2. **Easier Maintenance:** Fix bugs once, applies to all providers
3. **Consistency:** All providers use identical token management
4. **Reusability:** Easily add new OAuth providers (ONDC, Google, etc.)
5. **Better Testing:** Test OAuth logic once, reuse for all providers
6. **Type Safety:** Shared types ensure consistency

---

## Implementation Steps

### Step 1: Create OAuthService (3 hours)

1. Create `/services/mcp-adapter/src/auth/OAuthService.ts`
2. Implement all OAuth methods (refresh, exchange, store, retrieve)
3. Add comprehensive JSDoc comments
4. Add TypeScript types and interfaces

### Step 2: Update SwiggyAuth (1 hour)

1. Refactor `SwiggyAuthService` to use `OAuthService`
2. Remove duplicated OAuth logic
3. Keep Swiggy-specific API calls separate

### Step 3: Update ZomatoAuth (1 hour)

1. Refactor `ZomatoAuthService` to use `OAuthService`
2. Remove duplicated OAuth logic
3. Keep Zomato-specific API calls separate

### Step 4: Add Unit Tests (2 hours)

1. Write comprehensive tests for `OAuthService`
2. Test all methods (happy path, error cases, edge cases)
3. Mock database and HTTP calls
4. Achieve 90%+ coverage

### Step 5: Update Integration Tests (1 hour)

1. Update existing Swiggy/Zomato auth tests
2. Add tests for new OAuth service
3. Verify no regressions

---

## Testing Requirements

### Unit Tests (New)

```typescript
describe('OAuthService', () => {
  let service: OAuthService;
  let mockDb: jest.Mocked<DatabaseClient>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new OAuthService(
      {
        provider: 'swiggy',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://api.test.com/oauth/token',
        redirectUri: 'https://app.test.com/callback',
        encryptionKey: crypto.randomBytes(32).toString('hex'),
      },
      'user-123',
      mockDb
    );
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });

      const result = await service.refreshToken('old-refresh-token');

      expect(result.access_token).toBe('new-access-token');
      expect(mockDb.tokens.upsert).toHaveBeenCalled();
    });

    it('should throw TokenRefreshError on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(service.refreshToken('invalid')).rejects.toThrow(TokenRefreshError);
    });
  });

  describe('storeTokens', () => {
    it('should encrypt and store tokens', async () => {
      await service['storeTokens']('access', 'refresh', 3600);

      const call = mockDb.tokens.upsert.mock.calls[0][0];
      expect(call.accessToken).toContain(':'); // Encrypted format
      expect(call.refreshToken).toContain(':');
      expect(call.provider).toBe('swiggy');
    });
  });

  describe('encryption', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const original = 'my-secret-token';
      const encrypted = service['encryptToken'](original);
      const decrypted = service['decryptToken'](encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });
  });
});
```

### Integration Tests (Update)

```typescript
describe('SwiggyAuthService (Integration)', () => {
  it('should use OAuthService for token refresh', async () => {
    const authService = new SwiggyAuthService(config, 'user-123', db);

    mockDb.tokens.findOne.mockResolvedValue({
      accessToken: 'encrypted-token',
      refreshToken: 'encrypted-refresh',
      expiresAt: new Date(Date.now() - 1000), // Expired
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-token', expires_in: 3600 }),
    });

    const token = await authService.getAccessToken();

    expect(token).toBe('new-token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.swiggy.com/oauth/token',
      expect.any(Object)
    );
  });
});
```

---

## Acceptance Criteria

- [ ] `OAuthService` class created with all methods
- [ ] `SwiggyAuthService` refactored to use `OAuthService`
- [ ] `ZomatoAuthService` refactored to use `OAuthService`
- [ ] Code duplication eliminated (0 duplicated lines)
- [ ] Unit tests added for `OAuthService` (90%+ coverage)
- [ ] Integration tests passing (no regressions)
- [ ] Documentation updated (JSDoc, README)
- [ ] Code review approved

---

## Related Issues

- **Original Code Review:** `.claude/project-management/archive/quality-reports/MCP_CODE_REVIEW_2026-02-19.md` (Issue #2, Severity: High, Duplication: 90%)
- **Related Task:** TD-001 (Refactor Cart Workflow Complexity)

---

## Files to Modify

1. `/services/mcp-adapter/src/auth/OAuthService.ts` (NEW)
   - Create shared OAuth service

2. `/services/mcp-adapter/src/auth/swiggyAuth.ts`
   - Refactor to use OAuthService

3. `/services/mcp-adapter/src/auth/zomatoAuth.ts`
   - Refactor to use OAuthService

4. `/services/mcp-adapter/tests/auth/OAuthService.test.ts` (NEW)
   - Add unit tests for OAuthService

5. `/services/mcp-adapter/tests/auth/swiggyAuth.test.ts`
   - Update tests

6. `/services/mcp-adapter/tests/auth/zomatoAuth.test.ts`
   - Update tests

---

## Dependencies

- No external dependencies
- Can be done independently of other tasks
- Should be completed before adding new OAuth providers (ONDC)

---

## Rollback Plan

If issues arise:
1. Revert commits (use git revert)
2. Restore original `swiggyAuth.ts` and `zomatoAuth.ts` from backup
3. Remove `OAuthService.ts`
4. Re-run test suite to verify no issues

---

## Future Enhancements

- Add support for PKCE (Proof Key for Code Exchange)
- Implement token rotation strategy
- Add OAuth provider discovery
- Support multiple encryption algorithms

---

**Assigned To:** TBD
**Sprint:** TBD
**Story Points:** 8

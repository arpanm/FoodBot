# TASK-MCP-001: Complete OAuth Implementation for Swiggy and Zomato

**Task ID:** TASK-MCP-001
**Created:** 2026-02-20
**Status:** In Progress (Day 2 of 5)
**Progress:** 40%
**Priority:** P0 (Critical)
**Assignee:** Backend Team
**Estimated Effort:** 5 days
**Next Milestone:** Complete Swiggy/Zomato OAuth callbacks by EOD 2026-02-20

---

## Description

Complete the OAuth 2.0 implementation for Swiggy and Zomato provider integrations. This includes implementing account linking API endpoints, OAuth callback handling, and token management.

## Requirements

- [REQ-OAUTH-001](../../requirements/mcp-layer/oauth-requirements.md#req-oauth-001-oauth-flow-support)
- [REQ-OAUTH-002](../../requirements/mcp-layer/oauth-requirements.md#req-oauth-002-token-management)
- [REQ-OAUTH-003](../../requirements/mcp-layer/oauth-requirements.md#req-oauth-003-token-refresh)

## Current Status

**Completed:**
- ✅ `OAuthManager.ts` - Core OAuth manager
- ✅ `TokenManager.ts` - Token storage and retrieval
- ✅ `tokenEncryption.ts` - Token encryption/decryption
- ✅ Database schema for `oauth_tokens` table

**In Progress:**
- ⚠️ Swiggy OAuth integration (`services/mcp-adapter/src/providers/swiggy/swiggyAuth.ts`)
- ⚠️ Zomato OAuth integration (`services/mcp-adapter/src/providers/zomato/zomatoAuth.ts`)

**Pending:**
- ❌ Gateway API endpoints for account linking
- ❌ OAuth callback endpoints
- ❌ Frontend integration (account linking UI)

## Implementation Tasks

### 1. Complete Swiggy OAuth Integration

**File:** `services/mcp-adapter/src/providers/swiggy/swiggyAuth.ts`

**Tasks:**
- [ ] Implement `initiateOAuthFlow()` method
- [ ] Implement OAuth callback handler
- [ ] Add token refresh logic
- [ ] Handle OAuth errors (user denial, invalid code, etc.)
- [ ] Add unit tests

**Acceptance Criteria:**
- User can initiate OAuth flow
- Authorization code is exchanged for access/refresh tokens
- Tokens are encrypted and stored in database
- Token refresh works automatically when expired

### 2. Complete Zomato OAuth Integration

**File:** `services/mcp-adapter/src/providers/zomato/zomatoAuth.ts`

**Tasks:**
- [ ] Implement `initiateOAuthFlow()` method
- [ ] Implement OAuth callback handler
- [ ] Add token refresh logic
- [ ] Handle OAuth errors
- [ ] Add unit tests

**Acceptance Criteria:**
- Same as Swiggy OAuth integration

### 3. Implement Gateway API Endpoints

**Location:** `services/gateway-api/src/account-linking/`

**New Files:**
```
account-linking/
├── account-linking.controller.ts
├── account-linking.service.ts
├── account-linking.module.ts
└── dto/
    ├── initiate-oauth.dto.ts
    ├── oauth-callback.dto.ts
    └── linked-account.dto.ts
```

**Endpoints to Create:**

**POST `/api/account-linking/:provider/initiate`**
```typescript
@Post(':provider/initiate')
@UseGuards(JwtAuthGuard)
async initiateOAuth(
  @Param('provider') provider: ProviderName,
  @Body() dto: InitiateOAuthDto,
  @CurrentUser() user: User
): Promise<{ authorizationUrl: string }> {
  return this.accountLinkingService.initiateOAuth(provider, user.id, dto.redirectUri);
}
```

**GET `/api/account-linking/:provider/callback`**
```typescript
@Get(':provider/callback')
async handleCallback(
  @Param('provider') provider: ProviderName,
  @Query() dto: OAuthCallbackDto
): Promise<{ success: boolean; expiresAt: string }> {
  return this.accountLinkingService.handleCallback(provider, dto.code, dto.state);
}
```

**GET `/api/account-linking`**
```typescript
@Get()
@UseGuards(JwtAuthGuard)
async getLinkedAccounts(
  @CurrentUser() user: User
): Promise<{ linkedAccounts: LinkedAccountDto[] }> {
  return this.accountLinkingService.getLinkedAccounts(user.id);
}
```

**DELETE `/api/account-linking/:provider`**
```typescript
@Delete(':provider')
@UseGuards(JwtAuthGuard)
async unlinkAccount(
  @Param('provider') provider: ProviderName,
  @CurrentUser() user: User
): Promise<{ success: boolean }> {
  return this.accountLinkingService.unlinkAccount(user.id, provider);
}
```

### 4. Frontend Integration

**Location:** `apps/customer-app/src/services/account-linking.service.ts`

**Tasks:**
- [ ] Complete `initiateOAuth()` method
- [ ] Implement OAuth popup/redirect handling
- [ ] Add account linking status display
- [ ] Handle OAuth errors in UI
- [ ] Add loading states

**UI Components:**
- Settings page with "Link Account" buttons
- OAuth popup window or redirect flow
- Linked accounts list with unlink option
- Error messages for OAuth failures

### 5. Testing

**Unit Tests:**
- [ ] `OAuthManager` tests
- [ ] `TokenManager` tests
- [ ] Swiggy OAuth tests
- [ ] Zomato OAuth tests

**Integration Tests:**
- [ ] Full OAuth flow (mock provider)
- [ ] Token refresh flow
- [ ] Account unlinking
- [ ] Error scenarios

**Manual Tests:**
- [ ] Real OAuth flow with Swiggy sandbox
- [ ] Real OAuth flow with Zomato sandbox
- [ ] Token expiration handling

## Configuration

**Environment Variables Required:**

```bash
# Swiggy OAuth
SWIGGY_OAUTH_CLIENT_ID=your_client_id
SWIGGY_OAUTH_CLIENT_SECRET=your_client_secret
SWIGGY_OAUTH_REDIRECT_URI=https://app.foodbot.com/auth/swiggy/callback
SWIGGY_OAUTH_SCOPES=profile,orders,cart,addresses

# Zomato OAuth
ZOMATO_OAUTH_CLIENT_ID=your_client_id
ZOMATO_OAUTH_CLIENT_SECRET=your_client_secret
ZOMATO_OAUTH_REDIRECT_URI=https://app.foodbot.com/auth/zomato/callback
ZOMATO_OAUTH_SCOPES=profile,orders,cart,addresses

# OAuth Encryption
OAUTH_ENCRYPTION_KEY=your_32_byte_hex_key
```

## Dependencies

- Swiggy OAuth credentials (requires registration)
- Zomato OAuth credentials (requires registration)
- PostgreSQL database with `oauth_tokens` table
- Redis for session state management

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Provider API changes | High | Mock external APIs in tests; version API calls |
| Token security breach | Critical | Use AES-256-GCM encryption; rotate keys regularly |
| OAuth flow failures | Medium | Implement comprehensive error handling; provide clear user messages |
| Token refresh failures | High | Implement fallback to non-personalized data |

## Success Criteria

- ✅ Users can link Swiggy accounts
- ✅ Users can link Zomato accounts
- ✅ Tokens are encrypted at rest
- ✅ Tokens refresh automatically
- ✅ Users can unlink accounts
- ✅ 95% test coverage for OAuth flows
- ✅ OAuth errors handled gracefully

## Timeline

- **Day 1-2:** Complete provider OAuth integrations
- **Day 3:** Implement Gateway API endpoints
- **Day 4:** Frontend integration
- **Day 5:** Testing and bug fixes

## Related Tasks

- [TASK-MCP-002](./TASK-MCP-002-implement-provider-order-placement.md) - Implement order placement (depends on OAuth)
- [TASK-MCP-005](../pending/TASK-MCP-005-implement-account-unlinking.md) - Account unlinking feature

## References

- [OAuth Requirements](../../requirements/mcp-layer/oauth-requirements.md)
- [MCP Architecture](../../architecture/integration/mcp-architecture.md)
- [Swiggy OAuth Documentation](#) (to be added)
- [Zomato OAuth Documentation](#) (to be added)

---

**Last Updated:** 2026-02-20
**Next Review:** 2026-02-27

# MCP OAuth Integration Requirements

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** In Implementation

---

## Overview

OAuth 2.0 integration enables FoodBot users to link their Swiggy and Zomato accounts, allowing seamless cross-platform ordering and order history import.

## Functional Requirements

### REQ-OAUTH-001: OAuth Flow Support
**Priority:** P0 (Critical)
**Status:** In Implementation

The system MUST support OAuth 2.0 Authorization Code flow:

**Flow Steps:**
1. User initiates account linking
2. System redirects to provider's OAuth authorization page
3. User authenticates with provider
4. Provider redirects back with authorization code
5. System exchanges code for access token and refresh token
6. Tokens stored securely (encrypted at rest)

**Supported Providers:**
- Swiggy OAuth
- Zomato OAuth

**Implementation Location:** `services/mcp-adapter/src/auth/OAuthManager.ts`

---

### REQ-OAUTH-002: Token Management
**Priority:** P0 (Critical)
**Status:** Implemented

The system MUST securely manage OAuth tokens:

**Token Storage:**
```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

**Token Encryption:**
- Algorithm: AES-256-GCM
- Key: 32-byte key from environment variable `OAUTH_ENCRYPTION_KEY`
- Initialization Vector: Random 16 bytes per token

**Implementation Location:** `services/mcp-adapter/src/auth/TokenManager.ts`

---

### REQ-OAUTH-003: Token Refresh
**Priority:** P0 (Critical)
**Status:** Implemented

The system MUST automatically refresh expired tokens:

**Refresh Logic:**
1. Check token expiration before each API call
2. If expired, use refresh token to obtain new access token
3. Update stored tokens
4. Retry original API call with new token

**Refresh Token Expiration:**
- Swiggy: 90 days
- Zomato: 90 days
- If refresh token expired, user must re-authorize

**Implementation Location:** `services/mcp-adapter/src/auth/OAuthManager.ts`

---

### REQ-OAUTH-004: User Context
**Priority:** P0 (Critical)
**Status:** Implemented

Provider API calls MUST include user context:

```typescript
interface UserContext {
  userId: string;
  sessionToken: string;  // OAuth access token
  location: {
    lat: number;
    lng: number;
  };
}
```

**Usage:**
- Every Swiggy/Zomato API call includes the user's access token
- API responses are personalized based on user's account
- Order history and preferences are fetched from linked account

**Implementation Location:**
- `services/mcp-adapter/src/providers/swiggy/swiggyAuth.ts`
- `services/mcp-adapter/src/providers/zomato/zomatoAuth.ts`

---

### REQ-OAUTH-005: Account Unlinking
**Priority:** P1 (High)
**Status:** Pending

Users MUST be able to unlink their accounts:

**Unlinking Actions:**
1. Delete stored tokens from database
2. Optionally revoke tokens with provider (if supported)
3. Clear cached data for that user-provider combination
4. Log account unlinking event

**API Endpoint:** `DELETE /api/account-linking/:provider`

**Implementation Status:** Not yet implemented

---

### REQ-OAUTH-006: Multi-Account Support
**Priority:** P2 (Medium)
**Status:** Pending

Users MAY link multiple accounts per provider:

**Use Case:** User has multiple Swiggy accounts (personal, work)

**Data Model:**
```sql
ALTER TABLE oauth_tokens
ADD COLUMN account_label VARCHAR(100);

-- New unique constraint
ALTER TABLE oauth_tokens
DROP CONSTRAINT oauth_tokens_user_id_provider_key,
ADD CONSTRAINT oauth_tokens_unique
UNIQUE(user_id, provider, account_label);
```

**Implementation Status:** Future enhancement

---

## Technical Requirements

### REQ-OAUTH-007: OAuth Client Configuration
**Priority:** P0 (Critical)
**Status:** Configured

OAuth clients MUST be registered with each provider:

**Swiggy OAuth Configuration:**
```bash
SWIGGY_OAUTH_CLIENT_ID=foodbot-client-id
SWIGGY_OAUTH_CLIENT_SECRET=foodbot-client-secret
SWIGGY_OAUTH_REDIRECT_URI=https://app.foodbot.com/auth/swiggy/callback
SWIGGY_OAUTH_SCOPES=profile,orders,cart,addresses
```

**Zomato OAuth Configuration:**
```bash
ZOMATO_OAUTH_CLIENT_ID=foodbot-client-id
ZOMATO_OAUTH_CLIENT_SECRET=foodbot-client-secret
ZOMATO_OAUTH_REDIRECT_URI=https://app.foodbot.com/auth/zomato/callback
ZOMATO_OAUTH_SCOPES=profile,orders,cart,addresses
```

**Required Scopes:**
- `profile`: User profile information
- `orders`: Order history and placement
- `cart`: Cart management
- `addresses`: Delivery addresses

---

### REQ-OAUTH-008: Security Requirements
**Priority:** P0 (Critical)
**Status:** Partial

**PKCE (Proof Key for Code Exchange):**
- MUST use PKCE for mobile apps
- Code verifier: Random 43-128 character string
- Code challenge: SHA-256 hash of verifier

**State Parameter:**
- MUST include state parameter to prevent CSRF
- State: Random UUID stored in session
- Validate state on callback

**HTTPS Only:**
- All OAuth flows MUST use HTTPS
- Redirect URIs MUST be HTTPS (except localhost for dev)

**Token Storage:**
- Tokens MUST be encrypted at rest
- Tokens MUST NOT be logged
- Tokens MUST NOT be exposed in API responses

**Implementation Location:** `services/mcp-adapter/src/auth/tokenEncryption.ts`

---

### REQ-OAUTH-009: Error Handling
**Priority:** P1 (High)
**Status:** Implemented

The system MUST handle OAuth errors gracefully:

**Error Scenarios:**
1. **User denies authorization:**
   - Return user-friendly message
   - Redirect to settings page

2. **Invalid authorization code:**
   - Log error
   - Prompt user to retry

3. **Expired refresh token:**
   - Notify user to re-authorize
   - Clear stored tokens

4. **Token refresh failure:**
   - Log error with context
   - Fallback to non-personalized data

**Error Response Format:**
```json
{
  "error": "oauth_error",
  "errorCode": "INVALID_GRANT",
  "message": "The authorization code is invalid or expired. Please try linking your account again.",
  "provider": "swiggy"
}
```

---

### REQ-OAUTH-010: Audit Logging
**Priority:** P1 (High)
**Status:** Partial

All OAuth events MUST be logged:

**Events to Log:**
- Account linking initiated
- Authorization granted
- Token refresh
- Account unlinking
- Token refresh failures
- Authorization errors

**Log Format:**
```json
{
  "timestamp": "2026-02-20T10:30:00.000Z",
  "event": "oauth.account_linked",
  "userId": "user-123",
  "provider": "swiggy",
  "success": true,
  "metadata": {
    "scopes": ["profile", "orders", "cart"],
    "expiresAt": "2026-05-20T10:30:00.000Z"
  }
}
```

**Implementation Location:** To be added in `services/mcp-adapter/src/auth/`

---

## API Specification

### Initiate OAuth Flow

**Endpoint:** `POST /api/account-linking/:provider/initiate`

**Request:**
```json
{
  "redirectUri": "https://app.foodbot.com/settings/accounts"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://api.swiggy.com/oauth/authorize?client_id=...&state=...&code_challenge=..."
}
```

---

### OAuth Callback

**Endpoint:** `GET /api/account-linking/:provider/callback`

**Query Parameters:**
- `code`: Authorization code from provider
- `state`: CSRF token

**Response:**
```json
{
  "success": true,
  "provider": "swiggy",
  "expiresAt": "2026-05-20T10:30:00.000Z"
}
```

---

### Get Linked Accounts

**Endpoint:** `GET /api/account-linking`

**Response:**
```json
{
  "linkedAccounts": [
    {
      "provider": "swiggy",
      "linkedAt": "2026-02-20T10:30:00.000Z",
      "expiresAt": "2026-05-20T10:30:00.000Z",
      "status": "active"
    },
    {
      "provider": "zomato",
      "linkedAt": "2026-02-15T08:00:00.000Z",
      "expiresAt": "2026-05-15T08:00:00.000Z",
      "status": "expired"
    }
  ]
}
```

---

### Unlink Account

**Endpoint:** `DELETE /api/account-linking/:provider`

**Response:**
```json
{
  "success": true,
  "provider": "swiggy",
  "message": "Account successfully unlinked"
}
```

---

## Testing Requirements

### REQ-OAUTH-011: OAuth Flow Testing
**Priority:** P0 (Critical)
**Status:** Pending

**Unit Tests:**
- Token encryption/decryption
- Token refresh logic
- PKCE code generation
- State validation

**Integration Tests:**
- Full OAuth flow (mock provider)
- Token refresh flow
- Account unlinking
- Error scenarios

**Manual Tests:**
- Real OAuth flow with Swiggy (sandbox)
- Real OAuth flow with Zomato (sandbox)
- Token expiration handling

**Test Location:** `services/mcp-adapter/tests/auth/`

---

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| OAuthManager | ✅ Implemented | `src/auth/OAuthManager.ts` |
| TokenManager | ✅ Implemented | `src/auth/TokenManager.ts` |
| Token Encryption | ✅ Implemented | `src/auth/tokenEncryption.ts` |
| Swiggy OAuth | ⚠️ Partial | `src/providers/swiggy/swiggyAuth.ts` |
| Zomato OAuth | ⚠️ Partial | `src/providers/zomato/zomatoAuth.ts` |
| Account Linking API | ❌ Pending | `services/gateway-api/` |
| Frontend Integration | ⚠️ Partial | `apps/customer-app/src/services/account-linking.service.ts` |

---

## Dependencies

### External Services
- **Swiggy OAuth Server:** https://api.swiggy.com/oauth/
- **Zomato OAuth Server:** https://api.zomato.com/oauth/

### Internal Services
- **Gateway API:** Handles OAuth callbacks
- **PostgreSQL:** Stores encrypted tokens
- **Redis:** Caches user contexts

---

## References

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Swiggy OAuth Documentation](#) (to be added)
- [Zomato OAuth Documentation](#) (to be added)
- [MCP Core Requirements](./core-requirements.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-20 | System | Initial OAuth requirements extracted from archived documentation |

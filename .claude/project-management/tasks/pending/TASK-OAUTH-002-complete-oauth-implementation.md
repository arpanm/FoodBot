# TASK-OAUTH-002: Complete OAuth 2.1 & Provider Authentication

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P0 (Critical)
**Estimated Effort:** 14 days
**Component:** MCP Adapter / Security
**Depends On:** TASK-DB-001 (token storage)
**Blocks:** Real Swiggy/Zomato integration, MCP order placement
**Related Requirements:** FR-MCP-PROVIDER-001, oauth-requirements.md

---

## Overview

Complete the OAuth 2.1 implementation for all external food delivery provider integrations (Swiggy, Zomato, ONDC) including token exchange, encrypted storage, automatic refresh, multi-tenant token management, consent management, and comprehensive error handling with fallback strategies.

---

## Requirements

### Functional Requirements

1. **OAuth 2.1 Authorization Code Flow with PKCE**
   - Authorization URL generation with state, nonce, and PKCE challenge
   - Callback handling with code exchange
   - Token response parsing and validation
   - ID token verification (if OIDC)
   - Support for both confidential and public clients

2. **Token Management**
   - AES-256-GCM encrypted token storage in PostgreSQL
   - Automatic token refresh 5 minutes before expiry
   - Token rotation on refresh
   - Multi-user token isolation
   - Token revocation on user logout/disconnect
   - Concurrent refresh lock (Redis distributed lock)
   - Token introspection endpoint support

3. **Provider-Specific Implementations**
   - Swiggy OAuth integration (client credentials + user auth)
   - Zomato OAuth integration (API key + OAuth hybrid)
   - ONDC authentication (certificate-based + OAuth)
   - Google Places API key management
   - Internal service-to-service JWT auth

4. **Consent Management**
   - User consent tracking per provider
   - Scope management (read, write, order, payment)
   - Consent revocation with token cleanup
   - Re-consent flow for scope changes
   - Consent audit trail

5. **Security Requirements**
   - PKCE (S256) for all public clients
   - State parameter validation (CSRF protection)
   - Token binding to user session
   - Rate limiting on token endpoints (10 req/min)
   - Encrypted token transport (TLS 1.3 only)
   - No tokens in URL parameters
   - Secure token storage (AES-256-GCM, unique IV per token)
   - Key rotation support for encryption keys

6. **Error Handling & Resilience**
   - Automatic retry on transient failures (3 attempts, exponential backoff)
   - Circuit breaker for provider auth endpoints
   - Fallback to cached tokens on temporary provider outages
   - Graceful degradation when provider auth unavailable
   - Detailed error logging with correlation IDs
   - User-friendly error messages for auth failures

### Architecture

```
OAuth Flow:
User → Frontend → /auth/{provider}/initiate → Generate PKCE + State → Redirect to Provider
Provider → /auth/{provider}/callback → Exchange Code → Encrypt Tokens → Store in DB
Service → TokenManager → Check Expiry → Auto Refresh → Decrypt → Return Token

Components:
├── OAuthService (orchestrator)
│   ├── AuthorizationCodeGenerator
│   ├── PKCEManager
│   ├── StateManager (Redis-backed)
│   └── CallbackHandler
├── TokenService
│   ├── TokenEncryptor (AES-256-GCM)
│   ├── TokenStorage (PostgreSQL)
│   ├── TokenRefresher (background job)
│   └── TokenRevoker
├── ProviderAdapters
│   ├── SwiggyOAuthAdapter
│   ├── ZomatoOAuthAdapter
│   ├── ONDCAuthAdapter
│   └── GoogleApiKeyAdapter
├── ConsentManager
│   ├── ConsentTracker
│   ├── ScopeManager
│   └── ConsentAuditor
└── SecurityLayer
    ├── RateLimiter
    ├── CSRFProtector
    └── SessionBinder
```

### Acceptance Criteria
- [ ] Full OAuth 2.1 + PKCE flow working for all providers
- [ ] Tokens encrypted with AES-256-GCM in database
- [ ] Auto-refresh working with 5-min buffer before expiry
- [ ] Concurrent refresh prevention with Redis distributed locks
- [ ] Token revocation cleans up all related tokens
- [ ] Consent tracking with audit trail
- [ ] Circuit breaker activates after 5 consecutive failures
- [ ] Rate limiting enforced (10 req/min per user)
- [ ] All error paths return user-friendly messages
- [ ] Key rotation works without downtime
- [ ] 90%+ test coverage
- [ ] Integration tests with mock OAuth servers
- [ ] E2E test: full auth flow → token usage → refresh → revocation
- [ ] Security audit passed (no token leaks, proper encryption)
- [ ] Performance: token operations < 50ms (excluding network)

### SDLC Process
1. **Plan**: OAuth flow diagrams, provider-specific requirements, encryption key management strategy
2. **Code**: OAuth service, token management, provider adapters, consent manager
3. **Test**: Unit tests for all components, integration tests with mock OAuth servers
4. **Fix**: Address test failures
5. **Code Review**: Security-focused review of token handling, encryption, and key management
6. **Fix**: Address review findings
7. **Code Analysis**: Static analysis for secret leaks, insecure patterns, type safety
8. **Fix**: Resolve analysis findings
9. **Security Analysis**: Penetration testing on OAuth flows, token storage audit, OWASP compliance check
10. **Fix**: Address security findings

### Files to Create/Modify
- `services/mcp-adapter/src/auth/oauth.service.ts`
- `services/mcp-adapter/src/auth/token.service.ts`
- `services/mcp-adapter/src/auth/token-encryptor.ts`
- `services/mcp-adapter/src/auth/pkce-manager.ts`
- `services/mcp-adapter/src/auth/state-manager.ts`
- `services/mcp-adapter/src/auth/consent-manager.ts`
- `services/mcp-adapter/src/auth/providers/swiggy-oauth.adapter.ts`
- `services/mcp-adapter/src/auth/providers/zomato-oauth.adapter.ts`
- `services/mcp-adapter/src/auth/providers/ondc-auth.adapter.ts`
- `services/mcp-adapter/src/auth/__tests__/*.spec.ts`
- `services/mcp-adapter/src/auth/__tests__/*.integration.spec.ts`

### Dependencies
- TASK-DB-001 (account_links and user_sessions tables for token storage)
- Redis for state management and distributed locks
- Node.js crypto module for AES-256-GCM encryption
- jsonwebtoken for JWT handling
- openid-client for OIDC support

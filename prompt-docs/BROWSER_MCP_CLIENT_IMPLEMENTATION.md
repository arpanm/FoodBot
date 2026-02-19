# Browser MCP Client Implementation Report

**Version:** 1.0.0
**Date:** 2026-02-19
**Status:** Complete

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Architecture Decision](#2-architecture-decision)
- [3. Implementation Overview](#3-implementation-overview)
- [4. File Inventory](#4-file-inventory)
- [5. API Service Layer](#5-api-service-layer)
- [6. State Management](#6-state-management)
- [7. React Hook](#7-react-hook)
- [8. Component Architecture](#8-component-architecture)
- [9. Page Layer](#9-page-layer)
- [10. Security Implementation](#10-security-implementation)
- [11. OAuth Flow Detail](#11-oauth-flow-detail)
- [12. Error Handling](#12-error-handling)
- [13. Test Coverage](#13-test-coverage)
- [14. Integration Points](#14-integration-points)
- [15. Future Enhancements](#15-future-enhancements)

---

## 1. Executive Summary

This document describes the browser-side implementation for MCP platform account linking in the FoodBot customer application. Based on the findings in the MCP Research Report (`MCP_RESEARCH_REPORT.md`), the recommended **Option C -- Hybrid Architecture** was implemented.

### Key Design Principle

**Tokens NEVER reside in the browser.** The browser handles only:

1. Redirecting the user to the platform's OAuth consent page
2. Receiving the authorization code via OAuth callback
3. Sending the code to the FoodBot backend for token exchange
4. Displaying account linking status

All token exchange, storage (AES-256-GCM encrypted in Redis), and refresh operations happen server-side in the Gateway API and MCP Orchestrator.

### Implementation Summary

| Metric | Value |
|--------|-------|
| New files created | 16 |
| Existing files modified | 3 |
| Test files created | 7 |
| Total tests | 105 |
| Tests passing | 105 (100%) |
| Components created | 4 |
| Pages created | 2 |
| Hooks created | 1 |
| Services created | 1 |
| Redux slices created | 1 |
| Test factories created | 1 |

---

## 2. Architecture Decision

### Why NOT a Browser-Based MCP Client

The MCP Research Report (Section 6.1) evaluated Option A (Browser-Based MCP Client) and scored it **1.9/5.0**. The critical issues with browser-based MCP are:

1. **Security** (Score: 1/5) -- Session tokens exposed in browser JavaScript
2. **CORS** (Score: 2/5) -- MCP servers do not set CORS headers for arbitrary origins
3. **Rate Limiting** (Score: 2/5) -- Cannot centrally manage rate limits from the browser
4. **Resilience** (Score: 1/5) -- No circuit breakers, retry, or bulkhead patterns possible
5. **Monitoring** (Score: 1/5) -- No server-side observability

### What the Browser DOES Handle

The browser's role in the Hybrid Architecture (Option C, scored **4.9/5.0**):

```
Phase 1 (Auth -- Browser):
  User clicks "Connect Swiggy" -> Browser opens OAuth popup ->
  User logs in on Swiggy's page -> OAuth callback with code ->
  Browser sends code to FoodBot backend -> Backend exchanges for tokens

Phase 2 (Operations -- Backend only):
  Browser sends search request -> Gateway API -> Temporal Workflow ->
  MCP Orchestrator (with server-side tokens) -> Swiggy/Zomato MCP Servers
```

The browser components implemented here handle **Phase 1 only**.

---

## 3. Implementation Overview

### Data Flow

```
                    Browser (React)
                         |
          +--------------+--------------+
          |                             |
  AccountLinkingPage            OAuthCallbackPage
          |                             |
  useAccountLinking hook        useAccountLinking hook
          |                             |
  accountLinkingSlice (Redux)   accountLinkingSlice (Redux)
          |                             |
  accountLinkingService         accountLinkingService
          |                             |
  apiClient (axios)             apiClient (axios)
          |                             |
          +--------------+--------------+
                         |
              Gateway API (NestJS)
              POST /platforms/link
              POST /platforms/callback
              GET  /platforms/status
              DELETE /platforms/unlink
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Components | React 18 + TypeScript | Account linking UI |
| State Management | Redux Toolkit | OAuth flow state, account status |
| HTTP Client | Axios | API communication |
| Routing | React Router v6 | OAuth callback page |
| Testing | Jest + React Testing Library | 105 tests |

---

## 4. File Inventory

### New Files

| File | Path | Description |
|------|------|-------------|
| account-linking.service.ts | `src/services/` | API service for OAuth flows |
| accountLinkingSlice.ts | `src/store/slices/` | Redux state management |
| useAccountLinking.ts | `src/hooks/` | React hook for account linking |
| AccountStatus.tsx | `src/components/AccountLinking/` | Status display component |
| SwiggyAccountLink.tsx | `src/components/AccountLinking/` | Swiggy OAuth component |
| ZomatoAccountLink.tsx | `src/components/AccountLinking/` | Zomato OAuth component |
| AccountLinkingModal.tsx | `src/components/AccountLinking/` | Unified modal component |
| index.ts | `src/components/AccountLinking/` | Component exports |
| AccountLinking.tsx | `src/pages/` | Main account linking page |
| OAuthCallback.tsx | `src/pages/` | OAuth callback handler page |
| account-linking.factory.ts | `src/test/factories/` | Test data factory |
| account-linking.service.test.ts | `src/services/__tests__/` | Service tests |
| accountLinkingSlice.test.ts | `src/store/slices/__tests__/` | Redux slice tests |
| AccountStatus.test.tsx | `src/components/AccountLinking/__tests__/` | Component tests |
| SwiggyAccountLink.test.tsx | `src/components/AccountLinking/__tests__/` | Component tests |
| ZomatoAccountLink.test.tsx | `src/components/AccountLinking/__tests__/` | Component tests |
| AccountLinkingModal.test.tsx | `src/components/AccountLinking/__tests__/` | Component tests |
| AccountLinking.test.tsx | `src/pages/__tests__/` | Page tests |

### Modified Files

| File | Path | Changes |
|------|------|---------|
| index.ts | `src/store/` | Added accountLinking reducer |
| redux.types.ts | `src/types/` | Added AccountLinkingState to RootState |
| mockStore.ts | `src/test/utils/` | Added accountLinking default state |

---

## 5. API Service Layer

### File: `src/services/account-linking.service.ts`

The service encapsulates all HTTP communication with the Gateway API's platform authentication module.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/platforms/link` | Initiate OAuth flow, get consent URL |
| POST | `/platforms/callback` | Exchange auth code for tokens (server-side) |
| GET | `/platforms/status` | Get linked accounts status |
| DELETE | `/platforms/unlink` | Remove platform account link |

### Type Definitions

```typescript
type PlatformType = 'swiggy' | 'zomato';
type LinkingStatus = 'linked' | 'expired' | 'not_linked';

interface LinkedAccount {
  platform: PlatformType;
  status: LinkingStatus;
  linkedAt: string | null;
  lastUsed: string | null;
  displayName: string | null;
  expiresAt: string | null;
}

interface InitiateAuthResponse {
  authUrl: string;  // Platform OAuth consent URL
  state: string;    // CSRF protection state parameter
}
```

### Security Notes

- The service sends the OAuth authorization code to the backend immediately
- No tokens are stored in localStorage, sessionStorage, or cookies
- The CSRF state parameter is generated server-side and validated on callback
- All requests include the FoodBot JWT via axios interceptors

---

## 6. State Management

### File: `src/store/slices/accountLinkingSlice.ts`

### State Shape

```typescript
interface AccountLinkingState {
  accounts: LinkedAccount[];        // Current linked accounts
  loading: boolean;                 // Operation in progress
  error: string | null;             // Last error message
  oauthInProgress: PlatformType | null;  // Active OAuth flow
  oauthUrl: string | null;          // OAuth consent URL
  oauthState: string | null;        // CSRF state parameter
  unlinkingPlatform: PlatformType | null;  // Platform being unlinked
  lastFetchedAt: string | null;     // Last fetch timestamp
}
```

### Async Thunks

| Thunk | Trigger | Effect |
|-------|---------|--------|
| `fetchLinkedAccounts` | Page load, post-callback | Updates `accounts` array |
| `initiateOAuth` | User clicks Connect | Sets `oauthUrl` for popup |
| `handleOAuthCallback` | OAuth redirect received | Sends code to backend, updates status |
| `unlinkAccount` | User clicks Disconnect | Removes platform link |

### Optimistic Updates

The `handleOAuthCallback.fulfilled` reducer optimistically updates the account status to `linked` before the next `fetchLinkedAccounts` call, providing immediate UI feedback.

---

## 7. React Hook

### File: `src/hooks/useAccountLinking.ts`

The `useAccountLinking` hook provides a clean interface for components:

```typescript
interface UseAccountLinkingResult {
  accounts: LinkedAccount[];
  loading: boolean;
  error: string | null;
  oauthInProgress: PlatformType | null;
  unlinkingPlatform: PlatformType | null;
  linkSwiggy: () => Promise<void>;
  linkZomato: () => Promise<void>;
  processOAuthCallback: (code: string, state: string) => Promise<void>;
  unlinkPlatform: (platform: PlatformType) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  dismissError: () => void;
  getAccountByPlatform: (platform: PlatformType) => LinkedAccount | undefined;
  isPlatformLinked: (platform: PlatformType) => boolean;
  isPlatformExpired: (platform: PlatformType) => boolean;
}
```

### OAuth Popup Management

The hook manages the OAuth popup window lifecycle:

1. Opens a centered popup window when `oauthUrl` is set
2. Monitors the popup for closure (user cancelled)
3. Cleans up OAuth state when popup closes
4. Closes popup after successful callback processing

Popup dimensions: 500x700 pixels, centered on screen.

---

## 8. Component Architecture

### Component Hierarchy

```
AccountLinkingPage
  |-- AccountStatus
  |     |-- PlatformStatusCard (Swiggy)
  |     |     |-- StatusBadge
  |     |     |-- Button (Connect/Disconnect)
  |     |-- PlatformStatusCard (Zomato)
  |           |-- StatusBadge
  |           |-- Button (Connect/Disconnect)
  |-- AccountLinkingModal
        |-- SwiggyAccountLink
        |     |-- Button (Connect/Reconnect/Disconnect)
        |     |-- LoadingSpinner (OAuth progress)
        |     |-- ErrorMessage
        |-- ZomatoAccountLink
              |-- Button (Connect/Reconnect/Disconnect)
              |-- LoadingSpinner (OAuth progress)
              |-- ErrorMessage
```

### AccountStatus Component

Displays an overview of all linked platform accounts. Shows:
- Platform icon and name
- Connection status badge (Connected/Expired/Not Connected)
- Connected date
- Connect/Disconnect/Reconnect actions

### SwiggyAccountLink / ZomatoAccountLink Components

Platform-specific OAuth flow components. Each handles:
- Platform branding display
- OAuth flow initiation
- Progress indicator during OAuth consent
- Account details when linked
- Disconnect action
- Privacy notice about token storage

### AccountLinkingModal Component

Unified modal with tabbed interface for platform selection:
- Swiggy tab with SwiggyAccountLink
- Zomato tab with ZomatoAccountLink
- ARIA-compliant dialog with keyboard navigation
- Prevents closing during active OAuth flow
- Security information footer

### Memoization

All platform-specific components use `React.memo` to prevent unnecessary re-renders, following the project's performance guidelines (Section 8.3 of development guardrails).

---

## 9. Page Layer

### AccountLinking Page (`src/pages/AccountLinking.tsx`)

Main page providing:
- Account status overview
- Modal trigger for connecting platforms
- OAuth callback parameter processing
- "How it works" explanation section
- Security information section

### OAuthCallback Page (`src/pages/OAuthCallback.tsx`)

Handles the OAuth redirect in the popup window:
- Extracts `code` and `state` from URL parameters
- Sends them to the backend via `processOAuthCallback`
- Shows processing/success/error states
- Auto-closes the popup on success

### URL Parameter Handling

The AccountLinking page detects OAuth parameters on load:

```typescript
function extractOAuthParams(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (code && state) return { code, state };
  return null;
}
```

After processing, parameters are cleaned from the URL without page reload using `history.replaceState`.

---

## 10. Security Implementation

### Token Handling

| Concern | Implementation |
|---------|---------------|
| Token storage | Tokens NEVER stored in browser. Backend stores in Redis with AES-256-GCM |
| CSRF protection | Server-generated state parameter validated on callback |
| OAuth popup | Opens platform login on their official domain |
| Token visibility | Authorization code sent to backend immediately, then discarded |
| Session management | FoodBot JWT required for all API calls (axios interceptor) |
| URL cleanup | OAuth parameters removed from URL after processing |

### What the Browser Knows

- Whether a platform is linked, expired, or not linked
- The display name associated with the linked account
- The date the account was linked
- **NOT** the platform session tokens, refresh tokens, or API keys

### OWASP Compliance

| OWASP Item | Status |
|------------|--------|
| Injection prevention | Parameterized API calls via axios |
| Broken authentication | JWT auth on all endpoints |
| Sensitive data exposure | No tokens in browser |
| XSS protection | React's built-in escaping |
| CSRF protection | State parameter in OAuth flow |
| Security misconfiguration | Strict TypeScript, no secrets in code |

---

## 11. OAuth Flow Detail

### Complete Flow Sequence

```
1. User clicks "Connect Swiggy" on AccountLinkingPage
2. AccountLinkingModal opens with Swiggy tab active
3. User clicks "Connect Swiggy" button
4. useAccountLinking.linkSwiggy() dispatches initiateOAuth('swiggy')
5. Redux thunk calls POST /platforms/link { platform: 'swiggy' }
6. Backend generates CSRF state, stores in Redis (5 min TTL)
7. Backend returns { authUrl, state }
8. Redux stores oauthUrl and oauthState
9. useAccountLinking hook detects oauthUrl, opens popup
10. Popup navigates to Swiggy's OAuth consent page
11. User logs in and authorizes FoodBot on Swiggy's page
12. Swiggy redirects to FoodBot's callback URL with code + state
13. OAuthCallbackPage extracts code and state from URL
14. processOAuthCallback dispatches handleOAuthCallback({ code, state })
15. Redux thunk calls POST /platforms/callback { code, state }
16. Backend validates state against Redis
17. Backend exchanges code for tokens with Swiggy
18. Backend encrypts tokens with AES-256-GCM
19. Backend stores encrypted tokens in Redis (namespaced by user ID)
20. Backend returns { success: true, platform: 'swiggy' }
21. Redux updates account status to 'linked'
22. Popup shows success message and auto-closes
23. Parent window refreshes account list
24. AccountStatus shows Swiggy as "Connected"
```

### Error Scenarios

| Scenario | User Experience |
|----------|----------------|
| User cancels popup | OAuth state cleared, no error shown |
| Platform rejects authorization | Error message in popup, can retry |
| State parameter mismatch (CSRF) | Error message, must restart flow |
| Authorization code expired | Error message, must restart flow |
| Backend unavailable | Error message with retry button |
| Platform unavailable | Error message indicating platform is down |

---

## 12. Error Handling

### Error Flow

```
Service layer throws Error
  -> Redux thunk catches with rejectWithValue
  -> Slice reducer sets state.error
  -> Component reads error from hook
  -> ErrorMessage component renders with retry action
```

### Error Codes

```typescript
const ACCOUNT_LINKING_ERROR_CODES = {
  OAUTH_STATE_INVALID: 'OAUTH_STATE_INVALID',
  OAUTH_CODE_EXPIRED: 'OAUTH_CODE_EXPIRED',
  PLATFORM_UNAVAILABLE: 'PLATFORM_UNAVAILABLE',
  ACCOUNT_ALREADY_LINKED: 'ACCOUNT_ALREADY_LINKED',
  ACCOUNT_NOT_LINKED: 'ACCOUNT_NOT_LINKED',
  TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};
```

### Graceful Degradation

- If account status fetch fails, an error with retry is shown
- If OAuth fails, the user can retry from the same modal
- Platform-specific errors are scoped to their respective components
- Global errors are shown at the modal level

---

## 13. Test Coverage

### Test Suites

| Suite | File | Tests | Status |
|-------|------|-------|--------|
| Service | `account-linking.service.test.ts` | 12 | PASS |
| Redux Slice | `accountLinkingSlice.test.ts` | 17 | PASS |
| AccountStatus | `AccountStatus.test.tsx` | 12 | PASS |
| SwiggyAccountLink | `SwiggyAccountLink.test.tsx` | 17 | PASS |
| ZomatoAccountLink | `ZomatoAccountLink.test.tsx` | 17 | PASS |
| AccountLinkingModal | `AccountLinkingModal.test.tsx` | 19 | PASS |
| AccountLinkingPage | `AccountLinking.test.tsx` | 11 | PASS |
| **Total** | **7 suites** | **105** | **ALL PASS** |

### Test Categories

| Category | Count | Examples |
|----------|-------|---------|
| Rendering | 28 | Component renders, correct text displayed |
| User interactions | 18 | Button clicks, tab switching, modal open/close |
| OAuth flow | 15 | Initiation, callback processing, error handling |
| State management | 17 | Redux actions, async thunks, state transitions |
| API calls | 12 | Service method calls, error propagation |
| Accessibility | 8 | ARIA attributes, keyboard navigation |
| Edge cases | 7 | Expired tokens, popup closed, missing params |

### Test Patterns Used

- **Mock factories** for deterministic test data (`account-linking.factory.ts`)
- **Hook mocking** with `jest.mock` for isolated component testing
- **renderWithProviders** for Redux-wrapped component rendering
- **No `Date.now()` without mocking** -- all timestamps are fixed strings
- **External dependency mocking** -- all API calls mocked via jest

---

## 14. Integration Points

### Backend API Requirements

The browser implementation assumes the Gateway API provides these endpoints:

```
POST /api/v1/platforms/link
  Request:  { platform: 'swiggy' | 'zomato' }
  Response: { authUrl: string, state: string }

POST /api/v1/platforms/callback
  Request:  { code: string, state: string }
  Response: { success: boolean, platform: string, message: string }

GET /api/v1/platforms/status
  Response: { accounts: LinkedAccount[] }

DELETE /api/v1/platforms/unlink
  Request:  { platform: 'swiggy' | 'zomato' }
  Response: { success: boolean, platform: string, message: string }
```

### Router Configuration Required

The following routes need to be added to the app's router:

```typescript
<Route path="/account-linking" element={<AccountLinkingPage />} />
<Route path="/oauth/callback" element={<OAuthCallbackPage />} />
```

### Navigation Update Required

Add an "Account Linking" item to the app's navigation menu pointing to `/account-linking`.

---

## 15. Future Enhancements

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| WebSocket status updates | High | Real-time account status updates via WebSocket |
| Token refresh notification | High | Proactive notification when tokens are about to expire |
| Multiple address support | Medium | Allow linking platform accounts with different delivery addresses |
| Auto-reconnect flow | Medium | Automatically redirect to OAuth when token expires during search |
| Platform health indicator | Low | Show real-time platform availability status |
| Account usage analytics | Low | Show how many searches used each platform |

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-19
**Status:** Complete

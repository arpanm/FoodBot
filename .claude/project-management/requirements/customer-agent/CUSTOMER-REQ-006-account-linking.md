# Customer Requirement: Platform Account Linking (Swiggy/Zomato)

**Requirement ID:** CUSTOMER-REQ-006
**Feature:** OAuth Account Linking for Food Delivery Platforms
**Status:** ✅ Implemented
**Priority:** Medium
**Implementation Date:** 2026-02-19

---

## Overview

Secure OAuth 2.0 integration for linking Swiggy and Zomato accounts, enabling cross-platform order placement and tracking.

## Implemented Features

### 1. Account Linking Components
**Location:** `/apps/customer-app/src/components/AccountLinking/`

#### AccountLinkingModal.tsx
- Modal for account linking flow
- Platform selection (Swiggy/Zomato)
- OAuth initiation
- Loading states
- Error handling
- **Status:** ✅ Implemented
- **Test:** `AccountLinkingModal.test.tsx`

#### AccountStatus.tsx
- Display linked account status
- Platform logos
- Link/unlink buttons
- Last used timestamp
- Expiry warning
- **Status:** ✅ Implemented
- **Test:** `AccountStatus.test.tsx`

#### SwiggyAccountLink.tsx
- Swiggy-specific linking UI
- Terms and conditions
- Privacy notice
- **Status:** ✅ Implemented
- **Test:** `SwiggyAccountLink.test.tsx`

#### ZomatoAccountLink.tsx
- Zomato-specific linking UI
- Terms and conditions
- Privacy notice
- **Status:** ✅ Implemented
- **Test:** `ZomatoAccountLink.test.tsx`

### 2. Account Linking Pages
**Location:** `/apps/customer-app/src/pages/`

#### AccountLinking.tsx
- Main account linking page
- List of supported platforms
- Account status cards
- Link/unlink actions
- **Status:** ✅ Implemented
- **Test:** `AccountLinking.test.tsx`

#### OAuthCallback.tsx
- OAuth callback handler
- Parse authorization code
- Exchange for access token
- Handle success/error
- Redirect to account page
- **Status:** ✅ Implemented

### 3. Account Linking State Management
**Location:** `/apps/customer-app/src/store/slices/accountLinkingSlice.ts`

#### Redux Features
```typescript
interface AccountLinkingState {
  accounts: LinkedAccount[];
  loading: boolean;
  error: string | null;
  oauthInProgress: PlatformType | null;
  oauthUrl: string | null;
  oauthState: string | null;
  unlinkingPlatform: PlatformType | null;
  lastFetchedAt: string | null;
}

// Async Actions
fetchLinkedAccounts()                      // Get all linked accounts
initiateOAuth(platform)                    // Start OAuth flow
handleOAuthCallback(params)                // Process callback
unlinkAccount(platform)                    // Unlink account

// Sync Actions
clearError()
clearOAuthState()
setOAuthInProgress(platform)
```
- **Status:** ✅ Implemented
- **Test:** `accountLinkingSlice.test.ts`

### 4. Account Linking Service
**Location:** `/apps/customer-app/src/services/account-linking.service.ts`

#### API Methods
```typescript
- getLinkedAccounts(): Promise<{ accounts: LinkedAccount[] }>
- initiateSwiggyAuth(): Promise<InitiateAuthResponse>
- initiateZomatoAuth(): Promise<InitiateAuthResponse>
- handleOAuthCallback(params: OAuthCallbackParams): Promise<OAuthCallbackResponse>
- unlinkAccount(platform: PlatformType): Promise<UnlinkAccountResponse>
- refreshToken(platform: PlatformType): Promise<void>
```
- **Status:** ✅ Implemented
- **Test:** `account-linking.service.test.ts`

### 5. Account Linking Types
**Location:** `/apps/customer-app/src/services/account-linking.service.ts`

```typescript
type PlatformType = 'swiggy' | 'zomato';

type AccountStatus =
  | 'not_linked'
  | 'linking'
  | 'linked'
  | 'link_failed'
  | 'token_expired'
  | 'unlinking';

interface LinkedAccount {
  platform: PlatformType;
  status: AccountStatus;
  linkedAt: string | null;
  lastUsed: string | null;
  displayName: string | null;
  expiresAt: string | null;
}

interface InitiateAuthResponse {
  authUrl: string;          // OAuth provider URL
  state: string;            // CSRF token
  platform: PlatformType;
}

interface OAuthCallbackParams {
  code: string;             // Authorization code
  state: string;            // CSRF token
  platform: PlatformType;
}

interface OAuthCallbackResponse {
  success: boolean;
  platform: PlatformType;
  message: string;
}
```

### 6. Custom Hook
**Location:** `/apps/customer-app/src/hooks/useAccountLinking.ts`

#### Hook Features
- Check if platform is linked
- Get account status
- Initiate linking flow
- Handle OAuth callback
- Unlink account
- Automatic token refresh
- **Status:** ✅ Implemented

## OAuth Flow

### Linking Flow (OAuth 2.0 Authorization Code Grant)

1. **User clicks "Link Swiggy Account"**
   - Component: `SwiggyAccountLink`
   - Action: `initiateOAuth('swiggy')`

2. **Backend generates OAuth URL**
   - API: `GET /api/account-linking/swiggy/auth-url`
   - Response: `{ authUrl, state }`
   - State token stored for CSRF protection

3. **User redirected to Swiggy OAuth page**
   - URL: `https://swiggy.com/oauth/authorize?client_id=...&redirect_uri=...&state=...`
   - User logs in to Swiggy
   - User grants permissions

4. **Swiggy redirects back to app**
   - URL: `https://foodbot.com/oauth/callback?code=AUTH_CODE&state=STATE_TOKEN`
   - Component: `OAuthCallback` handles redirect

5. **Exchange authorization code for access token**
   - API: `POST /api/account-linking/callback`
   - Body: `{ code, state, platform: 'swiggy' }`
   - Backend validates state token
   - Backend exchanges code for access token
   - Backend stores encrypted token

6. **Account linked successfully**
   - Redux state updated
   - User redirected to account linking page
   - Success message displayed

### Unlinking Flow

1. **User clicks "Unlink Swiggy Account"**
   - Confirmation dialog shown
   - User confirms

2. **API call to unlink**
   - API: `DELETE /api/account-linking/swiggy`
   - Backend revokes access token
   - Backend deletes stored credentials

3. **State updated**
   - Account status: `not_linked`
   - UI updated

## Security Features

### CSRF Protection
- Random state token generated for each OAuth flow
- State token validated on callback
- Prevents cross-site request forgery attacks

### Token Storage
- Access tokens encrypted at rest
- Refresh tokens stored securely
- Tokens never exposed to frontend

### Token Expiry
- Access tokens expire after 1 hour
- Refresh tokens valid for 30 days
- Automatic refresh before expiry
- User notified when manual re-link needed

### Permissions
- Read-only access to order history
- Cannot modify or place orders on behalf of user
- User can revoke access anytime

## API Endpoints

```
GET /api/account-linking/accounts
  Response: { accounts: LinkedAccount[] }

GET /api/account-linking/swiggy/auth-url
  Response: { authUrl: string, state: string }

GET /api/account-linking/zomato/auth-url
  Response: { authUrl: string, state: string }

POST /api/account-linking/callback
  Body: { code, state, platform }
  Response: { success: boolean, message: string }

DELETE /api/account-linking/:platform
  Response: { success: boolean }

POST /api/account-linking/:platform/refresh
  Response: { success: boolean }
```

## File Locations

```
apps/customer-app/src/
├── components/AccountLinking/
│   ├── AccountLinkingModal.tsx
│   ├── AccountStatus.tsx
│   ├── SwiggyAccountLink.tsx
│   ├── ZomatoAccountLink.tsx
│   ├── index.ts
│   └── __tests__/ (4 test files)
├── pages/
│   ├── AccountLinking.tsx
│   └── OAuthCallback.tsx
├── store/slices/
│   └── accountLinkingSlice.ts
├── services/
│   └── account-linking.service.ts
├── hooks/
│   └── useAccountLinking.ts
└── test/factories/
    └── account-linking.factory.ts
```

## Test Coverage (7 tests)
- ✅ AccountLinkingModal.test.tsx
- ✅ AccountStatus.test.tsx
- ✅ SwiggyAccountLink.test.tsx
- ✅ ZomatoAccountLink.test.tsx
- ✅ AccountLinking.test.tsx (page)
- ✅ accountLinkingSlice.test.ts
- ✅ account-linking.service.test.ts

## User Stories Covered

1. ✅ As a customer, I can link my Swiggy account
2. ✅ As a customer, I can link my Zomato account
3. ✅ As a customer, I can see which accounts are linked
4. ✅ As a customer, I can unlink accounts anytime
5. ✅ As a customer, I am protected from CSRF attacks
6. ✅ As a customer, my tokens are stored securely
7. ✅ As a customer, I'm notified when tokens expire
8. ✅ As a customer, I can reauthorize expired accounts

## Benefits of Account Linking

### For Users
- Order from multiple platforms via one interface
- Unified order history
- Price comparison across platforms
- Single payment method

### For Platform
- Cross-platform restaurant discovery
- Better order tracking
- Enhanced user experience
- Reduced context switching

## Error Handling

### Link Failures
- OAuth denied by user → Show friendly message
- Network error → Retry mechanism
- Invalid state token → Security alert
- Backend error → User-friendly error

### Token Expiry
- 7 days before expiry: Warning banner
- 1 day before expiry: Push notification
- After expiry: "Relink required" message
- Automatic refresh attempt

## Related Requirements

- [CUSTOMER-REQ-001: Chat Interface](./CUSTOMER-REQ-001-chat-interface.md)
- [CUSTOMER-REQ-004: Order Management](./CUSTOMER-REQ-004-order-management.md)

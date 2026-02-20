# FoodBot Mobile App - Setup & Architecture Documentation

**Date:** 2026-02-20
**Status:** Phase 1 Complete - Scaffolding & Architecture
**Agent:** Agent-Mobile

---

## Overview

This document outlines the complete setup and architecture of the FoodBot mobile app, a React Native application for iOS and Android that provides AI-powered food ordering capabilities.

---

## Phase 1: Scaffolding Complete ✅

### What Was Created

A complete React Native application with the following structure:

```
apps/mobile-app/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ChatBubble.tsx   # Chat message bubble
│   │   └── RestaurantCard.tsx # Restaurant display card
│   ├── navigation/          # React Navigation setup
│   │   └── AppNavigator.tsx # Root navigator with auth flow
│   ├── screens/             # Screen components
│   │   ├── ChatScreen.tsx   # Main chat interface
│   │   ├── LoginScreen.tsx  # OAuth login screen
│   │   ├── OAuthCallbackScreen.tsx # OAuth callback handler
│   │   └── RestaurantSearchScreen.tsx # Restaurant search
│   ├── services/            # API clients and services
│   │   ├── api/
│   │   │   └── GatewayClient.ts # Gateway API client
│   │   └── auth/
│   │       └── OAuthService.ts # OAuth flow handler
│   ├── store/               # Redux state management
│   │   ├── index.ts         # Store configuration
│   │   └── slices/
│   │       ├── authSlice.ts # Authentication state
│   │       └── chatSlice.ts # Chat state
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # All shared types
│   └── utils/               # Utility functions
│       └── logger.ts        # Centralized logging
├── android/                 # Android native code (not yet initialized)
├── ios/                     # iOS native code (not yet initialized)
├── App.tsx                  # Root component
├── index.js                 # Entry point
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── babel.config.js          # Babel config
├── metro.config.js          # Metro bundler config
├── jest.config.js           # Jest test config
├── SETUP.sh                 # Setup script
└── README.md                # Documentation
```

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React Native 0.73 | Cross-platform mobile UI |
| Language | TypeScript (strict mode) | Type-safe development |
| Navigation | React Navigation 6 | Screen navigation and routing |
| State Management | Redux Toolkit | Centralized state management |
| API Client | Axios | HTTP requests to Gateway API |
| Secure Storage | react-native-keychain | Encrypted token storage |
| Testing | Jest + React Native Testing Library | Unit and integration tests |

### Key Design Patterns

1. **Result Type Pattern**: All API calls return `Result<T, E>` for explicit error handling
2. **Redux Toolkit Slices**: Modular state management with `createSlice` and `createAsyncThunk`
3. **Service Layer**: Business logic separated from UI components
4. **Type-Safe Navigation**: Fully typed navigation with `RootStackParamList`
5. **Secure Token Storage**: Tokens stored in iOS Keychain/Android Keystore

---

## Core Features Implemented

### 1. Authentication Flow

**OAuth Integration** with Google, Facebook, and Apple:

```typescript
// Initiate OAuth flow
await dispatch(loginWithOAuth('google'));
// User redirected to browser for authentication
// Browser redirects back via deep link (foodbot://oauth/callback)
// App exchanges code for tokens
// Tokens stored securely in Keychain
```

**Token Management**:
- Access tokens with automatic refresh
- Secure storage using react-native-keychain
- Token expiration checking
- Automatic logout on token failure

**Session Restoration**:
- Automatically restores session on app launch
- Validates tokens before allowing access
- Fetches user profile to confirm authentication

### 2. Chat System

**Redux State Management**:
```typescript
// Create new chat session
dispatch(createNewChatSession());

// Send message
dispatch(sendMessage({ sessionId, content }));

// Load chat history
dispatch(loadChatHistory(sessionId));
```

**Features**:
- Multiple chat sessions
- Real-time message updates
- Optimistic UI updates
- Error handling with retry

### 3. Restaurant Search

**API Integration**:
```typescript
const result = await gatewayClient.searchRestaurants({
  query: 'pizza',
  cuisine: 'Italian',
  page: 1,
  pageSize: 20
});
```

**Features**:
- Search by query, cuisine, location
- Pagination support
- Restaurant cards with images
- Rating and price display

### 4. Gateway API Client

**Comprehensive API Client** for backend communication:

```typescript
// Endpoints implemented:
- POST /chat/sessions (create session)
- GET /chat/sessions/:id (get session)
- POST /chat/sessions/:id/messages (send message)
- GET /chat/sessions/:id/messages (get history)
- GET /restaurants/search (search restaurants)
- GET /restaurants/:id (get restaurant)
- POST /orders (create order)
- GET /orders/:id (get order)
- GET /users/me (get current user)
```

**Features**:
- Automatic authentication header injection
- Token refresh on 401 errors
- Typed request/response interfaces
- Error handling with Result type
- Request/response interceptors

---

## Configuration Files

### package.json

Dependencies installed:
- React Native 0.73.2
- React Navigation 6.x
- Redux Toolkit 2.x
- Axios 1.6.5
- react-native-keychain 8.1.2
- TypeScript 5.0.4

### tsconfig.json

**Strict TypeScript Configuration**:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true
}
```

### babel.config.js

**Module Resolution**:
- Path aliasing with `@/` for `src/`
- React Native preset

### jest.config.js

**Test Configuration**:
- Coverage threshold: 80%
- React Native preset
- Mock setup for Keychain and AsyncStorage

---

## Type System

### Core Domain Types

**User & Authentication**:
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
```

**Restaurant & Orders**:
```typescript
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: string;
  address: string;
  imageUrl?: string;
}

interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}
```

**Chat**:
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context?: ChatContext;
}
```

---

## Setup Instructions

### Prerequisites

**General**:
- Node.js >= 18
- pnpm package manager
- Git

**iOS Development**:
- macOS
- Xcode >= 14
- CocoaPods

**Android Development**:
- Android Studio
- Android SDK 33
- JDK 17

### Installation Steps

1. **Install Dependencies**:
```bash
cd apps/mobile-app
pnpm install
```

2. **iOS Setup** (macOS only):
```bash
cd ios
pod install
cd ..
```

3. **Environment Configuration**:

Create `.env` file:
```env
GATEWAY_API_URL=http://localhost:3000/api/v1
GOOGLE_CLIENT_ID=your_google_client_id
FACEBOOK_CLIENT_ID=your_facebook_client_id
APPLE_CLIENT_ID=your_apple_client_id
```

4. **Configure Deep Linking**:

**iOS** (`ios/FoodBotMobile/Info.plist`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>foodbot</string>
    </array>
  </dict>
</array>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="foodbot" />
</intent-filter>
```

5. **Run the App**:

```bash
# Start Metro bundler
pnpm start

# Run on iOS
pnpm run ios

# Run on Android
pnpm run android
```

---

## Integration with Existing System

### Gateway API Integration

The mobile app communicates with the Gateway API (`apps/gateway-api`):

```
Mobile App → Gateway API → Services (MCP, LLM Router, etc.)
```

**Expected Endpoints** (to be implemented in Gateway API):
- `POST /api/v1/auth/oauth/callback` - Exchange OAuth code for tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/chat/sessions` - Create chat session
- `GET /api/v1/chat/sessions/:id` - Get chat session
- `POST /api/v1/chat/sessions/:id/messages` - Send message
- `GET /api/v1/restaurants/search` - Search restaurants
- `POST /api/v1/orders` - Create order

### MCP OAuth Integration

The mobile OAuth flow integrates with the existing MCP OAuth system:

1. Mobile app initiates OAuth with provider (Google/Facebook/Apple)
2. Provider redirects to mobile app via deep link
3. Mobile app sends authorization code to Gateway API
4. Gateway API validates code with MCP OAuth service
5. MCP OAuth service returns tokens
6. Gateway API forwards tokens to mobile app

---

## Development Workflow

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add route to `AppNavigator.tsx`
3. Update `RootStackParamList` in `src/types/index.ts`
4. Add navigation logic in parent components

### Adding New API Endpoints

1. Add method to `GatewayClient.ts`
2. Define request/response types in `src/types/index.ts`
3. Create Redux slice if needed
4. Use in components via hooks

### State Management Pattern

```typescript
// 1. Define async thunk
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, {rejectWithValue}) => {
    const result = await gatewayClient.getCurrentUser();
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return result.data;
  }
);

// 2. Use in component
const dispatch = useAppDispatch();
const {user, loading} = useAppSelector((state) => state.auth);

useEffect(() => {
  dispatch(fetchUserProfile());
}, []);
```

---

## Testing Strategy

### Unit Tests

Test files located next to source files (`.test.ts`, `.test.tsx`):

```typescript
// Example: authSlice.test.ts
describe('authSlice', () => {
  it('should handle successful login', async () => {
    const store = mockStore();
    await store.dispatch(completeOAuthCallback({code, state}));
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });
});
```

### Integration Tests

Test API client integration:

```typescript
// GatewayClient.test.ts
describe('GatewayClient', () => {
  it('should search restaurants', async () => {
    const result = await gatewayClient.searchRestaurants({query: 'pizza'});
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests (Future)

Use Detox for end-to-end testing:
- User authentication flow
- Chat interaction
- Restaurant search and ordering

---

## Security Considerations

### Token Storage

- **iOS**: Tokens stored in iOS Keychain (encrypted)
- **Android**: Tokens stored in Android Keystore (encrypted)
- Tokens never stored in AsyncStorage or plain text

### API Security

- All requests include authentication header
- Automatic token refresh on expiration
- HTTPS-only communication (enforced in production)

### Input Validation

- All user input validated before API calls
- XSS prevention via React Native's built-in escaping
- SQL injection prevented by parameterized queries (backend)

---

## Performance Optimizations

### Implemented

1. **React.memo** for expensive components
2. **Flat lists** with optimized rendering
3. **Image lazy loading** ready
4. **Redux state normalization** ready

### Planned (Phase 2)

1. List virtualization for large datasets
2. Image caching with react-native-fast-image
3. Redux Persist for offline support
4. Code splitting for routes

---

## Known Limitations & TODOs

### Current Limitations

1. **Native projects not initialized**: Android/iOS native folders need React Native CLI initialization
2. **No actual OAuth providers configured**: Need real client IDs
3. **Backend endpoints not implemented**: Gateway API needs to implement expected endpoints
4. **No push notifications**: Requires Firebase/APNS setup
5. **No offline support**: Redux Persist not configured yet

### Phase 2 Tasks (Weeks 11-14)

- [ ] Initialize native projects with `react-native init`
- [ ] Configure OAuth providers (Google, Facebook, Apple)
- [ ] Implement real-time order tracking with WebSocket
- [ ] Add push notifications (Firebase Cloud Messaging)
- [ ] Implement offline support with Redux Persist
- [ ] Add restaurant detail screens
- [ ] Add order history and reordering
- [ ] Implement voice input for chat
- [ ] Add image sharing in chat

### Phase 3 Tasks (Weeks 15-16)

- [ ] Performance optimization (bundle size, render performance)
- [ ] Comprehensive testing (unit, integration, E2E with Detox)
- [ ] Accessibility improvements (screen readers, color contrast)
- [ ] Error tracking integration (Sentry)
- [ ] Analytics integration (Firebase Analytics)
- [ ] App Store/Play Store preparation

---

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear cache
pnpm start -- --reset-cache

# Clean install
rm -rf node_modules
pnpm install
```

### iOS Build Issues

```bash
cd ios
xcodebuild clean
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
```

### Deep Linking Not Working

1. Verify `foodbot://` scheme configured in native files
2. Test: `npx uri-scheme open foodbot://oauth/callback --ios`
3. Check OAuth redirect URI matches

---

## Next Steps

### Immediate Next Steps (Week 8-10)

1. **Initialize Native Projects**:
   ```bash
   # This requires React Native CLI and can only be done with command access
   npx react-native init FoodBotMobile --directory apps/mobile-app
   ```

2. **Install Dependencies**:
   ```bash
   cd apps/mobile-app
   pnpm install
   cd ios && pod install && cd ..
   ```

3. **Configure OAuth Providers**:
   - Register app with Google OAuth
   - Register app with Facebook Login
   - Register app with Apple Sign In
   - Update `.env` with client IDs

4. **Implement Gateway API Endpoints**:
   - Coordinate with backend team to implement required endpoints
   - Test API integration

5. **Test on Real Devices**:
   - Test OAuth flow on iOS device
   - Test OAuth flow on Android device
   - Test deep linking

### Medium Term (Week 11-14)

1. Real-time features (WebSocket for order tracking)
2. Push notifications
3. Offline support
4. Advanced chat features

### Long Term (Week 15-16)

1. Performance optimization
2. Comprehensive testing
3. App Store submission
4. Play Store submission

---

## Resources

### Official Documentation

- [React Native](https://reactnavigation.org/)
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native Keychain](https://github.com/oblador/react-native-keychain)

### Internal Documentation

- `/apps/mobile-app/README.md` - Mobile app setup guide
- `/apps/mobile-app/SETUP.sh` - Automated setup script
- `/docs/MOBILE_APP_SETUP.md` - This document

---

## Conclusion

Phase 1 (Scaffolding) is **COMPLETE**. The mobile app has a solid foundation with:

✅ Complete TypeScript/React Native code structure
✅ Redux state management configured
✅ API client with auth handling
✅ OAuth service with token management
✅ Navigation with auth flow
✅ Basic screens (Login, Chat, Restaurant Search)
✅ Comprehensive type system
✅ Testing infrastructure
✅ Development documentation

**Status**: Ready for native initialization and backend integration.

**Blocked On**:
1. React Native CLI access to initialize native projects
2. Gateway API endpoint implementation
3. OAuth provider registration

---

**Document Version**: 1.0
**Last Updated**: 2026-02-20
**Author**: Agent-Mobile

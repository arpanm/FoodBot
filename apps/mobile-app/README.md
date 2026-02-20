# FoodBot Mobile App

AI-powered food ordering assistant for iOS and Android.

## Overview

The FoodBot mobile app provides a native mobile experience for users to:
- Chat with an AI assistant to find restaurants
- Browse and search restaurants
- Place food orders
- Track order status
- Manage user preferences

## Architecture

```
apps/mobile-app/
├── src/
│   ├── navigation/        # React Navigation setup
│   ├── screens/           # Screen components
│   ├── components/        # Reusable UI components
│   ├── services/          # API clients and services
│   │   ├── api/          # Gateway API client
│   │   └── auth/         # OAuth service
│   ├── store/            # Redux store and slices
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── android/              # Android native code
├── ios/                  # iOS native code
└── package.json
```

## Tech Stack

- **React Native 0.73** - Cross-platform mobile framework
- **TypeScript** - Type-safe JavaScript
- **React Navigation 6** - Navigation library
- **Redux Toolkit** - State management
- **Axios** - HTTP client
- **React Native Keychain** - Secure token storage

## Prerequisites

### General
- Node.js >= 18
- pnpm (for package management)

### iOS Development
- macOS
- Xcode >= 14
- CocoaPods

### Android Development
- Android Studio
- Android SDK
- Java Development Kit (JDK) 17

## Setup

### 1. Install Dependencies

```bash
cd apps/mobile-app
pnpm install
```

### 2. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the `apps/mobile-app` directory:

```env
GATEWAY_API_URL=http://localhost:3000/api/v1
GOOGLE_CLIENT_ID=your_google_client_id_here
FACEBOOK_CLIENT_ID=your_facebook_client_id_here
APPLE_CLIENT_ID=your_apple_client_id_here
```

### 4. Configure Deep Linking

#### iOS (ios/FoodBotMobile/Info.plist)

Add the following to your `Info.plist`:

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

#### Android (android/app/src/main/AndroidManifest.xml)

Add the following intent filter to your main activity:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="foodbot" />
</intent-filter>
```

## Running the App

### Start Metro Bundler

```bash
pnpm start
```

### Run on iOS

```bash
pnpm run ios
```

Or open `ios/FoodBotMobile.xcworkspace` in Xcode and run from there.

### Run on Android

```bash
pnpm run android
```

Or open the `android` folder in Android Studio and run from there.

## Development Workflow

### Project Structure

- **Screens**: Full-page components representing app screens
- **Components**: Reusable UI components used across screens
- **Services**: API clients and business logic
- **Store**: Redux state management (slices for auth, chat, etc.)
- **Types**: Shared TypeScript types and interfaces

### State Management

The app uses Redux Toolkit for state management with the following slices:

- **authSlice**: Authentication state, user profile, OAuth flow
- **chatSlice**: Chat sessions, messages, active session

### API Integration

The app communicates with the Gateway API (`apps/gateway-api`) through the `GatewayClient`:

```typescript
import {gatewayClient} from '@/services/api/GatewayClient';

// Example: Search restaurants
const result = await gatewayClient.searchRestaurants({
  query: 'pizza',
  page: 1,
  pageSize: 20,
});

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Authentication Flow

1. User taps "Login with Google/Facebook/Apple"
2. App initiates OAuth flow via `OAuthService`
3. User is redirected to OAuth provider in browser
4. After authentication, browser redirects back to app via deep link
5. App exchanges authorization code for tokens
6. Tokens are stored securely in Keychain
7. User is navigated to main app screens

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add route to navigation in `src/navigation/AppNavigator.tsx`
3. Add screen to `RootStackParamList` type in `src/types/index.ts`

### Adding New API Endpoints

1. Add method to `GatewayClient` in `src/services/api/GatewayClient.ts`
2. Create Redux slice if needed in `src/store/slices/`
3. Use in screen components via `useAppDispatch` and `useAppSelector`

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test -- --watch
```

## Building for Production

### iOS

```bash
cd ios
xcodebuild -workspace FoodBotMobile.xcworkspace -scheme FoodBotMobile -configuration Release
```

Or use Xcode to archive and distribute.

### Android

```bash
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear Metro cache
pnpm start -- --reset-cache
```

### iOS Build Issues

```bash
# Clean build
cd ios
xcodebuild clean
pod install
cd ..
```

### Android Build Issues

```bash
# Clean build
cd android
./gradlew clean
cd ..
```

### Deep Linking Not Working

1. Verify `foodbot://` scheme is configured in native files
2. Test deep link: `npx uri-scheme open foodbot://oauth/callback --ios`
3. Check that redirect URI matches in OAuth provider settings

## Architecture Decisions

### Why Redux Toolkit?

- Type-safe state management
- Built-in async handling with `createAsyncThunk`
- DevTools integration for debugging
- Scales well for complex state

### Why React Navigation?

- Most popular React Native navigation library
- Type-safe navigation with TypeScript
- Supports deep linking out of the box
- Active maintenance and community

### Why Keychain for Token Storage?

- Secure storage using iOS Keychain and Android Keystore
- Encrypted at rest
- Survives app uninstalls (optional)
- Industry standard for mobile token storage

## Next Steps

### Phase 2: Advanced Features (Weeks 11-14)

- [ ] Real-time order tracking with WebSocket
- [ ] Push notifications
- [ ] Offline support with Redux Persist
- [ ] Advanced chat features (voice input, image sharing)
- [ ] Restaurant detail screens
- [ ] Order history and reordering

### Phase 3: Polish (Weeks 15-16)

- [ ] Performance optimization
- [ ] Comprehensive testing (unit, integration, E2E)
- [ ] Accessibility improvements
- [ ] Error handling and logging
- [ ] Analytics integration

## Contributing

See main project README for contribution guidelines.

## License

MIT

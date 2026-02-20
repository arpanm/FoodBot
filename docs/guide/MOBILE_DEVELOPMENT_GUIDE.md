# FoodBot Mobile App - Development Guide

**Version**: 1.0
**Last Verified**: 2026-02-20
**Technology**: React Native 0.73.2
**Target Audience**: Mobile developers joining the FoodBot project

**Verification Status**: ✅ All file paths, structure, and commands verified against actual codebase

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Architecture Patterns](#architecture-patterns)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Testing Guide](#testing-guide)
8. [Styling Guide](#styling-guide)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### About This App

The FoodBot mobile app is built with **React Native** (not Capacitor or Ionic). This means:
- Native iOS and Android builds using React Native CLI
- Access to native modules and APIs
- Separate native code for iOS (Swift/Objective-C) and Android (Java/Kotlin)
- Requires platform-specific development tools (Xcode, Android Studio)

### Prerequisites

**Required**:
- Node.js >= 18
- pnpm (install: `npm install -g pnpm`)
- **For iOS Development** (macOS only):
  - Xcode >= 14
  - CocoaPods (install: `sudo gem install cocoapods`)
  - iOS Simulator or physical device
- **For Android Development**:
  - Android Studio
  - Android SDK (API 33+)
  - Android Emulator or physical device
  - Java Development Kit (JDK) 11 or higher

### Setup

```bash
# 1. Clone repository
cd /path/to/FoodBot

# 2. Navigate to mobile app
cd apps/mobile-app

# 3. Install dependencies
pnpm install

# 4. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 5. iOS setup (macOS only)
cd ios && pod install && cd ..

# 6. Start Metro bundler
pnpm start

# 7. Run on iOS (separate terminal)
pnpm run ios

# 8. Run on Android (separate terminal)
pnpm run android
```

### Using Wrapper Script

Alternatively, use the FoodBot wrapper script from project root:

```bash
# Build mobile app
./foodbot build mobile-app

# Run in development mode (starts Metro bundler)
./foodbot dev mobile-app

# Run tests
./foodbot test mobile-app

# Lint code
./foodbot lint mobile-app
```

**Note**: The wrapper script handles pnpm workspace filtering automatically.

---

## Project Structure

```
apps/mobile-app/
├── src/                     # ✅ Verified structure
│   ├── components/          # Reusable UI components
│   ├── examples/            # Example components/screens
│   ├── hooks/               # Custom React hooks
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # Full-page screen components
│   ├── services/            # Business logic and API clients
│   ├── store/               # Redux state management
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── docs/                    # Mobile app specific documentation
├── android/                 # Android native code (React Native)
├── ios/                     # iOS native code (React Native)
├── App.tsx                  # Root component
├── index.js                 # Entry point
├── babel.config.js          # Babel configuration
├── metro.config.js          # Metro bundler configuration
├── jest.config.js           # Jest test configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts

**Technology Stack**:
- **React Native**: 0.73.2
- **Navigation**: @react-navigation/native 6.1.9
- **State Management**: Redux Toolkit 2.0.1
- **HTTP Client**: axios 1.6.5
- **Secure Storage**: react-native-keychain 8.1.2
- **TypeScript**: 5.0.4
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `ChatBubble.tsx`)
- **Services**: PascalCase (e.g., `GatewayClient.ts`)
- **Utils**: camelCase (e.g., `logger.ts`)
- **Tests**: `.test.ts` or `.test.tsx` suffix

---

## Development Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b mobile/feature-name

# Make changes and commit
git add .
git commit -m "mobile: add feature description"

# Push and create PR
git push origin mobile/feature-name
gh pr create
```

### Code Review Checklist

Before submitting PR:
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript compiles (`pnpm tsc`)
- [ ] Manual testing on iOS and Android
- [ ] Screenshots/video added to PR (for UI changes)
- [ ] Documentation updated

### Development Loop

```bash
# Terminal 1: Metro bundler
pnpm start

# Terminal 2: Run app
pnpm run ios
# or
pnpm run android

# Terminal 3: Run tests in watch mode
pnpm test -- --watch
```

---

## Architecture Patterns

### 1. Result Type Pattern

All API calls return a `Result<T, E>` type for explicit error handling:

```typescript
// Service layer
async function getRestaurant(id: string): Promise<Result<Restaurant, ApiError>> {
  const result = await gatewayClient.getRestaurant(id);
  return result;
}

// Component usage
const result = await getRestaurant('123');

if (result.success) {
  setRestaurant(result.data);
} else {
  showError(result.error.message);
}
```

### 2. Redux Toolkit Pattern

State management using Redux Toolkit slices:

```typescript
// Define slice
export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.messages.push(action.payload);
    });
  },
});

// Use in component
const dispatch = useAppDispatch();
const messages = useAppSelector((state) => state.chat.messages);

dispatch(addMessage(newMessage));
```

### 3. Service Layer Pattern

Business logic separated from UI:

```typescript
// ❌ BAD - business logic in component
const ChatScreen = () => {
  const handleSend = async () => {
    const response = await axios.post('/api/messages', {text});
    // Complex logic here...
  };
};

// ✅ GOOD - business logic in service
const ChatScreen = () => {
  const handleSend = async () => {
    const result = await chatService.sendMessage(text);
    if (result.success) {
      // Handle success
    }
  };
};
```

### 4. Type-Safe Navigation

All navigation is fully typed:

```typescript
// Define param list
export type RootStackParamList = {
  Chat: {sessionId: string};
  RestaurantDetail: {restaurantId: string};
};

// Use in component
type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC<Props> = ({route, navigation}) => {
  const {sessionId} = route.params; // Typed!

  navigation.navigate('RestaurantDetail', {
    restaurantId: '123', // Type-checked!
  });
};
```

---

## State Management

### Redux Store Structure

```typescript
RootState = {
  auth: {
    isAuthenticated: boolean;
    user: User | null;
    tokens: AuthTokens | null;
    loading: boolean;
    error: string | null;
  },
  chat: {
    sessions: ChatSession[];
    activeSessionId: string | null;
    loading: boolean;
    error: string | null;
  }
}
```

### Creating a New Slice

```typescript
// 1. Define state interface
interface FeatureState {
  data: Data[];
  loading: boolean;
  error: string | null;
}

// 2. Create async thunk
export const fetchData = createAsyncThunk(
  'feature/fetchData',
  async (_, {rejectWithValue}) => {
    const result = await apiClient.getData();
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return result.data;
  }
);

// 3. Create slice
export const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    // Synchronous actions
  },
  extraReducers: (builder) => {
    // Async action handling
    builder.addCase(fetchData.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchData.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
    });
    builder.addCase(fetchData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

// 4. Export actions and reducer
export const {/* actions */} = featureSlice.actions;
export default featureSlice.reducer;

// 5. Add to store
// store/index.ts
export const store = configureStore({
  reducer: {
    feature: featureReducer,
  },
});
```

### Using State in Components

```typescript
const MyComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const {data, loading, error} = useAppSelector((state) => state.feature);

  useEffect(() => {
    dispatch(fetchData());
  }, [dispatch]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return <DataList data={data} />;
};
```

---

## API Integration

### Gateway API Client

Located at `src/services/api/GatewayClient.ts`:

```typescript
// Usage in components
import {gatewayClient} from '@/services/api/GatewayClient';

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

### Adding New Endpoints

```typescript
// 1. Add method to GatewayClient
class GatewayClient {
  async getMenuItem(menuItemId: string): Promise<Result<MenuItem, ApiError>> {
    return this.request<MenuItem>({
      method: 'GET',
      url: `/menu-items/${menuItemId}`,
    });
  }
}

// 2. Define types
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

// 3. Use in component or service
const result = await gatewayClient.getMenuItem('item-123');
```

### Authentication Headers

Authentication is handled automatically by the API client:

```typescript
// Request interceptor adds auth header
this.client.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// Response interceptor handles token refresh
this.client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token and retry
      const newTokens = await refreshAccessToken();
      // Retry original request
    }
  }
);
```

---

## Testing Guide

### Unit Tests

Test individual functions and components:

```typescript
// authSlice.test.ts
describe('authSlice', () => {
  it('should handle successful login', () => {
    const initialState = {isAuthenticated: false};
    const action = {type: 'auth/login/fulfilled', payload: {user}};
    const state = authReducer(initialState, action);

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
  });
});
```

### Component Tests

Test component rendering and interactions:

```typescript
// ChatBubble.test.tsx
import {render} from '@testing-library/react-native';

describe('ChatBubble', () => {
  it('should render user message', () => {
    const message = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const {getByText} = render(<ChatBubble message={message} />);

    expect(getByText('Hello')).toBeTruthy();
  });
});
```

### Integration Tests

Test API integration:

```typescript
// GatewayClient.test.ts
describe('GatewayClient', () => {
  it('should search restaurants', async () => {
    const result = await gatewayClient.searchRestaurants({
      query: 'pizza',
    });

    expect(result.success).toBe(true);
    expect(result.data.data).toBeInstanceOf(Array);
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- ChatBubble.test.tsx
```

---

## Styling Guide

### StyleSheet API

Use React Native's StyleSheet API:

```typescript
import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

// Usage
<View style={styles.container}>
  <Text style={styles.title}>Title</Text>
</View>
```

### Style Composition

Combine styles with array syntax:

```typescript
<View style={[styles.button, isActive && styles.buttonActive]} />
```

### Design System

**Colors**:
```typescript
const Colors = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  background: '#F5F5F5',
  text: '#333',
  textLight: '#666',
  textMuted: '#999',
  error: '#D32F2F',
  success: '#4CAF50',
};
```

**Typography**:
```typescript
const Typography = {
  h1: {fontSize: 32, fontWeight: 'bold'},
  h2: {fontSize: 24, fontWeight: 'bold'},
  body: {fontSize: 16, lineHeight: 24},
  caption: {fontSize: 12, color: '#999'},
};
```

**Spacing**:
```typescript
const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

---

## Common Tasks

### Adding a New Screen

1. **Create screen component**:
```typescript
// src/screens/ProfileScreen.tsx
import React from 'react';
import {View, Text} from 'react-native';

const ProfileScreen: React.FC = () => {
  return (
    <View>
      <Text>Profile</Text>
    </View>
  );
};

export default ProfileScreen;
```

2. **Add to navigation**:
```typescript
// src/navigation/AppNavigator.tsx
import ProfileScreen from '../screens/ProfileScreen';

<Stack.Screen name="Profile" component={ProfileScreen} />
```

3. **Update types**:
```typescript
// src/types/index.ts
export type RootStackParamList = {
  Profile: undefined; // No params
};
```

### Adding a New Component

```typescript
// src/components/Button.tsx
import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, styles[variant]]}
      onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#FF6B6B',
  },
  secondary: {
    backgroundColor: '#4ECDC4',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Making API Calls

```typescript
// In component
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<Restaurant[]>([]);

const loadData = async () => {
  setLoading(true);
  setError(null);

  const result = await gatewayClient.searchRestaurants({query: 'pizza'});

  if (result.success) {
    setData(result.data.data);
  } else {
    setError(result.error.message);
  }

  setLoading(false);
};

useEffect(() => {
  loadData();
}, []);
```

### Handling Forms

```typescript
const [form, setForm] = useState({
  name: '',
  email: '',
});

const [errors, setErrors] = useState<Record<string, string>>({});

const validate = () => {
  const newErrors: Record<string, string> = {};

  if (!form.name) {
    newErrors.name = 'Name is required';
  }

  if (!form.email.includes('@')) {
    newErrors.email = 'Invalid email';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = () => {
  if (validate()) {
    // Submit form
  }
};

return (
  <View>
    <TextInput
      value={form.name}
      onChangeText={(name) => setForm({...form, name})}
      placeholder="Name"
    />
    {errors.name && <Text style={styles.error}>{errors.name}</Text>}
  </View>
);
```

---

## Troubleshooting

### Metro Bundler Issues

**Problem**: Metro bundler won't start
```bash
# Solution: Clear cache
pnpm start -- --reset-cache
```

**Problem**: Module not found
```bash
# Solution: Clean and reinstall
rm -rf node_modules
pnpm install
```

### iOS Build Issues

**Problem**: Pod install fails
```bash
# Solution: Update CocoaPods
cd ios
pod repo update
pod install
cd ..
```

**Problem**: Build fails with signing error
- Open `ios/FoodBotMobile.xcworkspace` in Xcode
- Select target → Signing & Capabilities
- Update Team and Bundle Identifier

### Android Build Issues

**Problem**: Gradle build fails
```bash
# Solution: Clean and rebuild
cd android
./gradlew clean
cd ..
```

**Problem**: SDK not found
- Open Android Studio
- Tools → SDK Manager
- Install required SDK versions (Android 33)

### Deep Linking Issues

**Problem**: OAuth callback not working

**Solution**: Verify deep link configuration

iOS (`ios/FoodBotMobile/Info.plist`):
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

Android (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter>
  <data android:scheme="foodbot" />
</intent-filter>
```

Test deep link:
```bash
npx uri-scheme open foodbot://oauth/callback --ios
```

### Redux State Issues

**Problem**: State not updating

**Solution**: Check that you're using dispatch correctly
```typescript
// ❌ BAD - mutating state directly
state.user = newUser;

// ✅ GOOD - using dispatch
dispatch(setUser(newUser));
```

**Problem**: Type errors with selectors

**Solution**: Use typed hooks
```typescript
// ❌ BAD
const user = useSelector((state: any) => state.auth.user);

// ✅ GOOD
const user = useAppSelector((state) => state.auth.user);
```

---

## Best Practices

### Performance

1. **Use React.memo for expensive components**:
```typescript
export const ExpensiveComponent = React.memo(({data}) => {
  // Expensive rendering logic
});
```

2. **Use FlatList for long lists**:
```typescript
<FlatList
  data={items}
  renderItem={({item}) => <Item {...item} />}
  keyExtractor={(item) => item.id}
/>
```

3. **Avoid anonymous functions in render**:
```typescript
// ❌ BAD
<Button onPress={() => handlePress(id)} />

// ✅ GOOD
const handleButtonPress = useCallback(() => {
  handlePress(id);
}, [id]);

<Button onPress={handleButtonPress} />
```

### Security

1. **Never hardcode secrets**:
```typescript
// ❌ BAD
const apiKey = 'sk_live_abc123';

// ✅ GOOD
const apiKey = process.env.API_KEY;
```

2. **Use secure storage for tokens**:
```typescript
// ✅ GOOD - using Keychain
await Keychain.setGenericPassword('tokens', JSON.stringify(tokens));
```

3. **Validate all user input**:
```typescript
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
```

### Code Quality

1. **Use TypeScript strict mode**
2. **Write tests for all business logic**
3. **Follow naming conventions**
4. **Keep components small and focused**
5. **Extract reusable logic to hooks or services**

---

## Resources

### Official Documentation

- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [TypeScript](https://www.typescriptlang.org/)

### Internal Documentation

- `/apps/mobile-app/README.md` - Project README
- `/docs/MOBILE_APP_SETUP.md` - Setup guide
- `/docs/MOBILE_DEVELOPMENT_GUIDE.md` - This document

### Community Resources

- [React Native Community](https://reactnative.dev/community/overview)
- [Expo Forums](https://forums.expo.dev/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

---

**Happy Coding! 🚀**

# Restaurant Requirement: Authentication & Onboarding

**Requirement ID:** RESTAURANT-REQ-001
**Feature:** Restaurant Owner Authentication and Onboarding Flow
**Status:** ✅ Implemented
**Priority:** High
**Implementation Date:** 2026-02-19

---

## Overview

Complete authentication system with registration, login, and multi-step restaurant onboarding process.

## Implemented Features

### 1. Authentication Pages
**Location:** `/apps/restaurant-app/src/pages/Auth/`

#### Login.tsx
- Email/password login form
- Form validation
- Remember me option
- Forgot password link
- Error messaging
- Redirect to dashboard after login
- **Status:** ✅ Implemented

#### Register.tsx
- Owner registration form
- Fields: name, email, phone, password, confirm password
- Terms and conditions checkbox
- Email verification
- Auto-login after registration
- Redirect to onboarding
- **Status:** ✅ Implemented

### 2. Onboarding Page
**Location:** `/apps/restaurant-app/src/pages/Onboarding/`

#### RestaurantSetup.tsx
- Multi-step wizard (4 steps)
- **Step 1:** Basic Information
  - Restaurant name
  - Description
  - Cuisine types (multi-select)
  - Logo upload
  - Images upload (multiple)
- **Step 2:** Location
  - Address (street, city, state, zip)
  - Coordinates (map picker)
  - Delivery radius
- **Step 3:** Operating Hours
  - Hours for each day of week
  - Closed days marking
  - Special hours (holidays)
- **Step 4:** Contact & Delivery
  - Phone number
  - Email (optional)
  - Website (optional)
  - Delivery fee
  - Minimum order amount
  - Accepts delivery/pickup flags
- Progress indicator
- Back/Next navigation
- Form validation per step
- Save and continue later
- **Status:** ✅ Implemented

### 3. Layout Components
**Location:** `/apps/restaurant-app/src/components/layout/`

#### ProtectedRoute.tsx
- Route protection middleware
- Checks authentication status
- Redirects to login if not authenticated
- Checks onboarding completion
- Redirects to onboarding if incomplete
- Loading state during auth check
- **Status:** ✅ Implemented

#### AppLayout.tsx
- Main layout wrapper
- Sidebar navigation
- Header with user menu
- Logout functionality
- Notifications indicator
- **Status:** ✅ Implemented

#### Sidebar.tsx
- Navigation menu
- Dashboard, Orders, Menu, Analytics, Profile
- Active route highlighting
- Collapse/expand on mobile
- Restaurant logo display
- **Status:** ✅ Implemented

### 4. Authentication Context
**Location:** `/apps/restaurant-app/src/contexts/auth-context.tsx`

#### Auth State Management
```typescript
interface AuthState {
  user: RestaurantOwner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue {
  ...AuthState,
  login(data: LoginRequest): Promise<void>;
  register(data: RegisterRequest): Promise<void>;
  logout(): Promise<void>;
  clearError(): void;
}
```

**Features:**
- JWT token management
- Automatic token refresh
- User session persistence
- Login/logout/register methods
- Error handling
- **Status:** ✅ Implemented

### 5. Authentication Service
**Location:** `/apps/restaurant-app/src/services/auth-api.ts`

#### API Methods
```typescript
- login(email, password): Promise<LoginResponse>
- register(data: RegisterRequest): Promise<void>
- logout(): Promise<void>
- getCurrentUser(): Promise<RestaurantOwner>
- refreshToken(): Promise<{ token: string }>
- forgotPassword(email: string): Promise<void>
- resetPassword(token: string, newPassword: string): Promise<void>
```
- **Status:** ✅ Implemented

### 6. Restaurant Context
**Location:** `/apps/restaurant-app/src/contexts/restaurant-context.tsx`

#### Restaurant State Management
```typescript
interface RestaurantState {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: string | null;
}

interface RestaurantContextValue {
  ...RestaurantState,
  fetchRestaurant(): Promise<void>;
  updateRestaurant(data: Partial<Restaurant>): Promise<void>;
  toggleOpen(): Promise<void>;
}
```

**Features:**
- Restaurant profile loading
- Profile updates
- Open/closed toggle
- Caching
- **Status:** ✅ Implemented

### 7. Data Models
**Location:** `/apps/restaurant-app/src/types/models.ts`

```typescript
interface RestaurantOwner {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'restaurant_owner';
  restaurantId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  logo: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceRange: number;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  isOpen: boolean;
  isActive: boolean;
  isApproved: boolean;
  location: Location;
  hours?: OperatingHours;
  contactInfo?: ContactInfo;
  deliverySettings?: DeliverySettings;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface DayHours {
  open: string;        // "09:00"
  close: string;       // "22:00"
  isClosed: boolean;
}
```

## Authentication Flow

### Registration Flow
1. Owner visits `/register`
2. Fills registration form
3. Backend creates owner account
4. Email verification sent
5. Owner clicks verification link
6. Auto-login and redirect to `/onboarding`
7. Complete restaurant setup
8. Admin approval required
9. Restaurant goes live after approval

### Login Flow
1. Owner visits `/login`
2. Enters email and password
3. Backend validates credentials
4. JWT token issued (expires: 24h)
5. Token stored in localStorage
6. Redirect to dashboard
7. Check if onboarding complete
   - If incomplete: Redirect to `/onboarding`
   - If complete: Stay on dashboard

### Onboarding Flow
1. **Step 1:** Basic Info → Click Next
2. **Step 2:** Location → Click Next
3. **Step 3:** Operating Hours → Click Next
4. **Step 4:** Contact & Delivery → Click Submit
5. Backend validates all data
6. Restaurant profile created with status: `pending_approval`
7. Owner notified to wait for approval
8. Admin reviews and approves/rejects
9. Owner notified of decision
10. If approved: Restaurant status → `active`
11. Owner can now manage orders

## JWT Token Management

### Token Storage
- Access token stored in `localStorage` (key: `restaurant_jwt_token`)
- Expires: 24 hours
- Refresh token not implemented (future enhancement)

### Token Refresh
- On 401 response: Try refresh
- If refresh fails: Logout and redirect to login
- Automatic refresh before expiry (future)

### Token Validation
- Every protected route checks authentication
- Token included in all API requests via interceptor
- Format: `Authorization: Bearer <token>`

## Onboarding Approval Process

### Status Flow
```
pending_verification  (email not verified)
    ↓
pending_approval      (submitted for review)
    ↓
approved / rejected   (admin decision)
    ↓
active / inactive     (operational status)
```

### Admin Actions
- Review restaurant information
- Check documents (license, permits)
- Verify location
- Approve or reject with reason
- Notify owner via email

## API Endpoints

```
Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

Onboarding
POST   /api/restaurants/setup
GET    /api/restaurants/my-restaurant
PUT    /api/restaurants/:id

Admin (future)
GET    /api/admin/restaurants?status=pending_approval
PUT    /api/admin/restaurants/:id/approve
PUT    /api/admin/restaurants/:id/reject
```

## File Locations

```
apps/restaurant-app/src/
├── pages/
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   └── Onboarding/
│       └── RestaurantSetup.tsx
├── components/layout/
│   ├── ProtectedRoute.tsx
│   ├── AppLayout.tsx
│   └── Sidebar.tsx
├── contexts/
│   ├── auth-context.tsx
│   └── restaurant-context.tsx
├── services/
│   ├── auth-api.ts
│   └── restaurant-api.ts
└── types/
    └── models.ts
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Protection Against
- SQL injection (parameterized queries)
- XSS (input sanitization)
- CSRF (token validation)
- Brute force (rate limiting)
- Session hijacking (HTTP-only cookies for future)

### Email Verification
- Verification email sent on registration
- Link expires after 24 hours
- Account activated on verification
- Resend verification option

## User Stories Covered

1. ✅ As a restaurant owner, I can register an account
2. ✅ As a restaurant owner, I can verify my email
3. ✅ As a restaurant owner, I can login securely
4. ✅ As a restaurant owner, I can complete onboarding in steps
5. ✅ As a restaurant owner, I can upload restaurant logo and images
6. ✅ As a restaurant owner, I can set operating hours
7. ✅ As a restaurant owner, I can save and continue later
8. ✅ As a restaurant owner, I'm redirected to onboarding if incomplete
9. ✅ As a restaurant owner, I can access dashboard after approval
10. ✅ As a restaurant owner, I can logout securely

## Validation Rules

### Registration
- Email: Valid email format, unique in system
- Phone: 10 digits, US format
- Password: Meets complexity requirements
- Name: 2-50 characters

### Restaurant Setup
- Name: 2-100 characters, required
- Description: 10-500 characters, required
- Cuisine: At least 1 selected, max 5
- Logo: Image format (PNG, JPG), max 5MB
- Images: Max 10 images, each max 5MB
- Address: All fields required
- Phone: 10 digits, required
- Delivery fee: $0-50
- Minimum order: $5-100

## Related Requirements

- [RESTAURANT-REQ-002: Menu Management](./RESTAURANT-REQ-002-menu-management.md)
- [RESTAURANT-REQ-003: Order Management](./RESTAURANT-REQ-003-order-management.md)
- [RESTAURANT-REQ-004: Dashboard & Analytics](./RESTAURANT-REQ-004-dashboard-analytics.md)

# Authentication & Authorization Requirements - Gateway API

**Component:** `apps/gateway-api`
**Category:** Core Security
**Status:** Implemented
**Priority:** Critical

---

## Overview

The Gateway API implements comprehensive authentication and authorization using JWT tokens, role-based access control (RBAC), email verification, and password reset workflows.

---

## Functional Requirements

### FR-AUTH-001: User Registration
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:38-41`, `src/modules/auth/auth.service.ts`

**Description:** Users can register with email, password, name, and phone number.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/register`
- Rate limit: 10 requests per 60 seconds
- Password hashing with bcrypt (10 rounds)
- Automatic email verification token generation
- Email verification sent via EmailService

**Request Schema:**
```typescript
{
  email: string (email format, required)
  password: string (min 4 chars, required)
  name: string (min 2 chars, required)
  phoneNumber: string (min 7 chars, required)
  role?: 'customer' | 'restaurant_owner' (default: 'customer')
}
```

**Response:**
```typescript
{
  user: {
    id: string
    email: string
    name: string
    phoneNumber: string
    role: string
    isEmailVerified: boolean
    isActive: boolean
  }
  accessToken: string
  refreshToken: string
}
```

**Database Entity:** `User` entity with roles `['customer', 'restaurant_owner', 'admin']`

**Test Coverage:** E2E tests in `src/modules/auth/__tests__/auth.controller.e2e.spec.ts`

---

### FR-AUTH-002: User Login
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:45-49`

**Description:** Users authenticate with email and password to receive JWT tokens.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/login`
- Rate limit: 5 requests per 60 seconds
- Validates credentials against hashed password
- Generates access token (1 hour expiry) and refresh token (7 days expiry)
- Stores refresh token in Redis with expiry

**Request Schema:**
```typescript
{
  email: string (email format, required)
  password: string (required)
}
```

**Response:** Same as registration

**Security Features:**
- Bcrypt password comparison
- JWT signed with HS256
- Tokens stored in Redis for invalidation capability

---

### FR-AUTH-003: JWT Token Validation
**Status:** ✅ Implemented
**Location:** `src/modules/auth/strategies/jwt.strategy.ts`, `src/modules/auth/guards/jwt-auth.guard.ts`

**Description:** All protected endpoints validate JWT access tokens.

**Implementation Details:**
- JWT Strategy extracts and validates tokens
- Guards applied at controller level
- Token payload includes: `userId`, `email`, `role`
- Checks token blacklist in Redis
- Validates token expiry and signature

**Protected Endpoints:** All endpoints except those marked with `@Public()` decorator

---

### FR-AUTH-004: Token Refresh
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:62-64`

**Description:** Users can refresh expired access tokens using refresh tokens.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/refresh`
- Validates refresh token from Redis
- Issues new access token and refresh token
- Invalidates old refresh token

**Request Schema:**
```typescript
{
  refreshToken: string (required)
}
```

---

### FR-AUTH-005: Logout
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:52-57`

**Description:** Users can logout, invalidating their access token.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/logout`
- Requires valid JWT token
- Adds access token to Redis blacklist
- Removes refresh token from Redis

---

### FR-AUTH-006: Forgot Password
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:68-72`

**Description:** Users can request password reset via email.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/forgot-password`
- Rate limit: 3 requests per 5 minutes
- Generates secure reset token
- Stores token in memory/Redis with 15-minute expiry
- Sends reset email with token

**Request Schema:**
```typescript
{
  email: string (email format, required)
}
```

---

### FR-AUTH-007: Reset Password
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:76-80`

**Description:** Users can reset password using reset token from email.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/reset-password`
- Rate limit: 3 requests per 5 minutes
- Validates reset token
- Hashes new password with bcrypt
- Invalidates reset token after use

**Request Schema:**
```typescript
{
  token: string (required)
  newPassword: string (min 4 chars, required)
}
```

---

### FR-AUTH-008: Email Verification
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:84-88`

**Description:** Users verify their email using token sent during registration.

**Implementation Details:**
- Endpoint: `POST /api/v1/auth/verify-email`
- Rate limit: 10 requests per 60 seconds
- Validates verification token
- Updates `isEmailVerified` flag
- Token expires after single use

**Request Schema:**
```typescript
{
  token: string (required)
}
```

---

### FR-AUTH-009: Get Current User
**Status:** ✅ Implemented
**Location:** `src/modules/auth/auth.controller.ts:92-94`

**Description:** Authenticated users can retrieve their profile information.

**Implementation Details:**
- Endpoint: `GET /api/v1/auth/me`
- Requires JWT authentication
- Returns user profile without sensitive data

**Response:**
```typescript
{
  id: string
  email: string
  name: string
  phoneNumber: string
  role: string
  isEmailVerified: boolean
  isActive: boolean
  preferences: object
  createdAt: Date
  updatedAt: Date
}
```

---

### FR-AUTH-010: Role-Based Access Control (RBAC)
**Status:** ✅ Implemented
**Location:** `src/modules/auth/guards/roles.guard.ts`, `src/modules/auth/decorators/roles.decorator.ts`

**Description:** Endpoints protected by role-specific guards.

**Implementation Details:**
- Roles: `customer`, `restaurant_owner`, `admin`
- `@Roles()` decorator specifies required roles
- `RolesGuard` validates user role from JWT payload
- Used in restaurant, order, and admin endpoints

**Example Usage:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('restaurant_owner', 'admin')
@Post()
create(@Body() dto: CreateRestaurantDto) {
  // Only restaurant owners and admins can access
}
```

---

## Non-Functional Requirements

### NFR-AUTH-001: Security Standards
**Status:** ✅ Implemented

- **Helmet.js:** Secure HTTP headers (CSP, HSTS, X-Frame-Options)
- **CORS:** Whitelisted origins only
- **Rate Limiting:** Throttle guard on sensitive endpoints
- **Password Hashing:** Bcrypt with 10 salt rounds
- **JWT Signing:** HS256 algorithm with secret key

**Location:** `src/main.ts:11-37`

---

### NFR-AUTH-002: Token Security
**Status:** ✅ Implemented

- **Access Token:** 1-hour expiry
- **Refresh Token:** 7-day expiry
- **Token Blacklisting:** Redis-based invalidation
- **Secret Key:** Environment variable (`JWT_SECRET`)

---

### NFR-AUTH-003: Rate Limiting
**Status:** ✅ Implemented

**Endpoint-Specific Limits:**
- Registration: 10/min
- Login: 5/min
- Forgot Password: 3/5min
- Reset Password: 3/5min
- Email Verification: 10/min
- Global: 100 requests per 60 seconds

**Implementation:** `@nestjs/throttler` with custom guard

---

## Database Schema

### Users Table
**Entity:** `src/entities/user.entity.ts`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  is_email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_suspended BOOLEAN DEFAULT false,
  preferences JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Role | Rate Limit | Description |
|----------|--------|------|------|------------|-------------|
| `/auth/register` | POST | Public | - | 10/min | User registration |
| `/auth/login` | POST | Public | - | 5/min | User login |
| `/auth/logout` | POST | JWT | Any | - | Logout user |
| `/auth/refresh` | POST | Public | - | - | Refresh access token |
| `/auth/forgot-password` | POST | Public | - | 3/5min | Request password reset |
| `/auth/reset-password` | POST | Public | - | 3/5min | Reset password |
| `/auth/verify-email` | POST | Public | - | 10/min | Verify email address |
| `/auth/me` | GET | JWT | Any | - | Get current user |

---

## Dependencies

**External Services:**
- Redis: Token storage, blacklist, session management
- EmailService: Password reset, email verification emails

**Libraries:**
- `@nestjs/jwt`: JWT generation and validation
- `@nestjs/passport`: Authentication middleware
- `bcrypt`: Password hashing
- `@nestjs/throttler`: Rate limiting
- `helmet`: Security headers

---

## Test Coverage

**Test Files:**
- E2E Tests: `src/modules/auth/__tests__/auth.controller.e2e.spec.ts`
- Factory: `src/test/factories/user.factory.ts`
- Auth Helper: `src/test/utils/auth-helper.ts`

**Test Scenarios:**
- ✅ User registration with valid data
- ✅ Duplicate email registration (409 Conflict)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials (401 Unauthorized)
- ✅ Access protected endpoint with valid JWT
- ✅ Access protected endpoint without JWT (401)
- ✅ Access endpoint with invalid role (403 Forbidden)
- ✅ Token refresh flow
- ✅ Logout invalidates token
- ✅ Password reset flow
- ✅ Email verification flow

---

## Configuration

**Environment Variables:**
```bash
JWT_SECRET=<secret-key>
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=7d
REDIS_HOST=localhost
REDIS_PORT=6379
EMAIL_SERVICE_URL=<smtp-config>
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Future Enhancements

- [ ] Multi-factor authentication (MFA)
- [ ] OAuth2 social login (Google, Facebook)
- [ ] Biometric authentication for mobile
- [ ] Session management dashboard
- [ ] Audit logging for auth events
- [ ] Password complexity policies
- [ ] Account lockout after failed attempts

---

**Last Updated:** 2026-02-20
**Documented By:** Reverse Engineering Process
**Related Documents:**
- `002_restaurant_management.md`
- `003_order_management.md`
- Database Schema: `.claude/project-management/architecture/data/database-schema.md`

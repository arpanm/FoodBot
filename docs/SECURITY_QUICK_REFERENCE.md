# Security Quick Reference Guide

## Common Security Tasks

### 1. Protect a Route

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  RateLimitGuard,
  Roles,
  RateLimit,
  RateLimitPresets,
  UserRole,
  CurrentUser,
  JwtPayload,
} from '@foodbot/security';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class OrdersController {
  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @RateLimit(RateLimitPresets.STANDARD)
  async getOrders(@CurrentUser() user: JwtPayload) {
    return { userId: user.sub };
  }
}
```

### 2. Make a Route Public

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '@foodbot/security';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}
```

### 3. Hash a Password

```typescript
import { PasswordService } from '@foodbot/security';

const passwordService = new PasswordService();

// Hash
const hash = await passwordService.hashPassword('MyP@ssw0rd123');

// Verify
const isValid = await passwordService.verifyPassword('MyP@ssw0rd123', hash);
```

### 4. Encrypt Sensitive Data

```typescript
import { EncryptionService } from '@foodbot/security';

const encryptionService = new EncryptionService();

// Encrypt
const encrypted = encryptionService.encrypt('4532-0151-1283-0366');

// Store all three values
await db.save({
  encryptedText: encrypted.encryptedText,
  iv: encrypted.iv,
  authTag: encrypted.authTag,
});

// Decrypt
const data = await db.get();
const decrypted = encryptionService.decrypt({
  encryptedText: data.encryptedText,
  iv: data.iv,
  authTag: data.authTag,
});
```

### 5. Sanitize User Input

```typescript
import { SanitizerService } from '@foodbot/security';

const sanitizer = new SanitizerService();

// Remove HTML/XSS
const clean = sanitizer.sanitizeHtml(userInput);

// Sanitize URL
const safeUrl = sanitizer.sanitizeUrl(userUrl);

// Sanitize email
const cleanEmail = sanitizer.sanitizeEmail(userEmail);

// Strip all HTML
const text = sanitizer.stripHtml(htmlContent);
```

### 6. Validate User Input

```typescript
import { ValidatorService } from '@foodbot/security';

const validator = new ValidatorService();

// Validate email
if (!validator.isValidEmail(email)) {
  throw new Error('Invalid email');
}

// Validate with rules
const result = validator.validateInput(userInput, {
  minLength: 3,
  maxLength: 50,
  allowSql: false,
  allowHtml: false,
});

if (!result.isValid) {
  throw new Error(result.errors.join(', '));
}
```

### 7. Check Permissions

```typescript
import { RbacService, UserRole, Permission } from '@foodbot/security';

const rbacService = new RbacService();

// Check if role has permission
const canManage = rbacService.roleHasPermission(
  UserRole.RESTAURANT_OWNER,
  Permission.RESTAURANT_MANAGE
);

// Check resource access
const canAccess = rbacService.canAccessResource(
  user.roles,
  'order',
  'write'
);

if (!canAccess) {
  throw new ForbiddenException('Access denied');
}
```

### 8. Generate JWT Tokens

```typescript
import { JwtAuthService } from '@foodbot/security';

const jwtService = new JwtAuthService(nestJwtService);

// Generate tokens
const tokens = await jwtService.generateTokens({
  sub: user.id,
  email: user.email,
  roles: user.roles,
  permissions: user.permissions,
});

// Verify token
const payload = await jwtService.verifyAccessToken(tokens.accessToken);

// Refresh token
const newTokens = await jwtService.refreshAccessToken(
  tokens.refreshToken,
  { sub: user.id, email: user.email, roles: user.roles, permissions: user.permissions }
);
```

### 9. Rate Limiting

```typescript
import { RateLimiterService, RateLimitConfig } from '@foodbot/security';

const rateLimiter = new RateLimiterService();

// Custom rate limit
const config: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
};

const result = await rateLimiter.checkLimit(`user:${userId}`, config);

if (!result.allowed) {
  throw new HttpException('Too many requests', 429);
}

// Using presets via decorator
@RateLimit(RateLimitPresets.STRICT) // 5 req/min
@RateLimit(RateLimitPresets.STANDARD) // 100 req/min
@RateLimit(RateLimitPresets.RELAXED) // 1000 req/min
```

### 10. Account Lockout

```typescript
import { AccountLockoutService } from '@foodbot/security';

const lockoutService = new AccountLockoutService();

// Record failed attempt
const shouldLock = lockoutService.recordFailedAttempt(userId);

if (shouldLock) {
  throw new Error('Account locked');
}

// Check if locked
if (lockoutService.isAccountLocked(userId)) {
  const remaining = lockoutService.getRemainingLockoutTime(userId);
  throw new Error(`Locked for ${remaining} minutes`);
}

// Reset on successful login
lockoutService.resetFailedAttempts(userId);
```

## Common Patterns

### Secure Login Flow

```typescript
async login(email: string, password: string) {
  // 1. Check account lockout
  if (this.accountLockoutService.isAccountLocked(email)) {
    throw new UnauthorizedException('Account locked');
  }

  // 2. Get user
  const user = await this.findUserByEmail(email);
  if (!user) {
    this.accountLockoutService.recordFailedAttempt(email);
    throw new UnauthorizedException('Invalid credentials');
  }

  // 3. Verify password
  const isValid = await this.passwordService.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    this.accountLockoutService.recordFailedAttempt(email);
    throw new UnauthorizedException('Invalid credentials');
  }

  // 4. Reset lockout
  this.accountLockoutService.resetFailedAttempts(email);

  // 5. Generate tokens
  return this.jwtService.generateTokens({
    sub: user.id,
    email: user.email,
    roles: user.roles,
    permissions: this.getPermissions(user.roles),
  });
}
```

### Secure Registration Flow

```typescript
async register(email: string, password: string) {
  // 1. Sanitize email
  const cleanEmail = this.sanitizer.sanitizeEmail(email);

  // 2. Validate email
  if (!this.validator.isValidEmail(cleanEmail)) {
    throw new BadRequestException('Invalid email');
  }

  // 3. Validate password
  const validation = this.passwordService.validatePassword(password);
  if (!validation.isValid) {
    throw new BadRequestException(validation.errors.join(', '));
  }

  // 4. Hash password
  const hash = await this.passwordService.hashPassword(password);

  // 5. Create user
  const user = await this.createUser({
    email: cleanEmail,
    passwordHash: hash,
  });

  // 6. Generate tokens
  return this.jwtService.generateTokens({
    sub: user.id,
    email: user.email,
    roles: user.roles,
    permissions: this.getPermissions(user.roles),
  });
}
```

### Secure Data Storage

```typescript
async saveUserData(userId: string, data: UserData) {
  // 1. Sanitize inputs
  const cleanName = this.sanitizer.stripHtml(data.name);
  const cleanPhone = this.sanitizer.sanitizePhoneNumber(data.phone);

  // 2. Validate
  if (!this.validator.isValidPhone(cleanPhone)) {
    throw new BadRequestException('Invalid phone number');
  }

  // 3. Encrypt sensitive data
  const encryptedPhone = this.encryptionService.encrypt(cleanPhone);
  const encryptedAddress = this.encryptionService.encrypt(data.address);

  // 4. Save
  await this.db.users.update(userId, {
    name: cleanName,
    phone: JSON.stringify(encryptedPhone),
    address: JSON.stringify(encryptedAddress),
  });
}
```

## Security Checklist

### Before Committing Code

- [ ] No secrets in code
- [ ] All user inputs sanitized
- [ ] All routes protected (unless explicitly public)
- [ ] Sensitive data encrypted
- [ ] Passwords hashed with bcrypt
- [ ] Rate limiting applied
- [ ] Input validation added
- [ ] Tests written
- [ ] Security headers configured

### Before Deploying

- [ ] Environment variables configured
- [ ] JWT secrets generated and secured
- [ ] Encryption key generated and secured
- [ ] Redis configured for rate limiting
- [ ] CORS origins configured
- [ ] HTTPS enabled
- [ ] Database connections encrypted
- [ ] Security monitoring enabled
- [ ] Logs properly configured

## Quick Troubleshooting

### "JWT secrets are not configured"
```bash
# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
```

### "ENCRYPTION_KEY not found"
```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=<generated>
```

### Rate limiting not working across instances
```bash
# Configure Redis
REDIS_URL=redis://localhost:6379
```

### CORS errors
```bash
# Add frontend URL to .env
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Security Constants

```typescript
// Password requirements
MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 128
BCRYPT_SALT_ROUNDS = 12

// JWT
ACCESS_TOKEN_EXPIRY = '15m'
REFRESH_TOKEN_EXPIRY = '7d'

// Account lockout
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = 30 minutes

// Rate limiting
STRICT = 5 req/min
STANDARD = 100 req/min
RELAXED = 1000 req/min

// Encryption
ALGORITHM = 'aes-256-gcm'
KEY_LENGTH = 32 bytes
IV_LENGTH = 16 bytes
```

## Available Roles

```typescript
UserRole.ADMIN              // Full access
UserRole.RESTAURANT_OWNER   // Manage restaurants
UserRole.CUSTOMER           // Place orders
UserRole.DELIVERY_PARTNER   // Deliver orders
UserRole.SUPPORT            // Customer support
```

## Available Permissions

```typescript
// User permissions
Permission.USER_READ
Permission.USER_WRITE
Permission.USER_DELETE

// Restaurant permissions
Permission.RESTAURANT_READ
Permission.RESTAURANT_WRITE
Permission.RESTAURANT_DELETE
Permission.RESTAURANT_MANAGE

// Order permissions
Permission.ORDER_READ
Permission.ORDER_WRITE
Permission.ORDER_DELETE
Permission.ORDER_MANAGE

// Menu permissions
Permission.MENU_READ
Permission.MENU_WRITE
Permission.MENU_DELETE

// Admin permissions
Permission.ADMIN_ACCESS
Permission.SYSTEM_CONFIG
```

## Need Help?

- **Documentation**: `/packages/security/README.md`
- **Integration Guide**: `/packages/security/INTEGRATION.md`
- **OWASP Compliance**: `/docs/OWASP_COMPLIANCE_CHECKLIST.md`
- **Support**: security@foodbot.com

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2026-02-19

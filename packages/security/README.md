# @foodbot/security

Production-grade security hardening and OWASP compliance package for FoodBot.

## Features

### 1. Authentication & Authorization
- **JWT Authentication**: Access and refresh tokens with configurable expiry
- **Password Hashing**: bcrypt with 12 salt rounds (OWASP recommended)
- **Account Lockout**: Protects against brute force attacks
- **RBAC**: Role-based access control with fine-grained permissions

### 2. Encryption
- **AES-256-GCM**: Encryption for sensitive data at rest
- **Secure Key Management**: Environment-based with vault support
- **Password Policies**: Enforces strong password requirements

### 3. Rate Limiting
- **Redis-backed**: Distributed rate limiting for scalable systems
- **Flexible Configuration**: Per-endpoint, per-user, per-IP
- **Multiple Presets**: Strict, Standard, Relaxed, Per-Hour, Per-Day

### 4. Input Validation & Sanitization
- **XSS Protection**: HTML sanitization and escaping
- **SQL Injection Prevention**: Input validation and sanitization
- **Path Traversal Protection**: File path sanitization
- **MongoDB Injection Prevention**: Operator sanitization

### 5. Security Headers
- **Helmet.js Integration**: Secure HTTP headers
- **CORS Configuration**: Strict origin whitelisting
- **CSP**: Content Security Policy enforcement

### 6. OWASP Top 10 Compliance

| OWASP Category | Implementation |
|----------------|----------------|
| A01: Broken Access Control | JWT Guards, RBAC, Permission System |
| A02: Cryptographic Failures | AES-256-GCM, bcrypt, Secrets Management |
| A03: Injection | Input Validation, Sanitization, Parameterized Queries |
| A04: Insecure Design | Security by Design, Comprehensive Validation |
| A05: Security Misconfiguration | Secure Defaults, Configuration Validation |
| A06: Vulnerable Components | Automated Dependency Scanning |
| A07: Authentication Failures | Account Lockout, JWT, Strong Passwords |
| A08: Software/Data Integrity | Input Validation, HMAC, Auth Tags |
| A09: Logging/Monitoring | Security Audit Logs, Event Tracking |
| A10: SSRF | URL Validation, Whitelist-based Access |

## Installation

```bash
npm install @foodbot/security
```

## Quick Start

### 1. Import the SecurityModule

```typescript
import { Module } from '@nestjs/common';
import { SecurityModule } from '@foodbot/security';

@Module({
  imports: [SecurityModule],
})
export class AppModule {}
```

### 2. Configure Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-secret-key-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=foodbot
JWT_AUDIENCE=foodbot-api

# Encryption
ENCRYPTION_KEY=64-character-hex-key-generated-using-service

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 3. Protect Your Endpoints

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  RateLimitGuard,
  Roles,
  Permissions,
  CurrentUser,
  RateLimit,
  RateLimitPresets,
  UserRole,
  Permission,
  JwtPayload,
} from '@foodbot/security';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class OrdersController {
  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @RateLimit(RateLimitPresets.STANDARD)
  async getOrders(@CurrentUser() user: JwtPayload) {
    return this.ordersService.getOrdersByUser(user.sub);
  }

  @Post()
  @Permissions(Permission.ORDER_WRITE)
  @RateLimit(RateLimitPresets.STRICT)
  async createOrder(@CurrentUser() user: JwtPayload) {
    return this.ordersService.createOrder(user.sub);
  }
}
```

### 4. Public Endpoints

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

## Usage Examples

### Password Service

```typescript
import { PasswordService } from '@foodbot/security';

const passwordService = new PasswordService();

// Hash password
const hash = await passwordService.hashPassword('MyP@ssw0rd123');

// Verify password
const isValid = await passwordService.verifyPassword('MyP@ssw0rd123', hash);

// Validate password against policy
const validation = passwordService.validatePassword('weak');
if (!validation.isValid) {
  console.error(validation.errors);
}

// Generate strong password
const strongPassword = passwordService.generatePassword(16);

// Check password strength
const strength = passwordService.calculatePasswordStrength('MyP@ssw0rd123');
```

### Encryption Service

```typescript
import { EncryptionService } from '@foodbot/security';

const encryptionService = new EncryptionService();

// Encrypt sensitive data
const encrypted = encryptionService.encrypt('4532-0151-1283-0366');
// Store: encrypted.encryptedText, encrypted.iv, encrypted.authTag

// Decrypt data
const decrypted = encryptionService.decrypt(encrypted);

// One-way hash
const hash = encryptionService.hash('api-key-123');

// Generate secure token
const token = encryptionService.generateSecureToken(32);

// Secure comparison (timing-safe)
const matches = encryptionService.secureCompare(token1, token2);
```

### Input Validation & Sanitization

```typescript
import { SanitizerService, ValidatorService } from '@foodbot/security';

const sanitizer = new SanitizerService();
const validator = new ValidatorService();

// Sanitize HTML
const clean = sanitizer.sanitizeHtml('<script>alert(1)</script>Hello');

// Sanitize URL
const safeUrl = sanitizer.sanitizeUrl(userInput);

// Validate email
if (!validator.isValidEmail(email)) {
  throw new Error('Invalid email');
}

// Validate input
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

### Rate Limiting

```typescript
import { RateLimiterService, RateLimitConfig } from '@foodbot/security';

const rateLimiter = new RateLimiterService();

const config: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
};

const result = await rateLimiter.checkLimit('user:123', config);

if (!result.allowed) {
  throw new Error('Too many requests');
}

console.log(`Remaining: ${result.remaining}`);
console.log(`Resets at: ${new Date(result.resetTime)}`);
```

### RBAC Service

```typescript
import { RbacService, UserRole, Permission } from '@foodbot/security';

const rbacService = new RbacService();

// Get permissions for role
const permissions = rbacService.getPermissionsForRole(UserRole.CUSTOMER);

// Check if role has permission
const canManage = rbacService.roleHasPermission(
  UserRole.RESTAURANT_OWNER,
  Permission.RESTAURANT_MANAGE
);

// Check resource access
const canAccess = rbacService.canAccessResource(
  [UserRole.CUSTOMER],
  'order',
  'read'
);
```

## Security Best Practices

### 1. Environment Variables
- Never commit secrets to version control
- Use `.env.example` for documentation
- Use secrets manager in production (AWS Secrets Manager, HashiCorp Vault)

### 2. Password Policies
- Minimum 12 characters
- Require uppercase, lowercase, numbers, special characters
- Prevent common passwords
- Implement password history (prevent reuse)

### 3. JWT Tokens
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Rotate refresh tokens on use
- Store JWT secrets securely

### 4. Rate Limiting
- Strict limits on authentication endpoints (5 req/min)
- Standard limits on API endpoints (100 req/min)
- Relaxed limits on read-only endpoints (1000 req/min)
- Use Redis for distributed systems

### 5. Input Validation
- Validate all user input
- Sanitize before storage and display
- Use parameterized queries for database access
- Implement CSP headers

### 6. Encryption
- Use AES-256-GCM for data at rest
- Use TLS 1.3 for data in transit
- Rotate encryption keys regularly
- Never store keys in code

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## API Reference

See [API Documentation](./docs/api.md) for complete API reference.

## Security Audit

This package has been designed to comply with:
- OWASP Top 10 (2021)
- CWE Top 25 Most Dangerous Software Weaknesses
- NIST Cybersecurity Framework
- PCI DSS 3.2.1 (for payment processing)

## Contributing

1. Follow security best practices
2. Add tests for all security-critical code
3. Update documentation
4. Run security audit before committing

## License

UNLICENSED - Internal FoodBot Package

## Support

For security issues, please email: security@foodbot.com

Do not create public issues for security vulnerabilities.

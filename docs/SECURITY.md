# FoodBot Security Documentation

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Authentication Mechanisms](#1-authentication-mechanisms)
- [2. Authorization Patterns](#2-authorization-patterns)
- [3. Data Encryption](#3-data-encryption)
- [4. API Key Management](#4-api-key-management)
- [5. Secret Management](#5-secret-management)
- [6. Security Best Practices](#6-security-best-practices)
- [7. Vulnerability Reporting](#7-vulnerability-reporting)

---

## 1. Authentication Mechanisms

### JWT Authentication

FoodBot uses JSON Web Tokens (JWT) for stateless authentication:

| Token | Expiry | Purpose |
|-------|--------|---------|
| Access Token | 15 minutes | API request authentication |
| Refresh Token | 7 days | Obtain new access tokens |

**Implementation:**
- **Library:** `@nestjs/jwt` + `passport-jwt`
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Secret:** Environment variable `JWT_SECRET` (minimum 32 characters)
- **Payload:** `{ userId, email, role, iat, exp }`

### Token Blacklisting

On logout, the access token is added to a Redis blacklist set with a TTL matching the token's remaining expiry time. The `JwtAuthGuard` checks the blacklist on every request.

### Password Security

- **Hashing:** bcrypt with 10 rounds (configurable)
- **Minimum Length:** Enforced via DTO validation
- **Rate Limiting:** Login attempts limited to 5 per minute per IP
- **Forgot Password:** Rate limited to 3 per 5 minutes

---

## 2. Authorization Patterns

### Role-Based Access Control (RBAC)

Three roles with hierarchical permissions:

| Role | Permissions |
|------|------------|
| `customer` | Browse, order, cart, feedback, profile |
| `restaurant_owner` | All customer + restaurant/dish management, order status |
| `admin` | All permissions + user management, restaurant approval |

### Implementation

```typescript
// Guard-based authorization
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/users')
async listUsers() { ... }

// Public endpoint (no auth required)
@Public()
@Get('restaurants/search')
async searchRestaurants() { ... }
```

### Endpoint Security Matrix

| Endpoint | Auth | Roles |
|----------|------|-------|
| `POST /auth/register` | Public | -- |
| `POST /auth/login` | Public | -- |
| `GET /restaurants/search` | Public | -- |
| `GET /restaurants/:id/menu` | Public | -- |
| `POST /orders` | JWT | customer, restaurant_owner, admin |
| `PUT /orders/:id/status` | JWT | restaurant_owner, admin |
| `POST /restaurants` | JWT | restaurant_owner, admin |
| `GET /admin/users` | JWT | admin |
| `PUT /admin/restaurants/:id/approve` | JWT | admin |
| `POST /payments/webhook` | Public (signature verified) | -- |

---

## 3. Data Encryption

### Encryption at Rest

| Data Type | Encryption | Method |
|-----------|-----------|--------|
| Passwords | Yes | bcrypt hash (one-way) |
| JWT Secrets | Yes | Environment variable |
| API Keys | Yes | Environment variable |
| PII (email, phone) | Recommended | AES-256-GCM |
| Payment Data | Required | Not stored (delegated to payment gateway) |

### Encryption in Transit

- All external communication uses HTTPS (TLS 1.2+)
- Internal Docker network communication is plaintext (acceptable for development)
- Production Kubernetes uses network policies and mTLS (Istio/Linkerd)

---

## 4. API Key Management

### External API Keys

| Provider | Key Variable | Storage |
|----------|-------------|---------|
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | Environment variable |
| OpenAI | `OPENAI_API_KEY` | Environment variable |
| Gemini (Google) | `GEMINI_API_KEY` | Environment variable |
| Swiggy MCP | `SWIGGY_API_KEY` | Environment variable |
| Zomato MCP | `ZOMATO_API_KEY` | Environment variable |

### Key Rotation

- API keys should be rotated every 90 days
- JWT secrets should be rotated every 180 days
- Rotation process:
  1. Generate new key
  2. Deploy new key alongside old key (grace period)
  3. Remove old key after grace period

### Key Security Rules

- API keys are NEVER logged
- API keys are NEVER included in error responses
- API keys are NEVER committed to version control
- `.env` files are in `.gitignore`
- `.env.example` contains placeholder values only

---

## 5. Secret Management

### Development

Secrets are stored in `.env` files (not committed to git):

```bash
# .env (local, not committed)
JWT_SECRET=<generated-secret>
ANTHROPIC_API_KEY=<your-key>

# .env.example (committed, placeholder values)
JWT_SECRET=
ANTHROPIC_API_KEY=
```

### Production

For production deployments:

- **Kubernetes Secrets:** Mounted as environment variables
- **AWS Secrets Manager:** Recommended for AWS deployments
- **HashiCorp Vault:** Recommended for on-premise deployments
- **GitHub Secrets:** Used for CI/CD pipeline variables

---

## 6. Security Best Practices

### HTTP Security Headers (Helmet)

The Gateway API uses Helmet to set security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |
| `Content-Security-Policy` | Configured | Prevent XSS |

### CORS Configuration

```typescript
// Only allow specific origins
ALLOWED_ORIGINS=http://localhost:3001,https://app.foodbot.com
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/register` | 10 | 60s |
| `POST /auth/login` | 5 | 60s |
| `POST /auth/forgot-password` | 3 | 300s |
| `POST /auth/reset-password` | 3 | 300s |
| All other endpoints | 100 | 900s |

### Input Validation

- All request bodies validated with class-validator DTOs
- Zod schemas validate Kafka event payloads
- Spring Boot `@Valid` annotation validates MCP requests
- SQL injection prevented by TypeORM parameterized queries

### Audit Logging

The audit service (`apps/backend/src/audit/`) logs:
- User authentication events (login, logout, failed attempts)
- Data modification events (create, update, delete)
- Admin actions (user suspension, restaurant approval)
- Payment events (charge, refund)

### Webhook Signature Verification

Payment webhook callbacks are verified using HMAC signatures:

```typescript
// apps/backend/src/common/utils/webhook-signature.util.ts
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### OWASP Top 10 Compliance

| OWASP Risk | Status | Implementation |
|------------|--------|----------------|
| A01: Broken Access Control | Addressed | RBAC guards, JWT validation |
| A02: Cryptographic Failures | Addressed | bcrypt, TLS, AES-256 |
| A03: Injection | Addressed | TypeORM parameterized queries, input validation |
| A04: Insecure Design | Addressed | Security-first architecture |
| A05: Security Misconfiguration | Addressed | Helmet, CORS whitelist, secure defaults |
| A06: Vulnerable Components | Monitored | `pnpm audit`, Snyk scanning |
| A07: Auth Failures | Addressed | Rate limiting, token blacklisting |
| A08: Software Integrity | Addressed | Locked dependencies, CI verification |
| A09: Logging Failures | Addressed | Structured logging, audit trail |
| A10: SSRF | Addressed | URL validation, network policies |

---

## 7. Vulnerability Reporting

### Automated Scanning

```bash
# Node.js dependency audit
pnpm audit

# Security scanning with Snyk
pnpm security:scan

# Maven dependency check (MCP Orchestrator)
cd services/mcp-orchestrator
mvn dependency-check:check
```

### Reporting a Vulnerability

If you discover a security vulnerability:

1. Do NOT open a public GitHub issue
2. Email security@foodbot.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. You will receive a response within 48 hours
4. The issue will be patched within 7 days for critical vulnerabilities

### Security Update Policy

- Critical vulnerabilities: Patch within 24 hours
- High vulnerabilities: Patch within 7 days
- Medium vulnerabilities: Patch within 30 days
- Low vulnerabilities: Patch in next release cycle

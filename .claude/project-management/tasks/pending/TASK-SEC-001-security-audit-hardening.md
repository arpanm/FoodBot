# TASK-SEC-001: Security Audit & Hardening

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 14 days
**Component:** All Services / Security Package
**Depends On:** TASK-TD-001 (technical debt fixes first)
**Blocks:** Production launch, compliance
**Related Requirements:** OWASP Top 10, development-guardrails.md Section 3

---

## Overview

Conduct a comprehensive security audit and hardening of the entire FoodBot platform covering OWASP Top 10 compliance, authentication/authorization review, data encryption audit, API security, dependency vulnerability remediation, penetration testing, security monitoring, incident response planning, and GDPR/data privacy compliance.

---

## Requirements

### Functional Requirements

1. **OWASP Top 10 Compliance Audit**
   - A01: Broken Access Control
     - Review all API endpoints for proper authorization
     - Test for IDOR (Insecure Direct Object Reference)
     - Verify RBAC enforcement (customer, restaurant_owner, admin)
     - Test privilege escalation scenarios
     - Review file upload permissions
   - A02: Cryptographic Failures
     - Verify all PII encrypted at rest (AES-256-GCM)
     - Verify TLS 1.3 for all data in transit
     - Review key management practices
     - Check for weak algorithms (MD5, SHA1)
     - Verify password hashing (bcrypt, cost factor >= 12)
   - A03: Injection
     - SQL injection testing (all query paths)
     - NoSQL injection testing (Neo4j, Elasticsearch)
     - Command injection testing
     - LDAP injection testing
     - Verify parameterized queries everywhere
   - A04: Insecure Design
     - Review authentication flows for design flaws
     - Review business logic for abuse potential
     - Rate limiting for all sensitive operations
     - Account lockout after failed attempts
   - A05: Security Misconfiguration
     - Review all default configurations
     - Remove debug endpoints in production
     - Verify CORS configuration
     - Review HTTP security headers
     - Check for information leakage in error responses
   - A06: Vulnerable Components
     - Full dependency vulnerability scan
     - Remove/update all vulnerable dependencies
     - Pin dependency versions
     - Review transitive dependencies
   - A07: Authentication Failures
     - Review JWT implementation (expiry, signing, validation)
     - Session management review
     - Password policy enforcement
     - MFA readiness (future implementation)
     - Brute force protection
   - A08: Software and Data Integrity
     - Verify CI/CD pipeline integrity
     - Code signing verification
     - Dependency integrity checks (SRI)
     - Docker image signing
   - A09: Security Logging & Monitoring
     - Verify all security events are logged
     - Log tampering prevention
     - Real-time alerting for security events
     - Audit trail for all admin actions
   - A10: Server-Side Request Forgery
     - Review all external URL calls
     - Allowlist for outbound connections
     - DNS rebinding protection

2. **API Security Hardening**
   - Rate limiting per endpoint per user (configurable)
   - Request size limits per endpoint
   - API key rotation mechanism
   - JWT token rotation on refresh
   - CORS strict origin validation
   - Content Security Policy headers
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Strict-Transport-Security
   - API versioning security (no access to deprecated versions)
   - Request signing for service-to-service calls

3. **Data Privacy & GDPR**
   - Data inventory (what PII is collected, where stored)
   - Data minimization review (don't collect what's not needed)
   - User data export (right to portability)
   - User data deletion (right to erasure)
   - Consent management
   - Cookie policy compliance
   - Privacy policy alignment with code
   - Data retention policies
   - Cross-border data transfer assessment
   - Data breach notification process

4. **Penetration Testing**
   - Automated DAST (Dynamic Application Security Testing) with OWASP ZAP
   - API fuzzing (all endpoints)
   - Authentication bypass testing
   - Session hijacking testing
   - CSRF testing
   - File upload vulnerability testing
   - WebSocket security testing
   - Chrome extension security review
   - Mobile app security (Capacitor)

5. **Security Monitoring & Incident Response**
   - Security event logging (failed auth, privilege escalation, unusual patterns)
   - Real-time security alerting (Prometheus + AlertManager)
   - Intrusion detection rules
   - Automated IP blocking for repeated attacks
   - Incident response runbook
   - Security dashboard (failed logins, blocked IPs, vulnerability counts)
   - Regular security report generation

6. **Infrastructure Security**
   - Kubernetes RBAC review
   - Network policy enforcement (zero-trust)
   - Secret management audit (no secrets in env vars, use vault)
   - Container security (non-root, read-only FS, minimal images)
   - Database access control (principle of least privilege)
   - Redis authentication
   - Kafka authentication and encryption
   - Elasticsearch security (authentication, TLS)

### Architecture

```
Security Architecture:

Application Layer:
├── Authentication (JWT + Biometric)
│   ├── Token Issuer (short-lived access + refresh)
│   ├── Token Validator (middleware)
│   └── Session Manager
├── Authorization (RBAC)
│   ├── Role Definitions (customer, owner, admin)
│   ├── Permission Guard (per endpoint)
│   └── Resource-Level Access Control
├── Input Security
│   ├── Validation (class-validator)
│   ├── Sanitization (DOMPurify)
│   ├── Rate Limiter
│   └── Size Limiter
├── Data Security
│   ├── Encryption at Rest (AES-256-GCM)
│   ├── Encryption in Transit (TLS 1.3)
│   ├── PII Masking in Logs
│   └── Secure Key Management
└── Monitoring
    ├── Security Event Logger
    ├── Anomaly Detector
    ├── Alert Manager
    └── Incident Response Automation

Security Scanning Pipeline:
Code Commit → SAST (SonarQube) → Dependency Scan (Snyk)
  → Build → Container Scan (Trivy) → Deploy to Staging
  → DAST (OWASP ZAP) → Penetration Test → Security Report

Infrastructure Security:
┌─────────────────────────────────────────────────┐
│ Kubernetes Cluster                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ Network Policies (Zero-Trust)               │ │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐  │ │
│ │ │ Gateway   │ │ Services  │ │ Databases │  │ │
│ │ │ (public)  │→│ (private) │→│ (isolated)│  │ │
│ │ └───────────┘ └───────────┘ └───────────┘  │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Secret Management (HashiCorp Vault)         │ │
│ │ - API keys, DB credentials, encryption keys │ │
│ │ - Auto-rotation, audit logging              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Acceptance Criteria
- [ ] OWASP Top 10 audit completed (all 10 categories)
- [ ] Zero critical/high vulnerabilities in SAST/DAST
- [ ] All PII encrypted at rest (AES-256-GCM verified)
- [ ] TLS 1.3 enforced for all connections
- [ ] All API endpoints have rate limiting
- [ ] All HTTP security headers configured
- [ ] CORS strict mode with origin allowlist
- [ ] JWT implementation reviewed and hardened
- [ ] Password policy enforced (min 12 chars, complexity)
- [ ] GDPR compliance: export, delete, consent management
- [ ] Penetration test passed (OWASP ZAP clean scan)
- [ ] Security monitoring dashboard operational
- [ ] Incident response runbook documented
- [ ] All Kubernetes RBAC policies reviewed
- [ ] All secrets in vault (not env vars)
- [ ] Zero npm audit vulnerabilities
- [ ] PII masking in all logs verified
- [ ] Security report generated and reviewed
- [ ] 85%+ test coverage on security modules
- [ ] All findings documented with remediation status

### Files to Create/Modify
**Security Package (extend):**
- `packages/security/src/owasp/access-control-audit.ts`
- `packages/security/src/owasp/injection-prevention.ts`
- `packages/security/src/owasp/crypto-audit.ts`
- `packages/security/src/headers/security-headers.middleware.ts`
- `packages/security/src/gdpr/data-export.service.ts`
- `packages/security/src/gdpr/data-deletion.service.ts`
- `packages/security/src/gdpr/consent-manager.ts`
- `packages/security/src/monitoring/security-event-logger.ts`
- `packages/security/src/monitoring/anomaly-detector.ts`
- `packages/security/src/monitoring/incident-response.ts`

**Gateway API:**
- `apps/gateway-api/src/security/rate-limit.config.ts`
- `apps/gateway-api/src/security/cors.config.ts`
- `apps/gateway-api/src/security/helmet.config.ts`
- `apps/gateway-api/src/gdpr/gdpr.controller.ts`
- `apps/gateway-api/src/gdpr/gdpr.service.ts`

**Testing:**
- `packages/security/src/__tests__/owasp/*.spec.ts`
- `packages/security/src/__tests__/gdpr/*.spec.ts`
- `packages/security/src/__tests__/penetration/*.spec.ts`
- `scripts/security-scan.sh` (automated OWASP ZAP)
- `scripts/dependency-audit.sh`

**Documentation:**
- `docs/security/owasp-audit-report.md`
- `docs/security/incident-response-runbook.md`
- `docs/security/data-privacy-inventory.md`
- `docs/security/penetration-test-report.md`

---

## SDLC Phases

### Phase 1: Planning & Threat Modeling (2 days)
- Create data flow diagrams for all services
- Identify all trust boundaries (external/internal, service-to-service)
- Enumerate all entry points (API endpoints, WebSocket, webhooks)
- Classify all data (public, PII, sensitive, critical)
- Create threat model using STRIDE methodology
- Prioritize threats by risk (likelihood x impact)
- Define security requirements per component
- Establish baseline security metrics

### Phase 2: OWASP Top 10 Audit (3 days)
- A01: Review all API endpoints for access control; test IDOR on all resource endpoints
- A02: Audit encryption at rest (AES-256-GCM) and in transit (TLS 1.3); scan for weak algorithms
- A03: Test all database query paths for injection (SQL, NoSQL, command)
- A04: Review authentication and business logic design for abuse vectors
- A05: Audit all configurations; remove debug endpoints; review CORS and headers
- A06: Full dependency scan with Snyk; update/remove all vulnerable packages
- A07: Review JWT implementation (signing algorithm, expiry, refresh flow, revocation)
- A08: Verify CI/CD pipeline integrity; add dependency integrity checks
- A09: Verify security event logging coverage; add missing security audit logs
- A10: Review all outbound HTTP calls; implement URL allowlisting
- Document all findings with severity, evidence, and remediation steps

### Phase 3: API Security Hardening (2 days)
- Implement rate limiting middleware (per endpoint, per user, configurable)
- Configure request size limits per endpoint type
- Add all HTTP security headers (Helmet.js configuration)
- Harden CORS configuration (strict origin allowlist, no wildcards)
- Implement JWT hardening (short expiry, rotation on refresh, secure signing)
- Add request signing for service-to-service communication (HMAC)
- Implement API key rotation mechanism
- Add brute force protection (account lockout after N failures)
- Configure Content Security Policy
- Remove information leakage from error responses (no stack traces in production)

### Phase 4: Data Privacy & GDPR (2 days)
- Create comprehensive data inventory (all PII fields, storage locations, retention)
- Implement user data export endpoint (JSON/CSV format, all user data)
- Implement user data deletion endpoint (cascade delete, anonymization for audit logs)
- Build consent management system (track consent per purpose, allow withdrawal)
- Implement PII masking in all log outputs (email, phone, address)
- Review and enforce data retention policies (auto-delete after retention period)
- Implement cookie consent banner and preference management
- Add data breach notification workflow (template, contact list, timeline)
- Document cross-border data transfer practices

### Phase 5: Penetration Testing (2 days)
- Set up OWASP ZAP for automated DAST scanning
- Run full DAST scan against staging environment
- Perform API fuzzing on all endpoints (invalid inputs, boundary values)
- Test authentication bypass scenarios (token manipulation, expired tokens)
- Test session hijacking (token theft, fixation)
- Test CSRF on all state-changing endpoints
- Test file upload vulnerabilities (if applicable)
- Test WebSocket security (authentication, injection, flooding)
- Review Chrome extension for security issues (CSP, XSS, data leakage)
- Document all findings with severity and reproduction steps

### Phase 6: Security Monitoring & Infrastructure (2 days)
- Implement security event logger (failed auth, privilege changes, data access)
- Set up real-time alerting for security events (Prometheus + AlertManager)
- Create intrusion detection rules (brute force, unusual patterns, API abuse)
- Implement automated IP blocking for repeated attack patterns
- Review Kubernetes RBAC policies (principle of least privilege)
- Implement network policies (zero-trust, service-to-service allowlisting)
- Audit secret management (migrate from env vars to HashiCorp Vault)
- Harden container security (non-root, read-only filesystem, minimal base images)
- Audit database access controls (per-service credentials, minimal permissions)
- Secure Redis, Kafka, and Elasticsearch connections (authentication + TLS)

### Phase 7: Documentation & Verification (1 day)
- Write incident response runbook (detection, containment, eradication, recovery)
- Generate comprehensive OWASP audit report
- Generate penetration test report with findings and remediation status
- Create data privacy inventory document
- Create security dashboard (failed logins, blocked IPs, vulnerability counts)
- Run final security scan to verify all remediations
- Conduct security review meeting with stakeholders
- Sign off on production security readiness

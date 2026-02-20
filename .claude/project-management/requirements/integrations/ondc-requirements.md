# ONDC Integration Requirements

**Version:** 1.0.0
**Created:** 2026-02-20
**Status:** Planned
**Priority:** High
**Target Start:** Week 18 (after MCP stabilization)
**Estimated Duration:** 8 weeks

---

## Overview

Requirements for integrating Open Network for Digital Commerce (ONDC) protocol to enable access to 50,000+ restaurants not available on Swiggy/Zomato.

**Strategic Value:** 9/10 (High)
**Implementation Complexity:** 7/10 (Manageable)
**First Year Cost:** ~$10,878 ($8,400 development + $2,478 infrastructure)

---

## Business Requirements

### BR-1: Market Coverage Expansion
**Priority:** High
**Description:** Increase restaurant coverage by 10-15% through ONDC network access

**Acceptance Criteria:**
- Access to 50,000+ ONDC merchants
- Support for restaurants not on Swiggy/Zomato
- Geographic coverage in Tier 2/3 cities

**Success Metrics:**
- ONDC orders reach 15% of total within 3 months
- 10% increase in unique restaurant listings
- User satisfaction > 4.5/5 for ONDC orders

---

### BR-2: Unified Search Experience
**Priority:** High
**Description:** Users should search across Swiggy, Zomato, and ONDC simultaneously

**Acceptance Criteria:**
- Single search query returns results from all providers
- Results sorted by relevance, not by provider
- Clear indication of fulfillment provider
- Consistent presentation across providers

**Success Metrics:**
- Search response time < 5s (p95)
- User clicks distributed across all providers
- No degradation in conversion rate

---

### BR-3: Lower Commission Structure
**Priority:** Medium
**Description:** Offer merchants lower commissions via ONDC (5-8% vs 20-25%)

**Acceptance Criteria:**
- Support ONDC's transparent pricing model
- Pass savings to customers or merchants
- Clear disclosure of commission rates

**Business Impact:**
- Attract merchants avoiding high-commission platforms
- Competitive advantage in merchant acquisition

---

## Functional Requirements

### FR-1: ONDC Gateway Registration
**Priority:** Critical
**Description:** Register as Buyer Application (BAP) with ONDC Gateway

**Requirements:**
1. Complete gateway registration at https://portal.ondc.org
2. Obtain subscriber ID and authorization credentials
3. Generate Ed25519 key pair for digital signatures
4. Configure callback endpoints (HTTPS required)
5. Pass ONDC compliance certification

**Dependencies:**
- Public HTTPS endpoints operational
- SSL certificates configured
- Organization KYC documentation

**Timeline:** Week 18-19 (2 weeks)

---

### FR-2: Discovery Flow Implementation
**Priority:** Critical
**Description:** Implement restaurant and menu search via ONDC search/on_search

**Requirements:**
1. **Search API Integration**
   - Send search requests with GPS coordinates
   - Support category filters (food, beverage)
   - Support text-based search
   - Handle multiple gateway responses

2. **Catalog Processing**
   - Parse on_search callbacks
   - Extract provider (restaurant) information
   - Extract item (menu) information
   - Normalize to FoodBot schema

3. **Async Callback Handling**
   - Register callback handlers by transaction ID
   - Implement 30-second timeout for callbacks
   - Fallback to status polling if callback fails
   - Store transaction state in database

**Acceptance Criteria:**
- Search returns results within 5s (p95)
- Callback receipt rate > 98%
- Catalog data accurately mapped to FoodBot schema
- Support for 100+ concurrent searches

**Timeline:** Week 20-21 (2 weeks)

---

### FR-3: Order Initialization Flow
**Priority:** Critical
**Description:** Implement order creation via ONDC select/init/confirm

**Requirements:**
1. **Item Selection (select/on_select)**
   - Send selected items to provider
   - Receive quote with pricing, taxes, delivery fees
   - Validate item availability
   - Handle out-of-stock scenarios

2. **Order Initialization (init/on_init)**
   - Submit billing and delivery details
   - Receive payment breakup
   - Confirm delivery timeslots
   - Validate address serviceability

3. **Order Confirmation (confirm/on_confirm)**
   - Submit payment confirmation
   - Receive order ID and tracking details
   - Store order in database
   - Send confirmation to user

**Acceptance Criteria:**
- Order placement completes within 30s (p95)
- Error rate < 1%
- All order states properly tracked
- Payment integration secure (PCI-compliant)

**Timeline:** Week 21-22 (2 weeks)

---

### FR-4: Post-Fulfillment APIs
**Priority:** High
**Description:** Implement order tracking, cancellation, and support

**Requirements:**
1. **Status Polling (status/on_status)**
   - Poll order status every 30s
   - Update user on order progress
   - Notify on state changes (confirmed → preparing → dispatched → delivered)

2. **Order Tracking (track/on_track)**
   - Get real-time delivery partner location
   - Display on map interface
   - Estimated delivery time updates

3. **Cancellation (cancel/on_cancel)**
   - Support user-initiated cancellations
   - Handle provider-initiated cancellations
   - Process refunds according to policy

4. **Support (support/on_support)**
   - Escalate issues to provider support
   - Provide contact information
   - Track support ticket status

5. **Rating & Feedback (rating)**
   - Collect user ratings (1-5 stars)
   - Submit feedback to ONDC network
   - Improve provider recommendations

**Acceptance Criteria:**
- Status updates within 30s of state change
- Cancellation processed within 2 minutes
- Support ticket creation success rate > 99%
- Rating submission success rate > 95%

**Timeline:** Week 23 (1 week)

---

### FR-5: Digital Signature Implementation
**Priority:** Critical
**Description:** Implement Ed25519 signatures for request authentication

**Requirements:**
1. **Key Management**
   - Generate Ed25519 key pair
   - Store private key securely (AWS Secrets Manager)
   - Distribute public key to ONDC gateway
   - Support key rotation

2. **Request Signing**
   - Sign all outgoing requests
   - Include signature in Authorization header
   - Use proper signing algorithm (Ed25519)
   - Include signature parameters (created, expires, keyId)

3. **Callback Verification**
   - Verify signatures on incoming callbacks
   - Reject requests with invalid signatures
   - Log verification failures
   - Rate limit unsigned requests

**Acceptance Criteria:**
- 100% of requests properly signed
- Signature verification success rate > 99.9%
- Key rotation without downtime
- Secure key storage (no hardcoded keys)

**Security Requirements:**
- Private key never logged or exposed
- Signature parameters tamper-proof
- Clock skew tolerance ±5 minutes
- Signature replay prevention

**Timeline:** Week 19 (part of Phase 1)

---

### FR-6: Transaction State Management
**Priority:** High
**Description:** Track all ONDC transactions with state machine

**Requirements:**
1. **Database Schema**
   ```sql
   CREATE TABLE ondc_transactions (
     id UUID PRIMARY KEY,
     transaction_id VARCHAR(255) UNIQUE NOT NULL,
     order_id UUID REFERENCES orders(id),
     provider_id VARCHAR(255),
     state VARCHAR(50) NOT NULL,
     request_payload JSONB,
     response_payload JSONB,
     error_details JSONB,
     created_at TIMESTAMP NOT NULL,
     updated_at TIMESTAMP NOT NULL,
     callback_received_at TIMESTAMP,
     INDEX idx_transaction_id (transaction_id),
     INDEX idx_order_id (order_id),
     INDEX idx_state (state)
   );
   ```

2. **State Transitions**
   - INITIATED → ACK_RECEIVED → CALLBACK_RECEIVED → COMPLETED
   - INITIATED → ACK_RECEIVED → TIMEOUT → FAILED
   - Handle retries and idempotency

3. **State Machine Events**
   - Emit events on state changes
   - Trigger notifications
   - Update order status
   - Log audit trail

**Acceptance Criteria:**
- All transactions tracked in database
- State transitions auditable
- No orphaned transactions
- 100% idempotency for retries

**Timeline:** Week 19 (part of Phase 1)

---

## Non-Functional Requirements

### NFR-1: Performance
**Priority:** Critical

- **API Response Time:** ACK within 2s, callbacks within 5s
- **Order Placement:** Complete workflow within 30s (p95)
- **Concurrent Transactions:** Support 100+ simultaneous orders
- **Database Queries:** < 100ms for transaction lookups

---

### NFR-2: Reliability
**Priority:** Critical

- **Uptime:** 99.5% availability for callback endpoints
- **Error Rate:** < 1% failed transactions
- **Callback Receipt:** > 98% callback success rate
- **Retry Logic:** Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Circuit Breaker:** Open after 5 consecutive failures

---

### NFR-3: Security
**Priority:** Critical

- **Authentication:** Ed25519 signatures on all requests
- **Encryption:** TLS 1.3 for all network traffic
- **PII Protection:** Encrypt addresses, phone numbers at rest
- **API Keys:** Store in AWS Secrets Manager (never in code)
- **Rate Limiting:** 100 req/min per IP
- **OWASP Compliance:** Address OWASP Top 10

---

### NFR-4: Scalability
**Priority:** High

- **Horizontal Scaling:** Support multiple callback handler instances
- **Database:** Connection pooling (min 10, max 50)
- **Caching:** Redis for provider catalog (TTL 1 hour)
- **Load Balancing:** Distribute callbacks across instances

---

### NFR-5: Observability
**Priority:** High

- **Logging:** Structured JSON logs with correlation IDs
- **Metrics:** Prometheus metrics for all APIs
- **Tracing:** OpenTelemetry for distributed tracing
- **Dashboards:** Grafana dashboards for ONDC health
- **Alerts:** PagerDuty alerts for failures

---

## Integration Requirements

### IR-1: Gateway API Integration
**Description:** ONDC provider integrated into Gateway API

**Endpoints:**
- `POST /api/v1/restaurants/search` - Unified search (includes ONDC)
- `POST /api/v1/orders` - Order placement (supports ONDC provider)
- `GET /api/v1/orders/:id/status` - Order tracking

**Changes Required:**
- Add `ondc` as provider type
- Update search aggregation logic
- Support ONDC-specific order fields

---

### IR-2: MCP Adapter Integration
**Description:** ONDC provider in MCP Adapter service

**Components:**
- `ONDCClient.ts` - Already implemented (needs testing)
- `types.ts` - Already implemented
- Provider registration in `ProviderFactory`

**Changes Required:**
- Register ONDC provider in factory
- Add ONDC to provider health checks
- Update integration tests

---

### IR-3: Database Schema Extensions
**Description:** Extend database to support ONDC transactions

**New Tables:**
- `ondc_transactions` (see FR-6)
- `ondc_providers` (cache merchant details)
- `ondc_callbacks` (audit log)

**Migrations:**
- Migration script for schema changes
- Rollback plan if needed

---

### IR-4: Callback Endpoint Setup
**Description:** Expose public HTTPS endpoints for ONDC callbacks

**Requirements:**
- Public domain: `api.foodbot.com`
- SSL certificate (Let's Encrypt or AWS ACM)
- Nginx reverse proxy configuration
- Load balancer (AWS ALB)

**Endpoints:**
- `POST /webhooks/ondc/on_search`
- `POST /webhooks/ondc/on_select`
- `POST /webhooks/ondc/on_init`
- `POST /webhooks/ondc/on_confirm`
- `POST /webhooks/ondc/on_status`
- `POST /webhooks/ondc/on_track`
- `POST /webhooks/ondc/on_cancel`
- `POST /webhooks/ondc/on_support`

---

## Testing Requirements

### TR-1: Unit Tests
**Coverage:** 80% minimum

- All ONDCClient methods
- Signature generation/verification
- State machine transitions
- Error handling paths

---

### TR-2: Integration Tests
**Description:** Test against ONDC sandbox

- Full order workflow (search → select → init → confirm)
- Callback handling
- Error scenarios (timeout, invalid response)
- Retry logic

---

### TR-3: End-to-End Tests
**Description:** Test full user journey

- User searches for restaurants
- ONDC results included in search
- User places order via ONDC
- Order tracked to completion
- User receives order

---

### TR-4: Load Tests
**Description:** Verify performance under load

- 100 concurrent users
- 1000 requests/minute
- Sustained load for 1 hour
- Measure: response times, error rates, callback success

---

## Documentation Requirements

### DR-1: API Documentation
- ONDC API reference
- Signature generation guide
- Error code reference
- Webhook payload schemas

---

### DR-2: Integration Guide
- How to register with ONDC
- Setup instructions
- Configuration guide
- Troubleshooting

---

### DR-3: Operations Runbook
- Monitoring setup
- Common issues and fixes
- Escalation procedures
- Key rotation process

---

## Dependencies

### External Dependencies
1. **ONDC Gateway Registration** - 1-2 weeks approval time
2. **SSL Certificate** - 1 day (automated via Let's Encrypt)
3. **Public Domain** - Already available (`api.foodbot.com`)
4. **Payment Gateway** - Existing Stripe integration compatible

### Internal Dependencies
1. **Gateway API** - Stable version deployed
2. **MCP Adapter** - Refactoring complete
3. **Database** - PostgreSQL 14+ with JSONB support
4. **Monitoring** - Prometheus + Grafana operational

---

## Risk Assessment

### High Risks

**Risk:** ONDC gateway registration rejected
**Impact:** High - Cannot proceed with integration
**Mitigation:** Apply early (Week 18), have backup plan (alternative gateway)

**Risk:** Callback endpoint downtime
**Impact:** High - Orders fail silently
**Mitigation:** Load balancer + multiple instances, fallback to status polling

**Risk:** Signature verification failures
**Impact:** Medium - Callbacks rejected
**Mitigation:** Comprehensive testing, monitoring, automated key rotation

---

### Medium Risks

**Risk:** ONDC API changes breaking integration
**Impact:** Medium - Temporary outage
**Mitigation:** Subscribe to ONDC updates, automated testing, version pinning

**Risk:** Provider catalog inconsistencies
**Impact:** Medium - Bad user experience
**Mitigation:** Data validation, fallback to status API, error reporting

---

## Success Metrics

### Technical KPIs
- API Success Rate: > 99%
- Callback Receipt Rate: > 98%
- Search Response Time: < 5s (p95)
- Order Placement Time: < 30s (p95)
- Error Rate: < 1%
- Uptime: > 99.5%

### Business KPIs
- ONDC Orders %: 15% of total (3 months post-launch)
- New Restaurants: +10% unique listings
- User Satisfaction: > 4.5/5
- Cancellation Rate: < 5%

---

## Timeline

**Total Duration:** 8 weeks (Week 18-24)

- **Week 18-19:** Registration & Setup (80 hours)
- **Week 20-22:** Core Integration (120 hours)
- **Week 23:** Advanced Features (40 hours)
- **Week 24:** Testing & Certification (40 hours)

**Total Effort:** 280 hours

---

## Budget

### Development Costs
- 280 hours × $30/hour = $8,400

### Infrastructure Costs (First Year)
- Compute (EC2): $1,320/year
- Database: $198/year
- Monitoring: $540/year
- One-time Setup: $420

**Total:** $10,878 first year

---

## Approval Required

- [ ] Product Owner approval
- [ ] Technical Lead review
- [ ] Budget approval
- [ ] Timeline confirmation
- [ ] Resource allocation

---

**Created By:** FoodBot Engineering Team
**Date:** 2026-02-20
**Status:** Awaiting Approval

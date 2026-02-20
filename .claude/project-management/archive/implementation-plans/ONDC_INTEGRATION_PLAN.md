# ONDC Integration Plan - FoodBot

**Document Version:** 1.0.0
**Target Timeline:** Weeks 18-24
**Status:** Planning Phase
**Owner:** FoodBot Development Team

---

## ⚠️ IMPORTANT DISCLAIMER

This integration plan is based on ONDC specifications and Beckn Protocol as of January 2025. Before execution:

- ✅ Verify current ONDC gateway requirements at https://portal.ondc.org
- ✅ Check for API version updates at https://docs.ondc.org
- ✅ Review latest compliance requirements
- ✅ Confirm merchant coverage in target cities

---

## Executive Summary

### Integration Goals

**Primary Objectives:**
1. Enable FoodBot users to discover and order from ONDC-registered restaurants
2. Provide 10-15% additional restaurant coverage beyond Swiggy/Zomato
3. Reduce platform dependency and associated risks
4. Position FoodBot as innovation leader with unified multi-platform search

**Success Metrics:**
- ✅ ONDC participant certification obtained
- ✅ 10+ successful sandbox transactions
- ✅ End-to-end order flow operational
- ✅ < 5 second average search response time
- ✅ < 1% API error rate in production
- ✅ 15% of orders via ONDC within 3 months post-launch

### Timeline Overview

```
Week 18-19: Registration & Setup (2 weeks)
Week 20-22: Core Integration (3 weeks)
Week 23:    Advanced Features (1 week)
Week 24:    Testing & Certification (1 week)
Week 25+:   Production Launch & Unified Search
```

**Total Duration:** 8 weeks
**Estimated Effort:** 280 person-hours
**Infrastructure Cost:** ~$2,658 first year

---

## Phase 1: Registration & Setup (Weeks 18-19)

### Week 18: Documentation & Registration

#### Monday-Tuesday: Research & Documentation

**Tasks:**
- [ ] Review official ONDC documentation
  - Portal: https://portal.ondc.org
  - Docs: https://docs.ondc.org
  - Tech Resources: https://resources.ondc.org/tech-resources
- [ ] Study Beckn Protocol 1.1.0 specifications
  - Core specs: https://developers.beckn.org
  - GitHub: https://github.com/beckn/protocol-specifications
- [ ] Analyze ONDC reference implementations
  - Buyer app: https://github.com/ONDC-Official/ref-buyer-app
  - API contracts: https://github.com/ONDC-Official/ONDC-Protocol-Specs
- [ ] Document FoodBot integration architecture
  - Create architecture diagram
  - Define component responsibilities
  - Plan database schema extensions

**Deliverables:**
- ✅ Architecture document with diagrams
- ✅ Integration checklist
- ✅ Risk assessment document

**Time Estimate:** 16 hours

#### Wednesday-Thursday: Gateway Registration

**Prerequisites:**
- [ ] Company registration documents (Certificate of Incorporation)
- [ ] GST Certificate
- [ ] PAN Card
- [ ] Bank account details
- [ ] Authorized signatory KYC documents
- [ ] Data privacy policy document
- [ ] Terms of service document

**Tasks:**
- [ ] Complete ONDC participant registration at https://portal.ondc.org/register
  - Participant Type: Buyer App
  - Category: Food & Beverage (nic2004:52110)
  - Expected Volume: <estimate based on current traffic>
- [ ] Submit required documentation
  - Upload all prerequisite documents
  - Complete online application form
  - Provide technical contact details
- [ ] Generate Ed25519 key pair for digital signatures
  ```bash
  openssl genpkey -algorithm Ed25519 -out private_key.pem
  openssl pkey -in private_key.pem -pubout -out public_key.pem
  ```
- [ ] Upload public key to ONDC registry
- [ ] Register FoodBot domain (`foodbot.example.com`)
- [ ] Sign Network Participant Agreement (NPA)

**Deliverables:**
- ✅ ONDC application submitted
- ✅ Key pair generated and stored securely
- ✅ Public key registered
- ✅ Domain assigned

**Time Estimate:** 16 hours

**Expected Wait Time:** 3-5 business days for approval

#### Friday: Development Environment Setup

**Tasks:**
- [ ] Set up project structure in codebase
  ```
  services/mcp-adapter/src/providers/ondc/
  ├── ONDCClient.ts          (main client)
  ├── types.ts               (TypeScript types)
  ├── auth.service.ts        (signature generation)
  ├── callback.handler.ts    (callback processing)
  ├── transaction.manager.ts (state management)
  └── README.md              (documentation)
  ```
- [ ] Create Git branch: `feat/ondc-integration`
- [ ] Set up environment variables
  ```bash
  ONDC_GATEWAY_URL=https://sandbox.ondc.org
  ONDC_SUBSCRIBER_ID=foodbot.example.com
  ONDC_SUBSCRIBER_URI=https://staging-api.foodbot.com/beckn
  ONDC_PRIVATE_KEY_PATH=/secure/keys/ondc_private_key.pem
  ONDC_UNIQUE_KEY_ID=foodbot-key-1
  ONDC_DOMAIN=nic2004:52110
  ONDC_COUNTRY=IND
  ONDC_CITY=std:080
  ```
- [ ] Install required dependencies
  ```bash
  npm install @noble/curves @noble/hashes uuid axios
  npm install --save-dev @types/uuid
  ```
- [ ] Configure sandbox environment access
- [ ] Set up logging infrastructure

**Deliverables:**
- ✅ Project structure created
- ✅ Development environment configured
- ✅ Dependencies installed

**Time Estimate:** 8 hours

---

### Week 19: Infrastructure Setup

#### Monday-Tuesday: Authentication Implementation

**Tasks:**
- [ ] Implement signature generation service
  - Create `ONDCAuthService` class
  - Implement `signRequest()` method
  - Implement `verifyCallback()` method
  - Add timestamp validation
  - Add digest calculation
- [ ] Write comprehensive unit tests
  - Test signature generation
  - Test signature verification
  - Test timestamp validation
  - Test error cases
  - Test edge cases (expired signatures, invalid keys)
- [ ] Load and secure private key
  - Implement secure key loading from environment
  - Add key rotation capability
  - Implement key validation
- [ ] Create signature verification middleware
  - Express/NestJS middleware for callback authentication
  - Automatic signature verification on all `/beckn/on_*` endpoints

**Code Structure:**
```typescript
// auth.service.ts
export class ONDCAuthService {
  signRequest(body: string): { authHeader: string; digest: string }
  verifyCallback(authHeader: string, digest: string, body: string, publicKey: Uint8Array): boolean
  private calculateDigest(body: string): string
  private constructSigningString(created: number, expires: number, digest: string): string
  private generateSignature(signingString: string): string
}
```

**Deliverables:**
- ✅ Signature service implemented
- ✅ 100% test coverage for authentication
- ✅ Security audit passed

**Time Estimate:** 16 hours

#### Wednesday-Thursday: Callback Infrastructure

**Tasks:**
- [ ] Set up public callback endpoints
  ```typescript
  POST /beckn/on_search
  POST /beckn/on_select
  POST /beckn/on_init
  POST /beckn/on_confirm
  POST /beckn/on_status
  POST /beckn/on_track
  POST /beckn/on_cancel
  POST /beckn/on_support
  POST /beckn/on_rating
  ```
- [ ] Implement signature verification middleware
  - Apply to all `/beckn/on_*` routes
  - Reject requests with invalid signatures
  - Log all verification attempts
- [ ] Set up message queue for async processing
  - Install Redis: `npm install redis`
  - Configure Redis connection
  - Implement queue producer/consumer
  - Add retry logic with exponential backoff
- [ ] Create callback handler framework
  - Handler registration system
  - Transaction-based routing
  - Timeout management
  - Error handling
- [ ] Configure SSL certificates
  - Use Let's Encrypt for staging
  - Configure automatic renewal
  - Verify HTTPS is enforced

**Infrastructure:**
```typescript
// callback.handler.ts
export class CallbackHandler {
  registerHandler(action: string, txnId: string, handler: Function)
  handleCallback(message: BecknMessage): Promise<void>
  private routeToHandler(message: BecknMessage): Promise<void>
  private handleTimeout(txnId: string, action: string): void
}
```

**Deliverables:**
- ✅ Callback endpoints operational
- ✅ Signature verification enforced
- ✅ Redis queue configured
- ✅ SSL certificates installed

**Time Estimate:** 20 hours

#### Friday: Database Schema

**Tasks:**
- [ ] Design ONDC-specific tables
  ```sql
  -- ONDC transactions
  CREATE TABLE ondc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    bpp_id VARCHAR(255),
    bpp_uri VARCHAR(255),
    provider_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ONDC orders
  CREATE TABLE ondc_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES ondc_transactions(id),
    ondc_order_id VARCHAR(255) UNIQUE,
    user_id UUID REFERENCES users(id),
    provider_id VARCHAR(255),
    provider_name VARCHAR(255),
    items JSONB NOT NULL,
    quote JSONB NOT NULL,
    fulfillment JSONB,
    billing JSONB NOT NULL,
    payment JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    state VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ONDC catalog cache
  CREATE TABLE ondc_catalog_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bpp_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    catalog_data JSONB NOT NULL,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_bpp_provider (bpp_id, provider_id),
    INDEX idx_expires (expires_at)
  );

  -- ONDC callback logs
  CREATE TABLE ondc_callback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    message_id UUID,
    action VARCHAR(50) NOT NULL,
    bpp_id VARCHAR(255),
    request_payload JSONB,
    response_payload JSONB,
    signature TEXT,
    verified BOOLEAN,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction (transaction_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
  );
  ```
- [ ] Create database migrations
- [ ] Implement repository layer
  ```typescript
  export class ONDCRepository {
    createTransaction(data: TransactionData): Promise<ONDCTransaction>
    updateTransactionStatus(txnId: string, status: string): Promise<void>
    createOrder(data: OrderData): Promise<ONDCOrder>
    updateOrderStatus(orderId: string, status: string): Promise<void>
    getCatalogCache(bppId: string, providerId: string): Promise<Catalog | null>
    setCatalogCache(bppId: string, providerId: string, catalog: Catalog): Promise<void>
    logCallback(data: CallbackLogData): Promise<void>
  }
  ```
- [ ] Add indexes for performance
- [ ] Set up data retention policies

**Deliverables:**
- ✅ Database schema created
- ✅ Migrations applied
- ✅ Repository layer implemented
- ✅ Indexes configured

**Time Estimate:** 12 hours

**Phase 1 Completion Checklist:**
- [ ] ONDC participant registration approved
- [ ] Sandbox environment access granted
- [ ] Digital signature implementation tested
- [ ] Callback endpoints operational
- [ ] Database schema deployed
- [ ] All tests passing

---

## Phase 2: Core Integration (Weeks 20-22)

### Week 20: Discovery Flow

#### Monday-Tuesday: Search Implementation

**Tasks:**
- [ ] Implement `/search` request builder
  ```typescript
  async search(params: SearchParams): Promise<string> {
    // 1. Create transaction ID
    // 2. Build search intent
    // 3. Create context
    // 4. Sign request
    // 5. Send to ONDC gateway
    // 6. Return transaction ID
  }
  ```
- [ ] Add location-based search
  - GPS coordinates
  - Area code (postal code)
  - City filtering
- [ ] Add category filters
  - Pizza, Biryani, Burgers, etc.
- [ ] Add item name search
  - "Margherita Pizza"
  - Fuzzy matching support
- [ ] Add provider name search
  - "Pizza Paradise"
- [ ] Implement request signing
- [ ] Add error handling
- [ ] Write unit tests

**Example Usage:**
```typescript
const txnId = await ondcClient.search({
  gps: "12.9715987,77.5945627",
  area_code: "560001",
  category: "Pizza",
  item_name: "Margherita"
});
```

**Deliverables:**
- ✅ Search API implemented
- ✅ Unit tests passing
- ✅ Sandbox testing successful

**Time Estimate:** 12 hours

#### Wednesday-Thursday: On_Search Handler

**Tasks:**
- [ ] Implement `/on_search` callback handler
  ```typescript
  async handleOnSearch(message: OnSearchResponse): Promise<void> {
    // 1. Verify signature
    // 2. Parse catalog
    // 3. Store in cache
    // 4. Trigger registered handlers
    // 5. Log callback
  }
  ```
- [ ] Parse catalog structure
  - Extract providers
  - Extract locations
  - Extract categories
  - Extract items with pricing
  - Extract availability
- [ ] Implement catalog aggregation
  - Multiple sellers may respond
  - Deduplicate providers
  - Merge catalogs
  - Sort by relevance
- [ ] Cache catalog data
  - 15-minute TTL
  - Redis cache
  - Fallback to database
- [ ] Implement callback routing
  - Route to registered transaction handler
  - Handle orphaned callbacks
- [ ] Write integration tests

**Deliverables:**
- ✅ On_search handler implemented
- ✅ Catalog aggregation working
- ✅ Caching operational
- ✅ Integration tests passing

**Time Estimate:** 16 hours

#### Friday: Search Integration Testing

**Tasks:**
- [ ] Test search with various parameters
  - GPS only
  - Area code only
  - Category filter
  - Item name search
  - Provider name search
  - Combined filters
- [ ] Test catalog aggregation
  - Single seller response
  - Multiple seller responses
  - Duplicate handling
- [ ] Test timeout scenarios
  - No callbacks received
  - Partial callbacks
  - Delayed callbacks
- [ ] Test signature verification
  - Valid signatures
  - Invalid signatures
  - Expired signatures
- [ ] Performance testing
  - Response time < 5 seconds
  - Concurrent searches
  - Load testing
- [ ] Document known issues

**Deliverables:**
- ✅ Test report with results
- ✅ Performance benchmarks
- ✅ Issue tracker updated

**Time Estimate:** 12 hours

---

### Week 21: Order Initialization

#### Monday-Tuesday: Select & On_Select

**Tasks:**
- [ ] Implement `/select` request
  ```typescript
  async select(params: SelectParams): Promise<void> {
    // 1. Build order object
    // 2. Add delivery address
    // 3. Create context with BPP details
    // 4. Sign and send request
  }
  ```
- [ ] Add item selection
  - Item IDs and quantities
  - Validate against catalog
- [ ] Add delivery address
  - GPS coordinates
  - Full address structure
  - Contact phone
- [ ] Implement `/on_select` handler
  ```typescript
  async handleOnSelect(message: OnSelectResponse): Promise<void> {
    // 1. Verify signature
    // 2. Extract quote
    // 3. Validate pricing
    // 4. Check serviceability
    // 5. Store quote
    // 6. Trigger handler
  }
  ```
- [ ] Parse quote structure
  - Base price
  - Delivery charges
  - Taxes
  - Total amount
  - Quote validity (TTL)
- [ ] Validate serviceability
  - Check fulfillment state
  - Verify delivery time estimate
- [ ] Write tests

**Deliverables:**
- ✅ Select/On_select implemented
- ✅ Quote parsing working
- ✅ Tests passing

**Time Estimate:** 20 hours

#### Wednesday-Thursday: Init & On_Init

**Tasks:**
- [ ] Implement `/init` request
  ```typescript
  async init(params: InitParams): Promise<void> {
    // 1. Build order with billing
    // 2. Add fulfillment details
    // 3. Add payment type
    // 4. Sign and send
  }
  ```
- [ ] Add billing information
  - Name, email, phone
  - Billing address
  - Validation
- [ ] Add fulfillment details
  - Delivery address
  - Delivery contact
  - Special instructions
- [ ] Specify payment type
  - ON-ORDER (prepaid via FoodBot)
  - Collected by BAP
- [ ] Implement `/on_init` handler
  ```typescript
  async handleOnInit(message: OnInitResponse): Promise<void> {
    // 1. Verify signature
    // 2. Extract order draft
    // 3. Validate payment details
    // 4. Store draft
    // 5. Ready for confirmation
  }
  ```
- [ ] Parse order draft
  - Finalized items
  - Final quote
  - Payment details
  - Fulfillment details
- [ ] Validate order draft
  - Quote hasn't changed
  - Items still available
  - Delivery still serviceable
- [ ] Write tests

**Deliverables:**
- ✅ Init/On_init implemented
- ✅ Order draft handling working
- ✅ Tests passing

**Time Estimate:** 20 hours

---

### Week 22: Order Confirmation

#### Monday-Tuesday: Confirm Implementation

**Tasks:**
- [ ] Integrate payment gateway
  - Razorpay/Stripe integration
  - Payment capture before confirm
  - Handle payment failures
- [ ] Implement `/confirm` request
  ```typescript
  async confirm(params: ConfirmParams): Promise<void> {
    // 1. Verify payment completed
    // 2. Build confirmed order
    // 3. Add payment details
    // 4. Sign and send
  }
  ```
- [ ] Add order ID generation
  - Format: `ORDER-FOODBOT-{timestamp}-{random}`
  - Unique constraint
- [ ] Add payment confirmation
  - Transaction ID
  - Amount and currency
  - Payment status: PAID
- [ ] Implement state machine
  ```typescript
  enum OrderState {
    SEARCHING,
    SELECTING,
    INITIALIZING,
    CONFIRMING,
    CONFIRMED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
  }
  ```
- [ ] Add transaction tracking
  - Create transaction record
  - Update status at each step
  - Log all transitions
- [ ] Write tests

**Deliverables:**
- ✅ Confirm API implemented
- ✅ Payment integration working
- ✅ State machine operational
- ✅ Tests passing

**Time Estimate:** 20 hours

#### Wednesday-Thursday: On_Confirm Handler

**Tasks:**
- [ ] Implement `/on_confirm` handler
  ```typescript
  async handleOnConfirm(message: OnConfirmResponse): Promise<void> {
    // 1. Verify signature
    // 2. Extract confirmed order
    // 3. Get ONDC order ID
    // 4. Store order
    // 5. Notify user
    // 6. Start status polling
  }
  ```
- [ ] Extract order confirmation
  - ONDC order ID (from seller)
  - Order state (Accepted, Created)
  - Fulfillment details
  - Delivery time estimate
- [ ] Store confirmed order
  - Link to FoodBot order
  - Store all order details
  - Update transaction status
- [ ] Trigger user notification
  - Order confirmed message
  - Order ID and tracking
  - Estimated delivery time
- [ ] Start status polling
  - Poll every 2 minutes
  - Update order state
  - Notify on state changes
- [ ] Handle confirmation errors
  - Out of stock after confirm
  - Merchant rejection
  - Payment issues
  - Rollback and refund
- [ ] Write tests

**Deliverables:**
- ✅ On_confirm handler implemented
- ✅ Order storage working
- ✅ Notifications sent
- ✅ Error handling robust
- ✅ Tests passing

**Time Estimate:** 20 hours

#### Friday: End-to-End Testing

**Tasks:**
- [ ] Test complete order flow
  1. Search for restaurants
  2. Select items
  3. Get quote
  4. Initialize with billing
  5. Process payment
  6. Confirm order
  7. Receive confirmation
  8. Track order status
- [ ] Test with multiple restaurants
  - Different providers
  - Different locations
  - Different cuisines
- [ ] Test error scenarios
  - Item goes out of stock during flow
  - Quote expires
  - Payment fails
  - Merchant rejects order
  - Network failures
- [ ] Test concurrent orders
  - Multiple users
  - Same restaurant
  - Different restaurants
- [ ] Verify data persistence
  - All transactions logged
  - Orders stored correctly
  - State transitions recorded
- [ ] Performance testing
  - End-to-end time < 30 seconds
  - No memory leaks
  - Proper cleanup

**Deliverables:**
- ✅ 10+ successful end-to-end orders
- ✅ Error scenarios handled
- ✅ Performance benchmarks met
- ✅ Test report generated

**Time Estimate:** 16 hours

---

## Phase 3: Advanced Features (Week 23)

### Monday: Status & Tracking

**Tasks:**
- [ ] Implement `/status` request
  ```typescript
  async status(params: StatusParams): Promise<void> {
    // Poll for order status updates
  }
  ```
- [ ] Implement status polling service
  ```typescript
  class StatusPollingService {
    startPolling(orderId: string, interval: number)
    stopPolling(orderId: string)
    private pollStatus(orderId: string)
  }
  ```
- [ ] Implement `/on_status` handler
  - Parse fulfillment state
  - Update order status
  - Notify user on state change
- [ ] Map fulfillment states
  ```typescript
  Pending → Order placed
  Packed → Order being prepared
  Order-picked-up → Out for delivery
  Order-delivered → Delivered
  ```
- [ ] Implement `/track` request
- [ ] Implement `/on_track` handler
  - Extract tracking URL
  - Extract GPS coordinates
  - Display to user
- [ ] Add real-time updates
  - WebSocket notifications
  - Push notifications
- [ ] Write tests

**Deliverables:**
- ✅ Status polling operational
- ✅ Tracking implemented
- ✅ User notifications working
- ✅ Tests passing

**Time Estimate:** 12 hours

---

### Tuesday: Cancel Flow

**Tasks:**
- [ ] Implement cancellation policy check
  ```typescript
  function canCancelOrder(order: Order): boolean {
    // Check order state
    // Check time elapsed
    // Check merchant policy
  }
  ```
- [ ] Implement `/cancel` request
  ```typescript
  async cancel(params: CancelParams): Promise<void> {
    // 1. Verify cancellable
    // 2. Select reason code
    // 3. Send cancel request
  }
  ```
- [ ] Add cancellation reasons UI
  - User-friendly reason selection
  - Map to ONDC reason codes
  - Free text description
- [ ] Implement `/on_cancel` handler
  - Parse cancellation confirmation
  - Process refund
  - Update order status
  - Notify user
- [ ] Integrate refund processing
  - Razorpay/Stripe refund API
  - Track refund status
  - Handle refund failures
- [ ] Write tests

**Deliverables:**
- ✅ Cancellation flow working
- ✅ Refunds processed
- ✅ Tests passing

**Time Estimate:** 8 hours

---

### Wednesday: Support & Rating

**Tasks:**
- [ ] Implement `/support` request
  ```typescript
  async support(params: SupportParams): Promise<void> {
    // Request support for order issues
  }
  ```
- [ ] Implement `/on_support` handler
  - Extract support contact
  - Display to user
  - Create support ticket in FoodBot
- [ ] Integrate with FoodBot support system
  - Link ONDC support with internal ticketing
  - Track resolution
- [ ] Implement `/rating` request
  ```typescript
  async rating(params: RatingParams): Promise<void> {
    // Submit ratings for order, items, delivery
  }
  ```
- [ ] Create rating UI
  - Overall order rating
  - Per-item ratings
  - Delivery experience rating
  - Free text feedback
- [ ] Implement `/on_rating` handler
  - Acknowledge rating submission
  - Store ratings locally
- [ ] Write tests

**Deliverables:**
- ✅ Support request working
- ✅ Rating submission working
- ✅ Tests passing

**Time Estimate:** 8 hours

---

### Thursday-Friday: Error Handling & Resilience

**Tasks:**
- [ ] Implement retry logic
  ```typescript
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    // Exponential backoff: 1s, 2s, 4s
  }
  ```
- [ ] Add circuit breaker
  ```typescript
  class CircuitBreaker {
    // Open circuit after 5 consecutive failures
    // Half-open after 1 minute
    // Close on successful request
  }
  ```
- [ ] Implement timeout handling
  - Request timeouts (30s)
  - Callback timeouts (30s)
  - Overall transaction timeout (5min)
- [ ] Add comprehensive logging
  - All requests/responses
  - All state transitions
  - All errors with context
  - Performance metrics
- [ ] Implement health checks
  ```typescript
  GET /health/ondc
  {
    "status": "healthy",
    "gateway": "connected",
    "callback_queue": "operational",
    "last_successful_transaction": "2024-03-15T10:30:00Z"
  }
  ```
- [ ] Add monitoring dashboards
  - Transaction success rate
  - Average response times
  - Error rates by type
  - Active orders count
- [ ] Write comprehensive tests
  - Network failures
  - Timeout scenarios
  - Malformed responses
  - Signature failures
  - Concurrent requests

**Deliverables:**
- ✅ Retry logic operational
- ✅ Circuit breaker working
- ✅ Comprehensive logging
- ✅ Health checks passing
- ✅ Monitoring dashboard live
- ✅ 90%+ test coverage

**Time Estimate:** 16 hours

---

## Phase 4: Testing & Certification (Week 24)

### Monday-Tuesday: Integration Testing

**Tasks:**
- [ ] Comprehensive integration test suite
  - All API flows
  - All callback handlers
  - All error scenarios
- [ ] Test with ONDC sandbox
  - Multiple seller apps
  - Various restaurant types
  - Different order configurations
- [ ] Concurrent transaction testing
  - 10+ simultaneous orders
  - Same user, multiple orders
  - Multiple users, same restaurant
- [ ] Performance testing
  - Search response time < 5s
  - Order placement < 30s
  - Status updates < 3s
  - No memory leaks
  - CPU usage < 70%
- [ ] Load testing
  - 100 concurrent users
  - 1000 orders/hour
  - Sustained load for 1 hour
- [ ] Generate test report
  - Test cases executed
  - Pass/fail rates
  - Performance metrics
  - Known issues

**Deliverables:**
- ✅ Integration test suite complete
- ✅ Performance benchmarks met
- ✅ Load testing passed
- ✅ Test report generated

**Time Estimate:** 16 hours

---

### Wednesday: Edge Case Testing

**Tasks:**
- [ ] Test network failures
  - Gateway down
  - Seller app down
  - Callback endpoint unreachable
  - DNS failures
- [ ] Test partial responses
  - Some sellers respond, some don't
  - Incomplete catalog data
  - Missing required fields
- [ ] Test callback timeouts
  - No on_search received
  - Delayed callbacks (> 30s)
  - Out-of-order callbacks
- [ ] Test signature failures
  - Invalid signatures
  - Expired timestamps
  - Wrong public key
  - Tampered messages
- [ ] Test data inconsistencies
  - Price changes between select/init
  - Item availability changes
  - Quote expiration
  - Merchant cancellation
- [ ] Test concurrent operations
  - Multiple searches same user
  - Order + status poll simultaneously
  - Cancel during confirm
- [ ] Document all edge cases
  - Expected behavior
  - Actual behavior
  - Mitigation strategies

**Deliverables:**
- ✅ Edge case test results
- ✅ Issue tracker updated
- ✅ Mitigation documentation

**Time Estimate:** 12 hours

---

### Thursday: ONDC Certification

**Tasks:**
- [ ] Review ONDC certification checklist
  - Mandatory API endpoints
  - Compliance requirements
  - Data handling policies
  - Security standards
- [ ] Submit UAT (User Acceptance Testing) results
  - Transaction logs
  - Success metrics
  - Error handling proof
- [ ] Complete compliance documentation
  - Data localization proof
  - Privacy policy
  - Terms of service
  - Grievance redressal mechanism
- [ ] Conduct certification testing with ONDC team
  - Live testing session
  - Q&A with ONDC reviewers
  - Address any issues found
- [ ] Fix certification issues (if any)
- [ ] Obtain pre-production approval

**Deliverables:**
- ✅ UAT results submitted
- ✅ Compliance docs approved
- ✅ Certification obtained
- ✅ Pre-production approval received

**Time Estimate:** 8 hours

**Expected Wait Time:** 2-5 business days for final approval

---

### Friday: Production Preparation

**Tasks:**
- [ ] Deploy to production infrastructure
  - Update environment variables
  - Switch to production gateway URL
  - Update callback URLs
  - Deploy to production servers
- [ ] Configure production SSL certificates
  - Install commercial SSL cert
  - Configure auto-renewal
  - Test HTTPS endpoints
- [ ] Set up production monitoring
  - CloudWatch alarms
  - Sentry error tracking
  - Custom ONDC dashboard
  - PagerDuty alerts
- [ ] Configure logging
  - CloudWatch Logs
  - Structured JSON logging
  - Log retention policy (90 days)
- [ ] Update production callback URLs in ONDC registry
  - https://api.foodbot.com/beckn/on_*
- [ ] Conduct production smoke tests
  - Single test order
  - Verify end-to-end flow
  - Check monitoring alerts
  - Verify logging
- [ ] Prepare rollback plan
  - Database rollback scripts
  - Code rollback procedure
  - Monitoring checklist
- [ ] Create runbook
  - Deployment steps
  - Rollback procedure
  - Common issues and fixes
  - Escalation contacts

**Deliverables:**
- ✅ Production deployment complete
- ✅ Monitoring operational
- ✅ Smoke tests passed
- ✅ Runbook documented

**Time Estimate:** 8 hours

---

## Phase 5: Unified Search (Weeks 25-28)

### Overview

After ONDC integration is stable, implement unified search across all providers:
- Swiggy MCP
- Zomato MCP
- ONDC

### Architecture

```typescript
interface SearchProvider {
  name: string;
  search(query: SearchQuery): Promise<Restaurant[]>;
  getMenu(restaurantId: string): Promise<Menu>;
  placeOrder(order: Order): Promise<OrderConfirmation>;
}

class SwiggyProvider implements SearchProvider { ... }
class ZomatoProvider implements SearchProvider { ... }
class ONDCProvider implements SearchProvider { ... }

class UnifiedSearchService {
  private providers: SearchProvider[];

  async search(query: SearchQuery): Promise<Restaurant[]> {
    // 1. Query all providers in parallel
    const results = await Promise.allSettled(
      this.providers.map(p => p.search(query))
    );

    // 2. Merge and deduplicate results
    const restaurants = this.mergeResults(results);

    // 3. Rank by relevance, rating, availability
    return this.rankRestaurants(restaurants);
  }

  private mergeResults(results: PromiseSettledResult[]): Restaurant[] {
    // Handle provider failures gracefully
    // Deduplicate restaurants across providers
    // Normalize data structures
  }

  private rankRestaurants(restaurants: Restaurant[]): Restaurant[] {
    // Multi-factor ranking:
    // - Relevance to search query
    // - User ratings
    // - Delivery time
    // - Price
    // - User preferences
    // - Historical orders
  }
}
```

### Smart Provider Selection

```typescript
class ProviderSelector {
  selectProvider(
    restaurant: Restaurant,
    user: User
  ): SearchProvider {
    // Factors:
    // 1. Restaurant availability on each provider
    // 2. Delivery time estimate
    // 3. Pricing (including discounts)
    // 4. Provider reliability (historical uptime)
    // 5. User preferences
    // 6. Provider health status

    if (restaurant.exclusiveToSwiggy) return swiggyProvider;
    if (restaurant.onONDC && user.prefersONDC) return ondcProvider;

    // Default: fastest delivery + best price
    return this.selectBestProvider(restaurant);
  }
}
```

### Implementation Plan

**Week 25:**
- [ ] Design unified search interface
- [ ] Implement provider abstraction layer
- [ ] Create result merging logic
- [ ] Add deduplication algorithm

**Week 26:**
- [ ] Implement ranking algorithm
- [ ] Add A/B testing framework
- [ ] Create smart provider selection
- [ ] Add fallback mechanisms

**Week 27:**
- [ ] Integration testing
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation

**Week 28:**
- [ ] Production deployment
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor metrics
- [ ] Optimize based on data

---

## Risk Mitigation Strategies

### High Priority Risks

#### 1. ONDC Gateway Downtime

**Mitigation:**
- [ ] Implement health checks before routing to ONDC
- [ ] Automatic fallback to Swiggy/Zomato
- [ ] User notification: "ONDC unavailable, showing alternatives"
- [ ] Retry failed requests with exponential backoff
- [ ] Circuit breaker to stop requests during outages

#### 2. Callback Delivery Failures

**Mitigation:**
- [ ] Redundant callback endpoints (primary + backup)
- [ ] Request timeout + status polling fallback
- [ ] Dead letter queue for failed callbacks
- [ ] Manual intervention dashboard
- [ ] Alert on missing callbacks > 1 minute

#### 3. Merchant Catalog Inconsistencies

**Mitigation:**
- [ ] Validate catalog data on receipt
- [ ] Cache with short TTL (15 minutes)
- [ ] Re-fetch on stale data
- [ ] User warnings: "Prices may vary"
- [ ] Stock validation before confirm

#### 4. Payment-Order Mismatch

**Mitigation:**
- [ ] Atomic payment capture + order confirm
- [ ] Idempotency keys
- [ ] Transaction rollback on failure
- [ ] Automatic refund on order rejection
- [ ] Manual reconciliation dashboard

#### 5. Compliance Audit Failure

**Mitigation:**
- [ ] Regular self-audits (monthly)
- [ ] Compliance checklist automation
- [ ] Legal review of policies
- [ ] Data handling audit trail
- [ ] Quick response to ONDC notifications

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Success Rate | > 99% | Successful ACK / Total requests |
| Callback Receipt Rate | > 98% | Callbacks received / Requests sent |
| Search Response Time | < 5 seconds (p95) | Time to aggregate on_search callbacks |
| Order Placement Time | < 30 seconds (p95) | Search → Confirm complete |
| Status Update Latency | < 3 seconds | on_status → User notification |
| Error Rate | < 1% | Failed transactions / Total |
| Uptime | > 99.5% | Callback endpoint availability |

### Business Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| ONDC Orders % | 15% of total | 3 months post-launch |
| New Restaurants | +10% unique | 3 months post-launch |
| User Satisfaction | > 4.5/5 rating | Continuous |
| Order Cancellation Rate | < 5% | Continuous |
| Support Tickets | < 2% of orders | Continuous |

---

## Budget & Resource Summary

### Team Allocation

| Role | Time Allocation | Duration |
|------|----------------|----------|
| Backend Developer | 1 FTE | 8 weeks |
| Tech Lead | 0.25 FTE | 8 weeks |
| DevOps Engineer | 0.25 FTE | 8 weeks |
| QA Engineer | 0.5 FTE | 2 weeks (Week 23-24) |
| Product Manager | 0.25 FTE | 8 weeks |

**Total Effort:** ~300 person-hours

### Infrastructure Costs

| Item | Monthly Cost | First Year |
|------|-------------|-----------|
| Compute (EC2) | $110 | $1,320 |
| Database | $16.50 | $198 |
| Monitoring | $45 | $540 |
| One-time Setup | - | $420 |
| **Total** | **$171.50** | **$2,478** |

### External Costs

| Item | Cost |
|------|------|
| ONDC Registration Fee | ~₹10,000 ($120) |
| Legal/Compliance Consultation | ~₹25,000 ($300) |
| SSL Certificates | $0 (Let's Encrypt) |
| **Total** | **$420** |

**Total First Year Cost:** ~$2,898

---

## Post-Launch Activities

### Week 25: Soft Launch

- [ ] Enable ONDC for 10% of users
- [ ] Monitor metrics closely
- [ ] Gather user feedback
- [ ] Fix critical issues
- [ ] Optimize performance

### Week 26-27: Gradual Rollout

- [ ] Increase to 25% of users
- [ ] Increase to 50% of users
- [ ] Continue monitoring
- [ ] A/B test provider selection
- [ ] Optimize ranking algorithm

### Week 28: Full Launch

- [ ] Enable for 100% of users
- [ ] Press release and marketing
- [ ] Monitor scaling
- [ ] Implement learnings

### Ongoing

- [ ] Monthly compliance audits
- [ ] Quarterly performance reviews
- [ ] Continuous optimization
- [ ] Expand to more cities
- [ ] Add more ONDC categories (grocery, pharmacy)

---

## Conclusion

This 8-week integration plan provides a structured approach to ONDC integration with:

✅ **Clear milestones** at each phase
✅ **Comprehensive testing** at every step
✅ **Risk mitigation** strategies
✅ **Success metrics** for measurement
✅ **Realistic timeline** with buffer
✅ **Budget transparency**

**Next Steps:**
1. Review and approve plan
2. Assign team members
3. Secure budget approval
4. Kickoff Week 18 (Registration phase)
5. Execute plan with weekly check-ins

---

**Document End**

**Questions or Clarifications:** Contact FoodBot Technical Lead

**References:**
- ONDC Research Report: `/docs/ONDC_RESEARCH_REPORT.md`
- API Specification: `/docs/ONDC_API_SPECIFICATION.md`
- Client Implementation: `/services/mcp-adapter/src/providers/ondc/ONDCClient.ts`

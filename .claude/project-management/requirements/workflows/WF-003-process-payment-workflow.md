# WF-003: Process Payment Workflow

**Status:** Implemented ✅
**Priority:** Critical
**Category:** Workflows - Payment Processing
**Package:** `@foodbot/workflows`

---

## Overview

Comprehensive payment processing workflow with retry logic, idempotency, 3D Secure authentication, partial authorization handling, and fraud detection.

**Related Requirements:**
- GAP-FR-008: Payment processing with retry and idempotency
- FR-PAYMENT-001: Multi-method payment support
- FR-PAYMENT-002: 3D Secure authentication
- FR-PAYMENT-003: Fraud detection

---

## Functional Requirements

### FR-WF-003-01: Idempotency Check
**Description:** Prevent duplicate charges via order ID lookup

**Logic:**
- Check database for existing payment with order ID
- Return existing result if payment already successful
- Continue processing if no payment exists

**Implementation:** `loadFromDatabase('payments', orderId)`

---

### FR-WF-003-02: Payment Method Support
**Description:** Support multiple payment methods

**Supported Methods:**
- `card`: Credit/debit cards with 3DS
- `upi`: UPI payments (India)
- `wallet`: Digital wallets
- `cash`: Cash on delivery

**Validation:** Amount must be > 0

---

### FR-WF-003-03: Payment Gateway Integration
**Description:** Process payment via gateway with retry

**Retry Policy:**
- Initial interval: 1s
- Backoff coefficient: 2
- Maximum interval: 30s
- Maximum attempts: 5 (aggressive for payments)

**Implementation:** `callPaymentGateway` activity

---

### FR-WF-003-04: 3D Secure Authentication
**Description:** Handle 3DS authentication flow for card payments

**Flow:**
1. First gateway call returns `requires3DS: true`
2. Update payment record to pending 3DS
3. Return `authUrl` to client
4. Wait for 3DS completion
5. Retry gateway call with `threeDSCompleted: true`

**Implementation:** Conditional retry in workflow logic

---

### FR-WF-003-05: Partial Authorization Handling
**Description:** Handle partial payment authorizations

**Logic:**
- Check `metadata.partial` flag
- Compare `requestedAmount` vs `authorizedAmount`
- Reject if `allowPartial` not enabled
- Accept if `allowPartial` enabled

**Use Case:** Prepaid cards with insufficient balance

---

### FR-WF-003-06: Fraud Detection
**Description:** Flag and alert on fraud-detected payments

**Detection:**
- Gateway returns error message containing "fraud"
- Send alert email to security team
- Update payment record with fraud flag
- Reject payment

**Alert Email:** `security@foodbot.com`

---

### FR-WF-003-07: Payment Record Persistence
**Description:** Track payment lifecycle in database

**States:**
- `pending`: Initial state
- `success`: Payment completed
- `failed`: Payment declined/failed

**Fields Tracked:**
- Amount, method, currency
- Transaction ID
- Gateway response
- Failure reason (if failed)
- 3DS status
- Fraud flags

**Implementation:** `saveToDatabase`, `updateDatabase` activities

---

## Workflow Input

```typescript
interface ProcessPaymentInput {
  orderId: string;
  paymentDetails: PaymentDetails;
  allowPartial?: boolean; // Default: false
}

interface PaymentDetails {
  method: 'card' | 'upi' | 'cash' | 'wallet';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}
```

---

## Workflow Output

```typescript
interface PaymentResult {
  paymentId: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  errorMessage?: string;
  requires3DS?: boolean;
  authUrl?: string;
  metadata?: {
    requestedAmount?: number;
    authorizedAmount?: number;
    partial?: boolean;
  };
}
```

---

## Workflow Steps

1. **Idempotency Check**
   - Load existing payment by order ID
   - Return if already succeeded

2. **Validate Payment Details**
   - Check amount > 0
   - Validate method

3. **Save Initial Payment Record**
   - Status: `pending`
   - Store in database

4. **Call Payment Gateway** (with automatic retry)
   - Send payment request
   - Handle response
   - Retry on transient errors

5. **Handle 3D Secure** (if required)
   - Update record to pending 3DS
   - Wait for authentication
   - Retry gateway call

6. **Handle Payment Result**
   - **Success:** Update record, notify customer
   - **Failed:** Check fraud, update record, notify customer
   - **Partial:** Validate `allowPartial`, accept or reject

7. **Fraud Detection**
   - Check error message for "fraud" keyword
   - Send alert email if detected

8. **Notify Customer**
   - Success notification
   - Failure notification

9. **Return Result**

---

## Error Handling

### Payment Errors
- `PaymentDeclinedError`: Card declined
- `PaymentTimeoutError`: Gateway timeout
- `PaymentGatewayError`: Gateway error
- `PaymentFraudError`: Fraud detected

**All payment errors:**
- Update database with failure
- Notify customer
- Propagate error

### Retry Policy
```typescript
{
  initialInterval: '1s',
  backoffCoefficient: 2,
  maximumInterval: '30s',
  maximumAttempts: 5
}
```

---

## Activity Dependencies

| Activity | Purpose | Timeout | Retry |
|----------|---------|---------|-------|
| `loadFromDatabase` | Check existing payment | 30s | 5 |
| `saveToDatabase` | Save payment record | 30s | 5 |
| `updateDatabase` | Update payment status | 30s | 5 |
| `callPaymentGateway` | Process payment | 30s | 5 |
| `notifyCustomer` | Send notification | 30s | 5 |
| `sendEmail` | Send fraud alert | 30s | 5 |

---

## Performance Requirements

- **Latency:** < 2s (p95), < 5s (p99)
- **Timeout:** 30s per activity, 60s workflow
- **Throughput:** 200+ payments/second

---

## Test Coverage

**Test File:** `packages/workflows/src/__tests__/processPayment.workflow.test.ts`

### Test Cases
1. ✅ Successful payment
2. ✅ Idempotency - duplicate request
3. ✅ Payment declined
4. ✅ Gateway timeout with retry
5. ✅ 3DS authentication flow
6. ✅ Partial authorization accepted
7. ✅ Partial authorization rejected
8. ✅ Fraud detection and alert

**Coverage:** 100%

---

## Integration Points

### Downstream
- **Payment Gateway:** Stripe/Razorpay
- **PostgreSQL:** Payment records
- **Email Service:** Fraud alerts
- **Notification Service:** Customer notifications

---

## Deployment Configuration

**Task Queue:** `foodbot-payments-queue`

**Worker Configuration:**
- Max concurrent workflows: 15
- Max concurrent activities: 30

**Environment Variables:**
```bash
PAYMENT_GATEWAY_API_KEY=sk_live_...
PAYMENT_GATEWAY_URL=https://api.stripe.com/v1
DATABASE_URL=postgresql://...
FRAUD_ALERT_EMAIL=security@foodbot.com
```

---

## Monitoring & Observability

### Metrics
- `workflow.process_payment.duration`
- `workflow.process_payment.success_rate`
- `workflow.process_payment.decline_rate`
- `workflow.process_payment.fraud_rate`
- `workflow.process_payment.3ds_rate`
- `workflow.process_payment.partial_auth_rate`

### Alerts
- High decline rate (> 20%)
- Gateway error rate (> 5%)
- Fraud detection spike
- Workflow timeout rate (> 1%)

---

## Related Documentation

- [Payment Gateway Integration](../../architecture/integration/payment-gateway.md)
- [Fraud Detection System](../../architecture/integration/fraud-detection.md)

---

**Last Updated:** 2026-02-20
**Implemented By:** Workflows Package Team

# WF-005 & WF-006: Onboarding Workflows

**Status:** Implemented ✅
**Priority:** Medium
**Category:** Workflows - User Engagement
**Package:** `@foodbot/workflows`

---

## WF-005: User Onboarding Workflow

### Overview
Multi-day engagement sequence for new users with timed emails and first-order incentives.

**Duration:** Up to 11 days
**Type:** Long-running workflow with signals

---

### Functional Requirements

#### FR-WF-005-01: Welcome Email (Day 0)
- Send immediately on user registration
- Include platform introduction
- Send in-app notification

**Implementation:** `sendEmail`, `notifyCustomer` activities

#### FR-WF-005-02: Getting Started Guide (Day 1)
- Wait 1 day after registration
- Send tips and features guide
- Email content: profile setup, favorites, AI search, notifications

**Implementation:** `sleep('1 day')` + `sendEmail`

#### FR-WF-005-03: First Order Check (Day 4)
- Wait 3 more days (total 4 days)
- Check if user placed an order via signal or database

**Signal:** `orderPlaced(orderId: string)`
**Database Check:** `loadFromDatabase('orders', userId)`

#### FR-WF-005-04: Discount Code (Day 4, if no order)
- Generate unique discount code: `WELCOME{6 random chars}`
- Send 20% off first order email
- Store discount code in database
- Expiration: 7 days

**Implementation:** `generateDiscountCode`, `sendEmail`, `saveToDatabase`

#### FR-WF-005-05: Feedback Request (Day 11)
- Wait 7 more days
- Send feedback request email
- Complete onboarding sequence

**Implementation:** `sleep('7 days')` + `sendEmail`

#### FR-WF-005-06: Onboarding Record Persistence
- Track onboarding progress in database
- Store completed steps, timestamps
- Record first order status, discount sent status

**States:** `in_progress`, `completed`, `failed`

---

### Workflow Input

```typescript
interface UserOnboardingInput {
  userId: string;
  email: string;
  name: string;
}
```

### Workflow Output

```typescript
interface UserOnboardingResult {
  userId: string;
  completedSteps: string[]; // ['welcome_email', 'getting_started_guide', ...]
  firstOrderPlaced: boolean;
  discountSent: boolean;
}
```

---

### Timeline

```
Day 0: Welcome email
Day 1: Getting started guide
Day 4: Discount code (if no order)
Day 11: Feedback request
```

---

### Signals

**Signal:** `orderPlaced(orderId: string)`
- **Trigger:** User places first order
- **Effect:** Skip discount code step
- **Handler:** Sets `hasPlacedOrder = true`

---

### Test Cases
1. ✅ Complete sequence without order
2. ✅ Complete sequence with order placed
3. ✅ Signal received after discount sent
4. ✅ Email delivery failures
5. ✅ Database persistence

**Test File:** `packages/workflows/src/__tests__/userOnboarding.workflow.test.ts`

---

## WF-006: Restaurant Onboarding Workflow

### Overview
Restaurant partner onboarding with email verification, admin approval, payment setup, and activation.

**Duration:** Up to 24 days (with timeouts)
**Type:** Long-running workflow with human-in-the-loop signals

---

### Functional Requirements

#### FR-WF-006-01: Email Verification (Step 1)
- Send verification email to restaurant owner
- Generate verification token (32 chars)
- Wait for `emailVerified` signal
- Timeout: 7 days + 3 day reminder
- **Expiration:** Return `timeout` status after 10 days

**Implementation:** `sendEmail`, `condition(() => isEmailVerified, '7 days')`

#### FR-WF-006-02: Admin Approval (Step 2)
- Send admin review email
- Wait for `adminApproved` or `adminRejected(reason)` signal
- Timeout: 14 days
- **Rejection:** Send rejection email, return `rejected` status

**Implementation:** `sendEmail`, `condition(() => isAdminApproved || isAdminRejected, '14 days')`

#### FR-WF-006-03: Payment Account Setup (Step 3)
- Create Stripe Connect account
- API: `https://api.stripe.com/v1/accounts`
- Account type: Express
- Store account ID in database

**Implementation:** `callExternalAPI`, `updateDatabase`

#### FR-WF-006-04: Welcome Kit (Step 4)
- Send welcome email with:
  - Dashboard access link
  - Menu management guide
  - Order management instructions
  - Analytics dashboard info
  - Support contact details

**Implementation:** `sendEmail`

#### FR-WF-006-05: Restaurant Activation (Step 5)
- Update restaurant status to `active`
- Mark onboarding as complete
- Send activation confirmation email

**Implementation:** `updateDatabase`, `sendEmail`

---

### Workflow Input

```typescript
interface RestaurantOnboardingInput {
  restaurantId: string;
  ownerEmail: string;
  restaurantName: string;
}
```

### Workflow Output

```typescript
interface RestaurantOnboardingResult {
  restaurantId: string;
  status: 'active' | 'rejected' | 'timeout';
  completedSteps: string[];
  paymentAccountId?: string;
}
```

---

### Signals

#### Signal 1: emailVerified
**Trigger:** Owner clicks verification link
**Effect:** Proceed to admin approval

#### Signal 2: adminApproved
**Trigger:** Admin approves restaurant
**Effect:** Proceed to payment setup

#### Signal 3: adminRejected(reason: string)
**Trigger:** Admin rejects restaurant
**Effect:** Send rejection email, end workflow

---

### Onboarding States

```
pending_verification → pending_approval → setting_up_payment → completed
       ↓                      ↓                      ↓
    expired              rejected              failed
```

---

### Timeline

```
Day 0: Verification email sent
Day 0-10: Wait for email verification (with reminder at day 7)
Day 0-14: Wait for admin approval
Day X: Payment account setup (immediate after approval)
Day X: Welcome kit sent
Day X: Restaurant activated
```

---

### Test Cases
1. ✅ Happy path: Complete onboarding
2. ✅ Email verification timeout
3. ✅ Admin rejection
4. ✅ Admin approval timeout
5. ✅ Payment setup failure
6. ✅ Welcome kit delivery

**Test File:** `packages/workflows/src/__tests__/restaurantOnboarding.workflow.test.ts`

---

## Shared Onboarding Configuration

**Task Queue:** `foodbot-onboarding-queue`

**Worker Configuration:**
- Max concurrent workflows: 10
- Max concurrent activities: 20

**Activity Timeouts:** 30s each
**Retry Policy:**
```typescript
{
  initialInterval: '2s',
  backoffCoefficient: 2,
  maximumInterval: '30s',
  maximumAttempts: 3
}
```

---

## Email Templates

All email templates built using template builder functions:
- `buildWelcomeEmailBody(name)`
- `buildGettingStartedBody(name)`
- `buildDiscountEmailBody(name, code)`
- `buildFeedbackEmailBody(name)`
- `buildVerificationEmailBody(restaurantName, token)`
- `buildReminderEmailBody(restaurantName, token)`
- `buildAdminReviewEmailBody(restaurantName, id, email)`
- `buildRejectionEmailBody(restaurantName, reason)`
- `buildWelcomeKitEmailBody(restaurantName)`
- `buildActivationEmailBody(restaurantName)`

---

## Monitoring & Observability

### User Onboarding Metrics
- `workflow.user_onboarding.completion_rate`
- `workflow.user_onboarding.first_order_rate`
- `workflow.user_onboarding.discount_redemption_rate`

### Restaurant Onboarding Metrics
- `workflow.restaurant_onboarding.approval_rate`
- `workflow.restaurant_onboarding.rejection_rate`
- `workflow.restaurant_onboarding.timeout_rate`
- `workflow.restaurant_onboarding.avg_approval_time`

---

## Integration Points

### User Onboarding
- **Upstream:** User Registration Service
- **Downstream:** Email Service, Database, Discount Code Service

### Restaurant Onboarding
- **Upstream:** Restaurant Registration Service
- **Downstream:** Email Service, Stripe Connect, Database, Admin Dashboard

---

## Related Documentation

- [Email Service Integration](../../architecture/integration/email-service.md)
- [Temporal Signals](../../architecture/integration/temporal-signals.md)
- [Discount Code System](../../architecture/integration/discount-codes.md)

---

**Last Updated:** 2026-02-20
**Implemented By:** Workflows Package Team

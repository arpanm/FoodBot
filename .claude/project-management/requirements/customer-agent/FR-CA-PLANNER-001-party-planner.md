# FR-CA-PLANNER-001: Party Planner

**ID**: `FR-CA-PLANNER-001`
**Created**: 2026-02-20
**Status**: 🟡 Pending
**Priority**: Medium
**Assigned To**: Customer Agent Team

---

## Description

Implement an AI-powered party planning feature that helps users plan group orders for parties, gatherings, and events. The system shall accept party details (number of guests, dietary restrictions, budget, event type), recommend suitable restaurants and dishes, calculate quantities, coordinate delivery timing, and support group payment splitting.

**Key Capabilities:**
- Accept party specifications (guests, preferences, budget, timing)
- Recommend restaurants with bulk ordering capabilities
- Suggest dish combinations with quantity calculations
- Coordinate delivery or pickup logistics
- Support payment splitting among attendees
- Track group order status collaboratively

**Use Cases:**
- Birthday parties (20-50 guests)
- Office lunches (10-100 guests)
- Family gatherings (5-20 guests)
- Events and celebrations (50+ guests)

---

## Acceptance Criteria

### Core Functionality
- [ ] Accept party planning inputs (guests, preferences, budget, date/time)
- [ ] Recommend restaurants suitable for bulk orders
- [ ] Suggest dish combinations (appetizers, mains, desserts, beverages)
- [ ] Calculate quantities based on guest count and event type
- [ ] Estimate total cost with breakdown
- [ ] Coordinate delivery timing and location
- [ ] Support payment splitting options

### User Experience
- [ ] Step-by-step conversational planning flow
- [ ] Visual menu preview with images
- [ ] Real-time cost calculation as selections change
- [ ] Dietary restriction filtering (vegetarian, vegan, gluten-free, allergies)
- [ ] Group collaboration (share planning link with attendees)
- [ ] Order summary and confirmation

### Integration
- [ ] MCP integration for restaurant bulk order capabilities
- [ ] LLM-powered recommendations based on party context
- [ ] Calendar integration for scheduling
- [ ] Payment gateway for split payments

---

## Technical Details

### Implementation Approach

**Party Planning Workflow:**
```
1. Gather Party Details
   ├─ Number of guests
   ├─ Event type (birthday, office, family, celebration)
   ├─ Date and time
   ├─ Budget (total or per person)
   ├─ Dietary restrictions
   └─ Delivery location

2. Recommend Restaurants
   ├─ Filter by bulk order support
   ├─ Check minimum order requirements
   ├─ Verify delivery capacity and timing
   └─ Show restaurant ratings and reviews

3. Suggest Dish Combinations
   ├─ Calculate quantities (servings per guest)
   ├─ Balance dish types (appetizers, mains, sides, desserts)
   ├─ Apply dietary restrictions
   └─ Optimize for budget

4. Coordinate Logistics
   ├─ Schedule delivery/pickup time
   ├─ Provide setup instructions
   ├─ Track order status
   └─ Enable real-time updates

5. Payment Splitting
   ├─ Calculate per-person cost
   ├─ Generate payment links for attendees
   ├─ Track who has paid
   └─ Send reminders for pending payments
```

**Data Model:**
```typescript
interface PartyOrder {
  id: string;
  userId: string; // Organizer
  eventType: 'birthday' | 'office' | 'family' | 'celebration' | 'other';
  guestCount: number;
  eventDate: Date;
  budget: {
    total?: number;
    perPerson?: number;
  };
  dietaryRestrictions: string[];
  deliveryAddress: string;
  deliveryTime: Date;

  selectedRestaurant?: Restaurant;
  selectedDishes: PartyDish[];
  totalCost: number;
  status: 'planning' | 'confirmed' | 'ordered' | 'delivered' | 'cancelled';

  paymentSplitting: {
    enabled: boolean;
    perPersonCost: number;
    attendees: PartyAttendee[];
  };

  createdAt: Date;
  updatedAt: Date;
}

interface PartyDish {
  dishId: string;
  name: string;
  quantity: number; // Number of servings or items
  servingSize: number; // Servings per guest
  price: number;
  category: 'appetizer' | 'main' | 'side' | 'dessert' | 'beverage';
  dietary: string[]; // ['vegetarian', 'vegan', 'gluten-free']
}

interface PartyAttendee {
  name: string;
  email: string;
  paymentStatus: 'pending' | 'paid' | 'declined';
  amountDue: number;
  paidAt?: Date;
}
```

**LLM Prompts:**

1. **Party Planning Assistant:**
```typescript
const partyPlanningPrompt = `
You are a party planning assistant helping a user organize a ${eventType}
for ${guestCount} guests with a budget of $${budget}.

Dietary restrictions: ${dietaryRestrictions.join(', ')}

Suggest:
1. Suitable restaurants for bulk orders
2. Dish combinations (appetizers, mains, sides, desserts)
3. Quantity recommendations (servings per guest)
4. Budget breakdown

Focus on variety, dietary compliance, and staying within budget.
`;
```

2. **Quantity Calculation:**
```typescript
function calculateDishQuantity(
  guestCount: number,
  dishCategory: string,
  eventType: string
): number {
  const servingsPerGuest = {
    appetizer: 2, // 2 appetizers per guest
    main: 1.5, // 1.5 mains per guest (some will want seconds)
    side: 1, // 1 side per guest
    dessert: 1, // 1 dessert per guest
    beverage: 2 // 2 beverages per guest
  };

  const multiplier = servingsPerGuest[dishCategory] || 1;
  return Math.ceil(guestCount * multiplier);
}
```

**Payment Splitting:**
```typescript
async function splitPayment(
  partyOrder: PartyOrder,
  attendees: { name: string; email: string }[]
): Promise<PaymentSplitResult> {
  const perPersonCost = partyOrder.totalCost / attendees.length;

  const paymentLinks = await Promise.all(
    attendees.map(attendee =>
      paymentGateway.generatePaymentLink({
        amount: perPersonCost,
        description: `${partyOrder.eventType} - ${partyOrder.eventDate}`,
        recipientEmail: attendee.email,
        orderId: partyOrder.id
      })
    )
  );

  return {
    perPersonCost,
    paymentLinks,
    totalCollected: 0,
    pendingPayments: attendees.length
  };
}
```

### Dependencies
- **Depends on:**
  - FR-CA-SEARCH-001: Restaurant Search (filter by bulk order support)
  - FR-CA-CART-001: Add to Cart (bulk item addition)
  - FR-CA-CHECKOUT-001: Checkout Process (group order checkout)
  - FR-LLM-001: LLM Router (party planning recommendations)
  - FR-MCP-PROVIDER-001: MCP Provider Configuration (restaurant APIs)

- **Blocks:**
  - Advanced personalization features

### Files Affected
- `/apps/gateway-api/src/services/PartyPlannerService.ts` (new)
- `/apps/mobile-app/src/screens/PartyPlannerScreen.tsx` (new)
- `/apps/mobile-app/src/components/PartyPlanner/` (new directory)
- `/packages/llm-router/src/prompts/party-planning-prompts.ts` (new)
- `/services/mcp-adapter/src/party/BulkOrderAdapter.ts` (new)

---

## Implementation Notes

### Progress Log
- 2026-02-20: Requirement created based on advanced feature analysis

### Design Decisions

**Quantity Calculation:**
- Use industry-standard servings per guest (catering guidelines)
- Event type multipliers (office lunches = lighter portions, birthdays = heavier)
- Add 10-15% buffer for unexpected guests or larger appetites

**Payment Splitting:**
- Equal split by default (simplest)
- Support custom splits (organizer pays more, VIP guests pay less)
- Automatic reminders for pending payments (1 day before event)

**Restaurant Selection:**
- Prioritize restaurants with bulk order experience
- Check minimum order requirements (some restaurants require $200+ for bulk)
- Verify delivery capacity (can they handle 50+ servings?)

### Challenges
- **Bulk Order Availability:** Not all restaurants support large orders
  - **Solution:** Partner with restaurants, verify capabilities via MCP
- **Last-Minute Changes:** Guests cancel or dietary restrictions change
  - **Solution:** Allow order modifications up to 24 hours before event
- **Payment Collection:** Some attendees may not pay on time
  - **Solution:** Require organizer to cover unpaid amounts, refund later

### Decisions Made
- Step-by-step conversational flow (easier for users than complex forms)
- LLM-powered recommendations (personalized suggestions)
- Payment splitting as optional feature (not all parties need it)
- 24-hour modification window (balance flexibility and restaurant preparation time)

---

## Testing

### Unit Tests
- [ ] Quantity calculation tests (various guest counts, event types)
- [ ] Budget optimization tests
- [ ] Dietary restriction filtering tests
- [ ] Payment splitting calculation tests
- [ ] LLM prompt generation tests

### Integration Tests
- [ ] End-to-end party planning flow
- [ ] Restaurant bulk order API integration
- [ ] Payment gateway integration (split payments)
- [ ] Calendar integration for scheduling
- [ ] Email notification tests (invites, reminders, confirmations)

### E2E Tests
- [ ] User creates party plan → selects restaurant → reviews order → confirms
- [ ] User shares payment link with attendees → attendees pay → order placed
- [ ] User modifies order 12 hours before event → restaurant notified
- [ ] Delivery tracking for large order

### User Acceptance Tests
- [ ] Plan birthday party for 30 guests with vegetarian restrictions
- [ ] Plan office lunch for 50 guests within $500 budget
- [ ] Split payment among 10 attendees
- [ ] Modify order 24 hours before event

---

## Example Scenarios

### Scenario 1: Birthday Party Planning
```
User: "I'm planning a birthday party for 30 guests next Saturday."

Bot: "Exciting! Let me help you plan. What's your budget for the party?"

User: "$600"

Bot: "Perfect! Are there any dietary restrictions I should know about?"

User: "5 guests are vegetarian"

Bot: "Got it. Based on your preferences, I recommend:

1. **Italian Bistro** - Known for large parties
   - Margherita Pizza (5 large): $80
   - Pepperoni Pizza (5 large): $90
   - Caesar Salad (3 large): $45
   - Garlic Bread (10 orders): $50
   - Tiramisu (30 servings): $120
   **Total: $385** ✅ Under budget

2. **Mexican Cantina** - Party packages available
   - Taco Bar (30 servings): $240
   - Chips & Guac (10 orders): $60
   - Rice & Beans (3 large): $45
   - Churros (30): $90
   **Total: $435** ✅ Under budget

Which option looks good?"
```

### Scenario 2: Payment Splitting
```
User: "I want to split the cost among 10 close friends"

Bot: "Great! The total is $385, so each person would pay $38.50.

I'll create payment links for your friends. Who should I send them to?"

User: [Provides 10 email addresses]

Bot: "Perfect! I've sent payment links to all 10 friends.
     Once everyone pays, we'll place the order automatically.

     Payment Status:
     ✅ Paid: 3/10 ($115.50 collected)
     ⏳ Pending: 7/10

     I'll send reminders 2 days before the event."
```

---

## Links

- Related Requirements:
  - [FR-CA-SEARCH-001: Restaurant Search](./FR-CA-SEARCH-001-restaurant-search.md)
  - [FR-CA-CART-001: Add to Cart](./CUSTOMER-REQ-003-cart-management.md)
  - [FR-CA-CHECKOUT-001: Checkout Process](./CUSTOMER-REQ-004-order-management.md)
  - [FR-LLM-001: LLM Router](../llm/search-requirements.md)

- Related Tasks:
  - `TASK-FRONTEND-015`: Build party planner UI
  - `TASK-BACKEND-022`: Implement party planning service
  - `TASK-BACKEND-023`: Payment splitting integration
  - `TASK-BACKEND-024`: Bulk order MCP adapter

- Documentation:
  - Catering Industry Standards (servings per guest)
  - Payment Splitting Best Practices

---

**Last Updated**: 2026-02-20
**Updated By**: Claude (AI Agent - Requirement Analysis)

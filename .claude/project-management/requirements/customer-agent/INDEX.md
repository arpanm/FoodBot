# Customer Agent Requirements - Document Index

**Last Updated:** 2026-02-20
**Version:** 1.0

---

## Quick Navigation

### 📋 Start Here
- [Overview](./overview.md) - Complete requirements overview with implementation status
- [Requirements Organization](./REQUIREMENTS_ORGANIZATION.md) - Document types and usage guide

### 📊 Summary Documents
- [Customer Requirements Summary](./CUSTOMER-REQUIREMENTS-SUMMARY.md) - High-level stakeholder summary
- [Project-Wide Functional Requirements](../functional-requirements.md) - All functional requirements
- [Project-Wide Technical Requirements](../technical-requirements.md) - Technical specifications

---

## Requirement Specifications (FR-CA)

**Purpose:** Formal product specifications with acceptance criteria
**Audience:** Product managers, architects, stakeholders

### User Interface
- [FR-CA-UI-001: Rich Chatbot Interface](./FR-CA-UI-001-rich-chatbot-interface.md) - ✅ Complete
- [FR-CA-UI-002: Real-Time Status Updates](./FR-CA-UI-002-realtime-status-updates.md) - ✅ Complete

### Search & Discovery
- [FR-CA-SEARCH-001: Restaurant Search](./FR-CA-SEARCH-001-restaurant-search.md) - ✅ Complete

### To Be Created (Pending)
- FR-CA-CART-001: Cart Management
- FR-CA-ORDER-001: Order Management
- FR-CA-ACCOUNT-001: Account Linking
- FR-CA-DETAIL-001: Restaurant Details
- FR-CA-CHECKOUT-001: Checkout Process
- FR-CA-PAYMENT-001: Payment Integration

---

## Implementation Documentation (CUSTOMER-REQ)

**Purpose:** Detailed development tracking with technical specifications
**Audience:** Developers, QA engineers

### Implemented Features
- [CUSTOMER-REQ-001: Chat Interface](./CUSTOMER-REQ-001-chat-interface.md)
  - Status: ✅ Complete
  - Components: 6 (Chat, Message, Input, CTA, Form, Loading)
  - Tests: 11 test files
  - Related Spec: [FR-CA-UI-001](./FR-CA-UI-001-rich-chatbot-interface.md)

- [CUSTOMER-REQ-002: Restaurant Search](./CUSTOMER-REQ-002-restaurant-search.md)
  - Status: ✅ Complete
  - Components: 5 (List, Card, Detail, Search, Filter)
  - Tests: 5 test files
  - Related Spec: [FR-CA-SEARCH-001](./FR-CA-SEARCH-001-restaurant-search.md)

- [CUSTOMER-REQ-003: Cart Management](./CUSTOMER-REQ-003-cart-management.md)
  - Status: ✅ Complete
  - Components: 3 (List, Item, Summary)
  - Tests: 3 test files
  - Related Spec: Pending (FR-CA-CART-001)

- [CUSTOMER-REQ-004: Order Management](./CUSTOMER-REQ-004-order-management.md)
  - Status: ✅ Complete
  - Components: 6 (List, Card, Detail, Tracking, Status, Progress)
  - Tests: 6 test files
  - Related Spec: Pending (FR-CA-ORDER-001)

- [CUSTOMER-REQ-006: Account Linking](./CUSTOMER-REQ-006-account-linking.md)
  - Status: ✅ Complete
  - Related Spec: Pending (FR-CA-ACCOUNT-001)

---

## Document Relationships

### Complementary Pairs
```
FR-CA-UI-001 (spec) ←→ CUSTOMER-REQ-001 (implementation)
FR-CA-SEARCH-001 (spec) ←→ CUSTOMER-REQ-002 (implementation)
```

### Specs Without Implementation Docs
```
FR-CA-UI-002 (status updates)
  └─ Implemented in: CUSTOMER-REQ-001 (polling system)
```

### Implementation Docs Without Specs
```
CUSTOMER-REQ-003 (cart) → Need: FR-CA-CART-001
CUSTOMER-REQ-004 (order) → Need: FR-CA-ORDER-001
CUSTOMER-REQ-006 (account) → Need: FR-CA-ACCOUNT-001
```

---

## By Feature Category

### 1. User Interface
**Status:** ✅ Complete
- Chatbot interface (FR-CA-UI-001, CUSTOMER-REQ-001)
- Status updates (FR-CA-UI-002)
- Multi-platform support (overview.md)

### 2. Search & Discovery
**Status:** ✅ Complete
- Restaurant search (FR-CA-SEARCH-001, CUSTOMER-REQ-002)
- Dish search (overview.md)
- Advanced filtering (overview.md)

### 3. Restaurant & Dish Details
**Status:** ✅ Complete (implementation)
- Restaurant details (CUSTOMER-REQ-002)
- Dish details (overview.md)
- Recommendations (overview.md - pending)

### 4. Cart Management
**Status:** ✅ Complete (implementation)
- Add to cart (CUSTOMER-REQ-003)
- Cart operations (CUSTOMER-REQ-003)

### 5. Checkout & Payment
**Status:** 🔄 Partial
- Checkout process (overview.md)
- Payment integration (overview.md)

### 6. Order Management
**Status:** ✅ Complete (implementation)
- Order tracking (CUSTOMER-REQ-004)
- Order operations (CUSTOMER-REQ-004)
- Feedback & ratings (overview.md)

### 7. Account Management
**Status:** ✅ Complete (implementation)
- Account linking (CUSTOMER-REQ-006)
- Address management (overview.md)

### 8. Conversation & Intent
**Status:** 🔄 Partial
- Natural language understanding (overview.md)
- Prompt caching (overview.md - pending)
- User personalization (overview.md - partial)

---

## By Status

### ✅ Complete (39/45)
All major UI components, Redux state management, service layer, custom hooks, restaurant/dish search, cart management, order tracking, address management, feedback submission, and 161 tests passing.

### 🔄 Partial (6/45)
- LLM integration for intent detection
- Vector database for prompt caching
- Neo4j preference graph for personalization
- Recommendation engine
- Invoice generation (PDF)
- Photo upload for feedback
- Frontend checkout flow UI

### 🟡 Pending
- FR-CA-CART-001 specification
- FR-CA-ORDER-001 specification
- FR-CA-ACCOUNT-001 specification

---

## By Priority

### High Priority
- FR-CA-UI-001: Rich Chatbot Interface ✅
- FR-CA-UI-002: Real-Time Status Updates ✅
- FR-CA-SEARCH-001: Restaurant Search ✅
- CUSTOMER-REQ-001: Chat Interface ✅
- CUSTOMER-REQ-002: Restaurant Search ✅
- CUSTOMER-REQ-003: Cart Management ✅
- CUSTOMER-REQ-004: Order Management ✅

### Medium Priority
- Advanced filtering ✅
- Recommendations 🔄
- Feedback & ratings ✅

### Low Priority
- Multi-language support 🟡
- Voice input 🟡
- Offline support 🟡

---

## Test Coverage

### Unit Tests
- Total Test Suites: 28
- Total Tests: 161
- Status: ✅ All Passing
- Coverage: >80% across components

### Component Tests
- Chat: 11 tests (6 test files)
- Restaurant: 5 tests
- Dish: 3 tests
- Cart: 3 tests
- Order: 6 tests
- Status: 2 tests

### Integration Tests
- End-to-end chat flow ✅
- Job polling integration ✅
- Error handling ✅
- Message type rendering ✅

---

## File Locations

### Documentation (this directory)
```
/Users/arpan1.mukherjee/code/FoodBot/.claude/project-management/requirements/customer-agent/
├── INDEX.md (this file)
├── overview.md
├── REQUIREMENTS_ORGANIZATION.md
├── CUSTOMER-REQUIREMENTS-SUMMARY.md
├── FR-CA-UI-001-rich-chatbot-interface.md
├── FR-CA-UI-002-realtime-status-updates.md
├── FR-CA-SEARCH-001-restaurant-search.md
├── CUSTOMER-REQ-001-chat-interface.md
├── CUSTOMER-REQ-002-restaurant-search.md
├── CUSTOMER-REQ-003-cart-management.md
├── CUSTOMER-REQ-004-order-management.md
└── CUSTOMER-REQ-006-account-linking.md
```

### Implementation Code
```
/Users/arpan1.mukherjee/code/FoodBot/apps/customer-app/src/
├── components/
│   ├── Chat/          # 6 components + tests
│   ├── Restaurant/    # 5 components + tests
│   ├── Dish/          # 3 components + tests
│   ├── Cart/          # 3 components + tests
│   ├── Order/         # 4 components + tests
│   └── Status/        # 2 components + tests
├── store/slices/      # 6 Redux slices
├── services/          # 6 API services
├── hooks/             # 3 custom hooks
└── types/             # Type definitions
```

---

## Analysis Reports

### Consolidation Analysis (2026-02-20)
- [Executive Summary](../../REQUIREMENTS_CONSOLIDATION_REPORT.md)
- [Detailed Analysis](../../archive/prompt-docs/output-summary/REQUIREMENTS_CONSOLIDATION_SUMMARY.md)

**Key Finding:** No true duplicates. FR-CA and CUSTOMER-REQ files serve complementary purposes.

**Conclusion:** Keep both document types with improved cross-referencing.

---

## Usage Guide

### For Product Managers
1. Start with [Overview](./overview.md) for complete picture
2. Review FR-CA-XXX files for formal requirements
3. Check acceptance criteria and dependencies
4. Use for roadmap planning and prioritization

### For Engineers
1. Start with [Requirements Organization](./REQUIREMENTS_ORGANIZATION.md)
2. Use CUSTOMER-REQ-XXX files for implementation details
3. Check file paths, tests, and technical specifications
4. Use for daily development and code reviews

### For QA Engineers
1. Review acceptance criteria in FR-CA-XXX files
2. Check test coverage in CUSTOMER-REQ-XXX files
3. Use for test planning and validation
4. Reference for edge cases and error scenarios

### For Stakeholders
1. Read [Customer Requirements Summary](./CUSTOMER-REQUIREMENTS-SUMMARY.md)
2. Check implementation status in [Overview](./overview.md)
3. Review key metrics (39/45 complete, 161 tests passing)
4. Use for status reporting and decision-making

---

## Contributing

### Adding New Requirements
1. Create FR-CA-{CATEGORY}-{NUMBER}-{name}.md for specification
2. Create CUSTOMER-REQ-{NUMBER}-{name}.md for implementation tracking
3. Add cross-references between the two
4. Update this INDEX.md
5. Update overview.md with new requirement

### Updating Existing Requirements
1. Update both FR-CA and CUSTOMER-REQ files if both exist
2. Update implementation status in overview.md
3. Update test coverage metrics
4. Update cross-references if file names change

### Naming Conventions
- Requirements: `FR-CA-{CATEGORY}-{NUMBER}-{kebab-case-name}.md`
- Implementation: `CUSTOMER-REQ-{NUMBER}-{kebab-case-name}.md`
- Categories: UI, SEARCH, CART, ORDER, CHECKOUT, PAYMENT, ACCOUNT, CONV, ADDR, DETAIL

---

## Change Log

### 2026-02-20
- Created INDEX.md for easy navigation
- Updated overview.md with document organization guide
- Created REQUIREMENTS_ORGANIZATION.md quick reference
- Completed consolidation analysis (no duplicates found)
- Established document type distinction (FR-CA vs CUSTOMER-REQ)

### 2026-02-19
- Completed order tracking implementation (Temporal workflows)
- Added CUSTOMER-REQ-004 documentation
- Updated overview.md with order management status

### 2026-02-17
- Completed all major UI components
- Added FR-CA-UI-001 and FR-CA-UI-002 specifications
- Created CUSTOMER-REQ-001, CUSTOMER-REQ-002, CUSTOMER-REQ-003
- Achieved 161 tests passing milestone

---

## Related Resources

### Project-Wide Documentation
- [Architecture Overview](../../architecture/component-architecture.md)
- [Implementation Status](../../architecture/implementation-status.md)
- [Technical Requirements](../technical-requirements.md)
- [Functional Requirements](../functional-requirements.md)

### Component Documentation
- [Gateway API Requirements](../gateway-api/)
- [MCP Layer Requirements](../mcp-layer/)
- [Restaurant Agent Requirements](../restaurant-agent/)
- [Workflow Requirements](../workflows/)

### Development Resources
- [Development Guardrails](../../../.claude/rules/development-guardrails.md)
- [Code Standards](../../../docs/CODE_STANDARDS.md)
- [Testing Guide](../../../docs/TESTING.md)

---

**Document Maintained By:** Product & Engineering Teams
**Last Review:** 2026-02-20
**Next Review:** 2026-02-27 (weekly)
**Status:** Active Reference Document

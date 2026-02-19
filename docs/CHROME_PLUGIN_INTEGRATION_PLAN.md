# Chrome Plugin Integration Plan - Browser Automation for Swiggy & Zomato

**Created:** 2026-02-19
**Status:** Planning Phase
**Version:** 1.0.0

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Component Design](#3-component-design)
- [4. Job Workflow Design](#4-job-workflow-design)
- [5. DOM Parsing with LLM](#5-dom-parsing-with-llm)
- [6. Implementation Plan](#6-implementation-plan)
- [7. Agent Task Breakdown](#7-agent-task-breakdown)
- [8. Testing Strategy](#8-testing-strategy)
- [9. Security & Privacy](#9-security--privacy)
- [10. Risks & Mitigations](#10-risks--mitigations)

---

## 1. Executive Summary

This document outlines a comprehensive plan to integrate with Swiggy and Zomato using a **Chrome Browser Extension** that automates the ordering process through DOM manipulation, intelligent parsing with LLM assistance, and asynchronous communication with the FoodBot backend.

### Problem Statement

- Swiggy and Zomato do not provide public REST APIs for third-party applications
- MCP (Model Context Protocol) servers are not accessible for programmatic integration
- Users want unified ordering across multiple platforms within FoodBot's conversational interface

### Solution Approach

Build a **Chrome Extension** that:

1. **Receives Job Instructions**: Polls backend API for order jobs created by the chatbot
2. **Automates Browser Actions**: Opens Swiggy/Zomato websites and performs user actions (search, add to cart, checkout)
3. **Understands Dynamic UIs**: Uses DOM parsing + LLM to understand page structure and identify elements
4. **Handles User Interaction**: Prompts user for login, address selection, payment confirmation
5. **Saves Progress**: Continuously syncs job status and data with backend API
6. **Enables Async UX**: Customer app polls backend for job updates and displays progress

### Key Benefits

- ✅ **No API Dependencies**: Works without official APIs or partnerships
- ✅ **User Authentication**: Leverages user's existing logged-in sessions
- ✅ **Dynamic Adaptation**: LLM can adapt to UI changes
- ✅ **Privacy-First**: User credentials never leave the browser
- ✅ **Transparent**: User sees actual ordering process happening

### Success Criteria

- [ ] Chrome extension installs successfully and activates on Swiggy/Zomato domains
- [ ] Job polling mechanism works reliably (< 2s latency)
- [ ] DOM parsing correctly identifies search box, restaurant cards, menu items, cart, checkout
- [ ] LLM successfully guides element selection with 95%+ accuracy
- [ ] Full order workflow completes end-to-end (search → cart → checkout → payment → tracking)
- [ ] Customer app displays real-time progress updates
- [ ] Error handling covers all failure scenarios (login required, out of stock, payment failed)
- [ ] Performance: Job completion within 3 minutes for typical orders

---

## 2. Architecture Overview

### 2.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Customer App (React)                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Chat Interface                                          │ │
│  │  User: "Order pizza from Domino's on Swiggy"            │ │
│  │  Bot: "Starting order... [Progress: Searching]"         │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
                            │ POST /orders/agent-order
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gateway API (NestJS)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  AgentOrderController                                    │ │
│  │  - Creates Job in database (status: pending)            │ │
│  │  - Returns jobId to customer                            │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                   ┌────────┴─────────┐
                   │                  │
                   ▼                  ▼
         ┌─────────────────┐  ┌─────────────────┐
         │   PostgreSQL    │  │      Redis      │
         │  Job Storage    │  │  Job Queue      │
         └─────────────────┘  └─────────────────┘
                   │                  │
                   │                  │
                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Chrome Extension (Background Script)            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  1. Poll: GET /jobs/pending (every 2s)                  │ │
│  │  2. Fetch job details: GET /jobs/:jobId                 │ │
│  │  3. Execute job workflow (see Job Workflow section)     │ │
│  │  4. Update job status: PATCH /jobs/:jobId/status        │ │
│  │  5. Save extracted data: POST /jobs/:jobId/data         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Content Script (Injected into Swiggy/Zomato pages)     │ │
│  │  - DOM parsing and element identification               │ │
│  │  - User action simulation (click, type, scroll)         │ │
│  │  - Data extraction (restaurant names, prices, etc.)     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  LLM Context Analyzer                                    │ │
│  │  - Sends DOM snapshot to Claude API                     │ │
│  │  - Receives element selectors and action instructions   │ │
│  │  - Caches patterns for similar pages                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Automates
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Swiggy/Zomato Website                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  User sees extension performing actions:                │ │
│  │  - Search for "Domino's Pizza"                          │ │
│  │  - Open restaurant page                                 │ │
│  │  - Add items to cart                                    │ │
│  │  - Proceed to checkout                                  │ │
│  │  - User completes payment manually                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Communication Flow

```
Customer App                Gateway API              Chrome Extension        Swiggy/Zomato
     │                           │                           │                     │
     │ 1. POST /orders/agent     │                           │                     │
     │ { query: "pizza",         │                           │                     │
     │   platform: "swiggy" }    │                           │                     │
     │──────────────────────────>│                           │                     │
     │                           │ 2. Create Job              │                     │
     │                           │    INSERT INTO jobs        │                     │
     │                           │    (status: pending)       │                     │
     │                           │                           │                     │
     │ 3. { jobId: "abc123" }    │                           │                     │
     │<──────────────────────────│                           │                     │
     │                           │                           │                     │
     │ 4. Poll job status        │                           │                     │
     │    GET /jobs/abc123       │                           │ 5. Poll pending jobs│
     │──────────────────────────>│                           │    GET /jobs/pending│
     │                           │                           │<────────────────────│
     │                           │                           │                     │
     │                           │ 6. { jobId: "abc123",     │                     │
     │                           │    platform: "swiggy",    │                     │
     │                           │    action: "search",      │                     │
     │                           │    query: "pizza" }       │                     │
     │                           │──────────────────────────>│                     │
     │                           │                           │ 7. Open swiggy.com  │
     │                           │                           │────────────────────>│
     │                           │                           │                     │
     │                           │                           │ 8. Parse DOM        │
     │                           │                           │<────────────────────│
     │                           │                           │                     │
     │                           │                           │ 9. Type "pizza"     │
     │                           │                           │    in search box    │
     │                           │                           │────────────────────>│
     │                           │                           │                     │
     │                           │                           │ 10. Click search    │
     │                           │                           │────────────────────>│
     │                           │                           │                     │
     │                           │                           │ 11. Extract results │
     │                           │                           │<────────────────────│
     │                           │                           │                     │
     │                           │ 12. PATCH /jobs/abc123    │                     │
     │                           │     { status: "searching",│                     │
     │                           │       data: {...} }       │                     │
     │                           │<──────────────────────────│                     │
     │                           │                           │                     │
     │ 13. Poll: { status:       │                           │                     │
     │     "searching",          │                           │                     │
     │     message: "Found 15    │                           │                     │
     │     restaurants" }        │                           │                     │
     │<──────────────────────────│                           │                     │
     │                           │                           │                     │
     │ (Continue until order completion...)                  │                     │
```

---

## 3. Component Design

### 3.1 Chrome Extension Structure

```
chrome-extension/
├── manifest.json                 # Extension configuration
├── background/
│   ├── service-worker.ts        # Background service worker
│   ├── job-poller.ts            # Polls backend for pending jobs
│   ├── job-executor.ts          # Orchestrates job execution
│   └── api-client.ts            # Backend API communication
├── content-scripts/
│   ├── swiggy-content.ts        # Content script for swiggy.com
│   ├── zomato-content.ts        # Content script for zomato.com
│   ├── dom-parser.ts            # DOM parsing utilities
│   └── action-simulator.ts      # Simulates user actions
├── llm/
│   ├── claude-client.ts         # Claude API client
│   ├── context-builder.ts       # Builds LLM context from DOM
│   └── selector-cache.ts        # Caches learned selectors
├── ui/
│   ├── popup.html               # Extension popup UI
│   ├── popup.ts                 # Popup logic
│   └── styles.css               # Popup styles
├── shared/
│   ├── types.ts                 # Shared TypeScript types
│   ├── constants.ts             # Constants
│   └── logger.ts                # Logging utility
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### 3.2 Backend Job API

#### Job Entity

```typescript
// apps/gateway-api/src/jobs/entities/job.entity.ts
export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  AWAITING_USER_ACTION = 'awaiting_user_action',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobAction {
  SEARCH_RESTAURANT = 'search_restaurant',
  OPEN_RESTAURANT = 'open_restaurant',
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT = 'checkout',
  TRACK_ORDER = 'track_order',
}

@Entity('agent_jobs')
export class AgentJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
  status: JobStatus;

  @Column({ type: 'enum', enum: JobAction })
  action: JobAction;

  @Column()
  platform: string; // 'swiggy' | 'zomato'

  @Column({ type: 'jsonb' })
  payload: {
    query?: string;
    restaurantId?: string;
    items?: Array<{ dishId: string; quantity: number }>;
    deliveryAddress?: Address;
  };

  @Column({ type: 'jsonb', nullable: true })
  result: {
    restaurants?: Restaurant[];
    orderId?: string;
    trackingUrl?: string;
    error?: string;
  };

  @Column({ type: 'text', nullable: true })
  currentStep: string; // e.g., "Searching restaurants", "Adding to cart"

  @Column({ type: 'int', default: 0 })
  progress: number; // 0-100

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
```

#### Job API Endpoints

```typescript
// apps/gateway-api/src/jobs/jobs.controller.ts
@Controller('/jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {

  // Create a new agent job
  @Post()
  async createJob(
    @CurrentUser() user: User,
    @Body() dto: CreateJobDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.createJob({
      userId: user.id,
      action: dto.action,
      platform: dto.platform,
      payload: dto.payload,
    });

    return this.jobMapper.toDto(job);
  }

  // Poll for pending jobs (used by Chrome extension)
  @Get('/pending')
  async getPendingJobs(
    @Query('limit') limit = 10,
  ): Promise<JobResponseDto[]> {
    const jobs = await this.jobsService.findPendingJobs(limit);
    return jobs.map(this.jobMapper.toDto);
  }

  // Get job details
  @Get(':jobId')
  async getJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.findById(jobId);

    if (job.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return this.jobMapper.toDto(job);
  }

  // Update job status (used by Chrome extension)
  @Patch(':jobId/status')
  async updateJobStatus(
    @Param('jobId') jobId: string,
    @Body() dto: UpdateJobStatusDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.updateStatus(
      jobId,
      dto.status,
      dto.currentStep,
      dto.progress,
    );

    return this.jobMapper.toDto(job);
  }

  // Save job result data (used by Chrome extension)
  @Post(':jobId/data')
  async saveJobData(
    @Param('jobId') jobId: string,
    @Body() dto: SaveJobDataDto,
  ): Promise<void> {
    await this.jobsService.updateResult(jobId, dto.result);
  }

  // Cancel a job
  @Delete(':jobId')
  async cancelJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.jobsService.cancelJob(jobId, user.id);
  }
}
```

---

## 4. Job Workflow Design

### 4.1 Job Execution State Machine

```
                     ┌──────────┐
                     │ PENDING  │
                     └─────┬────┘
                           │
                           │ Extension polls and picks up job
                           ▼
                     ┌──────────────┐
                     │ IN_PROGRESS  │
                     └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌────────────┐    ┌────────────┐
  │ Searching│      │ Adding     │    │ Checking   │
  │ Restaurants      │ to Cart    │    │ Out        │
  └─────┬────┘      └─────┬──────┘    └─────┬──────┘
        │                  │                  │
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────────────────────────────────────────┐
  │         AWAITING_USER_ACTION                 │
  │  - Not logged in → prompt user to login      │
  │  - Address needed → ask user to select       │
  │  - Payment → user completes payment          │
  └──────┬───────────────────────────────────────┘
        │
        │ User action completed
        ▼
  ┌──────────────┐
  │  COMPLETED   │  ──┐
  └──────────────┘    │
                      │
  ┌──────────────┐    │  Final States
  │    FAILED    │  ──┤
  └──────────────┘    │
                      │
  ┌──────────────┐    │
  │  CANCELLED   │  ──┘
  └──────────────┘
```

### 4.2 Workflow Steps

#### Step 1: Search Restaurants

```typescript
// chrome-extension/content-scripts/swiggy-content.ts
async function executeSearchWorkflow(job: AgentJob): Promise<void> {
  const { query } = job.payload;

  // Update job status
  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.IN_PROGRESS,
    currentStep: 'Searching for restaurants',
    progress: 10,
  });

  // Step 1: Find search input box
  const searchInput = await findSearchInput();
  if (!searchInput) {
    throw new Error('Search input not found');
  }

  // Step 2: Type search query
  await typeIntoInput(searchInput, query);
  await apiClient.updateJobStatus(job.id, {
    currentStep: 'Typing search query',
    progress: 30,
  });

  // Step 3: Submit search
  await clickSearchButton();
  await apiClient.updateJobStatus(job.id, {
    currentStep: 'Submitting search',
    progress: 50,
  });

  // Step 4: Wait for results to load
  await waitForResults();
  await apiClient.updateJobStatus(job.id, {
    currentStep: 'Loading results',
    progress: 70,
  });

  // Step 5: Extract restaurant data
  const restaurants = await extractRestaurants();
  await apiClient.saveJobData(job.id, {
    result: { restaurants },
  });

  // Step 6: Complete job
  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.COMPLETED,
    currentStep: 'Search completed',
    progress: 100,
  });
}

async function findSearchInput(): Promise<HTMLInputElement | null> {
  // Try common selectors first (cached patterns)
  const cachedSelector = await selectorCache.get('swiggy', 'search-input');
  if (cachedSelector) {
    const element = document.querySelector<HTMLInputElement>(cachedSelector);
    if (element) return element;
  }

  // Fall back to LLM-based detection
  const domSnapshot = buildDOMSnapshot();
  const selector = await claudeClient.identifyElement(domSnapshot, {
    elementType: 'search-input',
    description: 'Search box where users type restaurant or food queries',
    expectedAttributes: ['placeholder', 'type="text"'],
  });

  // Cache the learned selector
  await selectorCache.set('swiggy', 'search-input', selector);

  return document.querySelector<HTMLInputElement>(selector);
}
```

#### Step 2: Open Restaurant & Add to Cart

```typescript
async function executeAddToCartWorkflow(job: AgentJob): Promise<void> {
  const { restaurantId, items } = job.payload;

  // Step 1: Navigate to restaurant page
  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.IN_PROGRESS,
    currentStep: 'Opening restaurant page',
    progress: 10,
  });

  const restaurantUrl = `https://www.swiggy.com/restaurants/${restaurantId}`;
  await navigateToUrl(restaurantUrl);

  // Step 2: Wait for menu to load
  await waitForMenuLoad();
  await apiClient.updateJobStatus(job.id, {
    currentStep: 'Menu loaded',
    progress: 30,
  });

  // Step 3: Add items to cart
  for (const [index, item] of items.entries()) {
    const progress = 30 + ((index + 1) / items.length) * 50;

    await apiClient.updateJobStatus(job.id, {
      currentStep: `Adding ${item.dishId} to cart`,
      progress,
    });

    const dishElement = await findDishById(item.dishId);
    if (!dishElement) {
      throw new Error(`Dish ${item.dishId} not found`);
    }

    const addButton = await findAddButton(dishElement);
    await clickElement(addButton);

    // If quantity > 1, increment
    for (let i = 1; i < item.quantity; i++) {
      const incrementButton = await findIncrementButton(dishElement);
      await clickElement(incrementButton);
    }

    await delay(500); // Wait for cart animation
  }

  // Step 4: Verify cart
  const cartItems = await getCartItems();
  await apiClient.saveJobData(job.id, {
    result: { cartItems },
  });

  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.COMPLETED,
    currentStep: 'Items added to cart',
    progress: 100,
  });
}
```

#### Step 3: Checkout

```typescript
async function executeCheckoutWorkflow(job: AgentJob): Promise<void> {
  const { deliveryAddress } = job.payload;

  // Step 1: Click "Proceed to Checkout"
  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.IN_PROGRESS,
    currentStep: 'Proceeding to checkout',
    progress: 10,
  });

  const checkoutButton = await findCheckoutButton();
  await clickElement(checkoutButton);

  // Step 2: Check if user is logged in
  await delay(1000);
  const isLoggedIn = await checkLoginStatus();

  if (!isLoggedIn) {
    // Prompt user to log in
    await apiClient.updateJobStatus(job.id, {
      status: JobStatus.AWAITING_USER_ACTION,
      currentStep: 'Please log in to Swiggy to continue',
      progress: 20,
    });

    // Wait for user to log in
    await waitForLogin();

    await apiClient.updateJobStatus(job.id, {
      status: JobStatus.IN_PROGRESS,
      currentStep: 'Logged in successfully',
      progress: 40,
    });
  }

  // Step 3: Select/enter delivery address
  await apiClient.updateJobStatus(job.id, {
    currentStep: 'Setting delivery address',
    progress: 60,
  });

  const addressInput = await findAddressInput();
  await typeIntoInput(addressInput, deliveryAddress.fullAddress);

  // Step 4: Review order
  await apiClient.updateJobStatus(job.id, {
    currentStep: 'Reviewing order',
    progress: 80,
  });

  const orderSummary = await extractOrderSummary();
  await apiClient.saveJobData(job.id, {
    result: { orderSummary },
  });

  // Step 5: User completes payment
  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.AWAITING_USER_ACTION,
    currentStep: 'Please complete payment',
    progress: 90,
  });

  // Wait for payment completion
  await waitForPaymentSuccess();

  // Step 6: Extract order ID
  const orderId = await extractOrderId();
  await apiClient.saveJobData(job.id, {
    result: { orderId },
  });

  await apiClient.updateJobStatus(job.id, {
    status: JobStatus.COMPLETED,
    currentStep: 'Order placed successfully',
    progress: 100,
  });
}
```

---

## 5. DOM Parsing with LLM

### 5.1 Context Building

```typescript
// chrome-extension/llm/context-builder.ts
export function buildDOMSnapshot(): DOMSnapshot {
  // Get all interactive elements
  const interactiveElements = document.querySelectorAll(
    'input, button, a, [role="button"], [role="link"], [data-testid], [aria-label]'
  );

  const snapshot = {
    url: window.location.href,
    title: document.title,
    elements: Array.from(interactiveElements).map((el, index) => ({
      index,
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      className: el.className,
      textContent: el.textContent?.trim().substring(0, 100),
      attributes: getRelevantAttributes(el),
      position: el.getBoundingClientRect(),
      isVisible: isElementVisible(el),
    })),
  };

  return snapshot;
}

function getRelevantAttributes(element: Element): Record<string, string> {
  const relevant = [
    'type', 'placeholder', 'aria-label', 'aria-labelledby',
    'data-testid', 'name', 'value', 'role', 'href',
  ];

  const attributes: Record<string, string> = {};
  for (const attr of relevant) {
    const value = element.getAttribute(attr);
    if (value) {
      attributes[attr] = value;
    }
  }

  return attributes;
}
```

### 5.2 LLM-Based Element Identification

```typescript
// chrome-extension/llm/claude-client.ts
export class ClaudeClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  async identifyElement(
    domSnapshot: DOMSnapshot,
    query: ElementQuery,
  ): Promise<string> {
    const prompt = `You are helping automate browser interactions on ${domSnapshot.url}.

Here is a snapshot of the page's interactive elements:

${JSON.stringify(domSnapshot.elements, null, 2)}

Task: Identify the CSS selector for the following element:
- Type: ${query.elementType}
- Description: ${query.description}
- Expected attributes: ${query.expectedAttributes?.join(', ')}

Return ONLY the CSS selector string (e.g., "input[placeholder='Search']" or "#search-box").
If multiple candidates exist, choose the most specific one that's visible.`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    const selector = data.content[0].text.trim();

    // Validate selector
    if (!document.querySelector(selector)) {
      throw new Error(`Invalid selector returned: ${selector}`);
    }

    return selector;
  }

  async extractStructuredData(
    html: string,
    schema: DataSchema,
  ): Promise<any> {
    const prompt = `Extract the following data from this HTML:

Schema:
${JSON.stringify(schema, null, 2)}

HTML:
${html}

Return ONLY valid JSON matching the schema.`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    return JSON.parse(data.content[0].text.trim());
  }
}
```

### 5.3 Selector Caching

```typescript
// chrome-extension/llm/selector-cache.ts
export class SelectorCache {
  private cache = new Map<string, CachedSelector>();

  async get(platform: string, elementType: string): Promise<string | null> {
    const key = `${platform}:${elementType}`;
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cached selector still works
    const element = document.querySelector(cached.selector);
    if (element && isElementVisible(element)) {
      return cached.selector;
    }

    // Selector no longer valid, remove from cache
    this.cache.delete(key);
    return null;
  }

  async set(
    platform: string,
    elementType: string,
    selector: string,
  ): Promise<void> {
    const key = `${platform}:${elementType}`;
    this.cache.set(key, {
      selector,
      learnedAt: new Date(),
      useCount: 0,
    });

    // Persist to chrome.storage
    await chrome.storage.local.set({ [key]: selector });
  }
}
```

---

## 6. Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### Agent Tasks

1. **Setup Chrome Extension Project**
   - **Agent**: `code-agent`
   - **Input**: "Create Chrome extension project with TypeScript, Webpack, manifest v3"
   - **Files**: `manifest.json`, `webpack.config.js`, `tsconfig.json`
   - **Duration**: 4 hours

2. **Backend Job API Implementation**
   - **Agent**: `code-agent`
   - **Input**: "Create Job entity, JobsController, JobsService in Gateway API"
   - **Files**:
     - `apps/gateway-api/src/jobs/entities/job.entity.ts`
     - `apps/gateway-api/src/jobs/jobs.controller.ts`
     - `apps/gateway-api/src/jobs/jobs.service.ts`
   - **Duration**: 2 days

3. **Job Polling Mechanism**
   - **Agent**: `code-agent`
   - **Input**: "Implement background service worker that polls /jobs/pending every 2s"
   - **Files**: `chrome-extension/background/job-poller.ts`
   - **Duration**: 1 day

4. **API Client for Extension**
   - **Agent**: `code-agent`
   - **Input**: "Create REST API client for extension to communicate with Gateway API"
   - **Files**: `chrome-extension/background/api-client.ts`
   - **Duration**: 4 hours

---

### Phase 2: DOM Automation (Week 3-4)

#### Agent Tasks

5. **Content Script for Swiggy**
   - **Agent**: `code-agent`
   - **Input**: "Create content script that injects into swiggy.com and provides DOM access"
   - **Files**: `chrome-extension/content-scripts/swiggy-content.ts`
   - **Duration**: 2 days

6. **DOM Parser Utility**
   - **Agent**: `code-agent`
   - **Input**: "Create DOM parser that builds snapshot of interactive elements"
   - **Files**: `chrome-extension/content-scripts/dom-parser.ts`
   - **Duration**: 1 day

7. **Action Simulator**
   - **Agent**: `code-agent`
   - **Input**: "Create action simulator that can click, type, scroll with human-like delays"
   - **Files**: `chrome-extension/content-scripts/action-simulator.ts`
   - **Duration**: 1 day

8. **Element Finder**
   - **Agent**: `code-agent`
   - **Input**: "Create utility to find elements by text, role, attributes with retry logic"
   - **Files**: `chrome-extension/content-scripts/element-finder.ts`
   - **Duration**: 1 day

---

### Phase 3: LLM Integration (Week 5)

#### Agent Tasks

9. **Claude API Client**
   - **Agent**: `code-agent`
   - **Input**: "Create Claude API client for element identification and data extraction"
   - **Files**: `chrome-extension/llm/claude-client.ts`
   - **Duration**: 1 day

10. **Context Builder**
    - **Agent**: `code-agent`
    - **Input**: "Create context builder that generates prompts from DOM snapshots"
    - **Files**: `chrome-extension/llm/context-builder.ts`
    - **Duration**: 1 day

11. **Selector Cache**
    - **Agent**: `code-agent`
    - **Input**: "Implement selector cache with chrome.storage persistence"
    - **Files**: `chrome-extension/llm/selector-cache.ts`
    - **Duration**: 4 hours

---

### Phase 4: Workflow Implementation (Week 6-7)

#### Agent Tasks

12. **Search Workflow**
    - **Agent**: `code-agent`
    - **Input**: "Implement search workflow: find search box, type query, extract results"
    - **Files**: `chrome-extension/workflows/search-workflow.ts`
    - **Duration**: 2 days

13. **Add to Cart Workflow**
    - **Agent**: `code-agent`
    - **Input**: "Implement add-to-cart workflow: navigate to restaurant, find dishes, add to cart"
    - **Files**: `chrome-extension/workflows/cart-workflow.ts`
    - **Duration**: 2 days

14. **Checkout Workflow**
    - **Agent**: `code-agent`
    - **Input**: "Implement checkout workflow: proceed to checkout, handle login, set address"
    - **Files**: `chrome-extension/workflows/checkout-workflow.ts`
    - **Duration**: 2 days

15. **Order Tracking Workflow**
    - **Agent**: `code-agent`
    - **Input**: "Implement order tracking: extract order ID, fetch status, update job"
    - **Files**: `chrome-extension/workflows/tracking-workflow.ts`
    - **Duration**: 1 day

---

### Phase 5: User Interaction (Week 8)

#### Agent Tasks

16. **Login Prompt UI**
    - **Agent**: `code-agent`
    - **Input**: "Create popup UI that prompts user to log in when needed"
    - **Files**: `chrome-extension/ui/login-prompt.html`, `login-prompt.ts`
    - **Duration**: 1 day

17. **Address Selection UI**
    - **Agent**: `code-agent`
    - **Input**: "Create UI for user to select or enter delivery address"
    - **Files**: `chrome-extension/ui/address-selection.html`
    - **Duration**: 1 day

18. **Payment Notification**
    - **Agent**: `code-agent`
    - **Input**: "Create notification that prompts user to complete payment"
    - **Files**: `chrome-extension/ui/payment-prompt.ts`
    - **Duration**: 4 hours

---

### Phase 6: Customer App Integration (Week 9)

#### Agent Tasks

19. **Job Status Polling in Customer App**
    - **Agent**: `code-agent`
    - **Input**: "Implement useJobPoller hook that polls job status and displays progress"
    - **Files**: `apps/customer-app/src/hooks/useJobPoller.ts`
    - **Duration**: 1 day

20. **Progress UI Component**
    - **Agent**: `code-agent`
    - **Input**: "Create ProgressTracker component showing job steps and current status"
    - **Files**: `apps/customer-app/src/components/ProgressTracker.tsx`
    - **Duration**: 1 day

21. **Order Confirmation UI**
    - **Agent**: `code-agent`
    - **Input**: "Create OrderConfirmation component showing order ID and tracking link"
    - **Files**: `apps/customer-app/src/components/OrderConfirmation.tsx`
    - **Duration**: 4 hours

---

### Phase 7: Testing & Polish (Week 10-11)

#### Agent Tasks

22. **Unit Tests**
    - **Agent**: `test-agent`
    - **Input**: "Write unit tests for all extension utilities and workflows"
    - **Coverage Target**: 80%+
    - **Duration**: 3 days

23. **E2E Tests**
    - **Agent**: `test-agent`
    - **Input**: "Write Playwright E2E tests for full order workflow on Swiggy"
    - **Duration**: 2 days

24. **Error Handling**
    - **Agent**: `code-agent`
    - **Input**: "Add comprehensive error handling for all failure scenarios"
    - **Duration**: 2 days

25. **Performance Optimization**
    - **Agent**: `code-agent`
    - **Input**: "Optimize polling frequency, selector caching, DOM parsing"
    - **Duration**: 1 day

---

## 7. Agent Task Breakdown

### Complete Task List

| ID | Agent Type | Task | Input | Output | Duration |
|----|------------|------|-------|--------|----------|
| T1 | code-agent | Setup Chrome extension project | Project requirements | Project structure | 4h |
| T2 | code-agent | Create Job API (backend) | API spec | Controller, Service, Entity | 2d |
| T3 | code-agent | Implement job polling | Polling spec | service-worker.ts | 1d |
| T4 | code-agent | Create API client | API endpoints | api-client.ts | 4h |
| T5 | code-agent | Swiggy content script | Content script requirements | swiggy-content.ts | 2d |
| T6 | code-agent | DOM parser utility | Parsing requirements | dom-parser.ts | 1d |
| T7 | code-agent | Action simulator | Simulation spec | action-simulator.ts | 1d |
| T8 | code-agent | Element finder | Finder requirements | element-finder.ts | 1d |
| T9 | code-agent | Claude API client | API spec | claude-client.ts | 1d |
| T10 | code-agent | Context builder | Context spec | context-builder.ts | 1d |
| T11 | code-agent | Selector cache | Cache requirements | selector-cache.ts | 4h |
| T12 | code-agent | Search workflow | Workflow spec | search-workflow.ts | 2d |
| T13 | code-agent | Cart workflow | Workflow spec | cart-workflow.ts | 2d |
| T14 | code-agent | Checkout workflow | Workflow spec | checkout-workflow.ts | 2d |
| T15 | code-agent | Tracking workflow | Workflow spec | tracking-workflow.ts | 1d |
| T16 | code-agent | Login prompt UI | UI requirements | login-prompt.html/.ts | 1d |
| T17 | code-agent | Address selection UI | UI requirements | address-selection.html | 1d |
| T18 | code-agent | Payment notification | Notification spec | payment-prompt.ts | 4h |
| T19 | code-agent | Job polling hook (React) | Hook requirements | useJobPoller.ts | 1d |
| T20 | code-agent | Progress tracker UI | Component spec | ProgressTracker.tsx | 1d |
| T21 | code-agent | Order confirmation UI | Component spec | OrderConfirmation.tsx | 4h |
| T22 | test-agent | Unit tests | Code files | Test files | 3d |
| T23 | test-agent | E2E tests | Workflows | Playwright tests | 2d |
| T24 | code-agent | Error handling | Error scenarios | Try-catch blocks | 2d |
| T25 | code-agent | Performance optimization | Performance metrics | Optimized code | 1d |

**Total Duration:** 11 weeks

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// chrome-extension/tests/unit/action-simulator.test.ts
describe('ActionSimulator', () => {
  let simulator: ActionSimulator;

  beforeEach(() => {
    simulator = new ActionSimulator();
  });

  it('should click element with human-like delay', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const clickSpy = jest.spyOn(button, 'click');

    await simulator.clickElement(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('should type text with realistic timing', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    await simulator.typeIntoInput(input, 'pizza');

    expect(input.value).toBe('pizza');
  });

  it('should scroll element into view smoothly', async () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = () => ({
      top: 1000,
      bottom: 1100,
    } as DOMRect);

    const scrollSpy = jest.spyOn(window, 'scrollTo');

    await simulator.scrollToElement(element);

    expect(scrollSpy).toHaveBeenCalled();
  });
});
```

### 8.2 Integration Tests

```typescript
// chrome-extension/tests/integration/search-workflow.test.ts
describe('Search Workflow Integration', () => {
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockClaudeClient: jest.Mocked<ClaudeClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    mockClaudeClient = createMockClaudeClient();

    // Setup DOM
    document.body.innerHTML = `
      <input id="search" placeholder="Search for restaurants" />
      <button id="search-btn">Search</button>
      <div id="results"></div>
    `;
  });

  it('should complete search workflow end-to-end', async () => {
    const job: AgentJob = {
      id: 'job-123',
      action: JobAction.SEARCH_RESTAURANT,
      platform: 'swiggy',
      payload: { query: 'pizza' },
      status: JobStatus.PENDING,
    };

    mockClaudeClient.identifyElement.mockResolvedValueOnce('#search');
    mockClaudeClient.identifyElement.mockResolvedValueOnce('#search-btn');

    await executeSearchWorkflow(job);

    // Verify API calls
    expect(mockApiClient.updateJobStatus).toHaveBeenCalledWith(
      'job-123',
      expect.objectContaining({
        status: JobStatus.IN_PROGRESS,
        currentStep: 'Searching for restaurants',
      })
    );

    expect(mockApiClient.updateJobStatus).toHaveBeenLastCalledWith(
      'job-123',
      expect.objectContaining({
        status: JobStatus.COMPLETED,
      })
    );
  });
});
```

### 8.3 E2E Tests with Playwright

```typescript
// chrome-extension/tests/e2e/full-order-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Full Order Flow', () => {
  test('should complete order from search to payment', async ({ page, context }) => {
    // Install extension
    const pathToExtension = path.join(__dirname, '../../dist');
    const extensionContext = await context.newContext({
      extensions: [pathToExtension],
    });

    // Step 1: User creates job in customer app
    await page.goto('http://localhost:3001/orders/new');
    await page.fill('[name="query"]', 'Domino\'s Pizza');
    await page.selectOption('[name="platform"]', 'swiggy');
    await page.click('button:has-text("Order")');

    // Verify job created
    const jobId = await page.textContent('[data-testid="job-id"]');
    expect(jobId).toMatch(/^job-/);

    // Step 2: Wait for extension to start processing
    await page.waitForSelector('[data-testid="job-status"]:has-text("In Progress")');

    // Step 3: Verify search step
    await expect(page.locator('[data-testid="current-step"]')).toHaveText(
      'Searching for restaurants'
    );

    // Step 4: Verify results
    await page.waitForSelector('[data-testid="restaurant-results"]', {
      timeout: 30000,
    });

    const restaurantCount = await page.locator('.restaurant-card').count();
    expect(restaurantCount).toBeGreaterThan(0);

    // Step 5: User selects restaurant
    await page.click('.restaurant-card:first-child');

    // Step 6: Extension adds to cart
    await page.waitForSelector('[data-testid="current-step"]:has-text("Adding to cart")');

    // Step 7: Extension proceeds to checkout
    await page.waitForSelector('[data-testid="current-step"]:has-text("Checking out")');

    // Step 8: User may need to log in
    const loginRequired = await page.isVisible('text="Please log in to Swiggy"');
    if (loginRequired) {
      // Test should pause here and wait for manual login
      await page.pause(); // Manual login
    }

    // Step 9: User completes payment
    await page.waitForSelector('text="Please complete payment"');
    await page.pause(); // Manual payment

    // Step 10: Verify order completion
    await page.waitForSelector('[data-testid="job-status"]:has-text("Completed")', {
      timeout: 60000,
    });

    const orderId = await page.textContent('[data-testid="order-id"]');
    expect(orderId).toMatch(/^SWG-/);
  });
});
```

---

## 9. Security & Privacy

### 9.1 Principles

1. **User Credentials Stay in Browser**: Extension never extracts or transmits user passwords
2. **Explicit User Consent**: User must approve extension and grant permissions
3. **Transparent Actions**: User sees all actions being performed in real-time
4. **No Data Scraping**: Only extract data necessary for order fulfillment
5. **Secure Communication**: All API calls use HTTPS with authentication
6. **Data Encryption**: Sensitive job data encrypted in transit and at rest

### 9.2 Chrome Extension Permissions

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "FoodBot Agent",
  "version": "1.0.0",
  "description": "Automates food ordering on Swiggy and Zomato",
  "permissions": [
    "activeTab",         // Access active tab
    "storage",           // Cache selectors
    "notifications"      // Notify user of actions
  ],
  "host_permissions": [
    "https://www.swiggy.com/*",
    "https://www.zomato.com/*",
    "https://api.foodbot.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.swiggy.com/*"],
      "js": ["content-scripts/swiggy-content.js"]
    },
    {
      "matches": ["https://www.zomato.com/*"],
      "js": ["content-scripts/zomato-content.js"]
    }
  ],
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": {
      "16": "images/icon-16.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  }
}
```

### 9.3 Data Privacy

**Data Collected:**
- ✅ Restaurant names, menus, prices (public data)
- ✅ Order IDs and tracking information (necessary for service)
- ✅ Job execution logs (for debugging)

**Data NOT Collected:**
- ❌ User passwords or authentication tokens
- ❌ Payment card numbers or CVV
- ❌ Personal messages or private data
- ❌ Browsing history outside Swiggy/Zomato

**Data Retention:**
- Job data: 30 days
- Execution logs: 7 days
- Selector cache: Until user clears extension data

---

## 10. Risks & Mitigations

### Risk Matrix

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | Platform detects automation (bot detection) | **High** | Critical | Human-like delays, randomization, user-agent rotation |
| R2 | UI changes break selectors | **High** | High | LLM re-learns selectors, fallback to manual mode |
| R3 | Extension permissions rejected by users | Medium | High | Clear privacy policy, transparent UI, minimal permissions |
| R4 | Rate limiting by platform | Medium | Medium | Respect rate limits, exponential backoff |
| R5 | Extension violates Terms of Service | Medium | Critical | Legal review, obtain platform approval if possible |
| R6 | LLM API costs too high | Medium | Medium | Aggressive selector caching, only use LLM when cached selectors fail |
| R7 | Chrome extension store rejection | Low | High | Follow Chrome Web Store policies, provide detailed description |
| R8 | User login expires during job | High | Medium | Detect login expiry, prompt user to re-login |
| R9 | Payment errors | Medium | High | Clear error messages, retry logic, fallback to manual |
| R10 | Job timeout (user doesn't respond) | Medium | Medium | Set reasonable timeouts, notify user, allow cancellation |

### Critical Risk: R1 - Bot Detection

**Analysis**: Swiggy and Zomato may use bot detection mechanisms (Cloudflare, reCAPTCHA, behavioral analysis) that could block automated actions.

**Mitigation Strategies**:

```typescript
// Human-like behavior simulation
const randomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function typeIntoInput(input: HTMLInputElement, text: string): Promise<void> {
  for (const char of text) {
    input.value += char;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Random delay between keystrokes (100-300ms)
    await delay(randomDelay(100, 300));
  }

  // Occasional typo and correction
  if (Math.random() < 0.1) {
    await delay(randomDelay(500, 1000));
    input.value = input.value.slice(0, -1);
    await delay(randomDelay(200, 400));
    input.value += text[text.length - 1];
  }
}

async function scrollToElement(element: HTMLElement): Promise<void> {
  const targetY = element.getBoundingClientRect().top + window.pageYOffset - 100;
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  const duration = randomDelay(500, 1000); // Smooth scroll

  let start: number | null = null;

  const step = (timestamp: number) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);

    window.scrollTo(0, startY + distance * easeInOutCubic(progress));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
```

**Fallback Plan**: If bot detection becomes unbypassable, offer "Semi-Automated Mode" where extension guides the user through steps but user performs clicks manually.

---

## 11. Alternative Approach: Semi-Automated Mode

If full automation faces too many challenges, implement a **guided mode**:

```
┌───────────────────────────────┐
│  Extension Sidebar (Overlay)  │
│                                │
│  Step 1: Search                │
│  ✓ Search box highlighted      │
│  → Type "pizza" here           │
│  → Click Search                │
│                                │
│  [Next Step]                   │
└───────────────────────────────┘
```

**Benefits**:
- Lower risk of bot detection
- Works even with complex CAPTCHAs
- User maintains full control
- Still provides value (guidance + progress tracking)

**Implementation**: Extension overlays instructions and highlights elements, user clicks manually.

---

## 12. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-19 | Use Chrome Extension over browser automation tools (Puppeteer) | Extensions have better access to existing user sessions and lower bot detection risk |
| 2026-02-19 | Integrate Claude LLM for element identification | Dynamic UI requires intelligent parsing; LLM can adapt to changes |
| 2026-02-19 | Implement selector caching | Reduces LLM API costs, improves performance |
| 2026-02-19 | Job-based async architecture | Enables transparent progress tracking in customer app |
| 2026-02-19 | User handles login and payment | Security best practice; extension never accesses credentials |

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Job Success Rate | > 90% | Completed jobs / Total jobs |
| Average Job Duration | < 3 minutes | Time from job creation to completion |
| Selector Cache Hit Rate | > 80% | Cached selectors used / Total element lookups |
| LLM API Cost per Job | < $0.05 | Total Claude API spend / Jobs completed |
| User Satisfaction | > 4.5/5 | Post-job rating |
| Extension Install Rate | > 60% | Installs / Unique visitors |

---

## 14. Next Steps

### Week 1: Proof of Concept

1. **Setup Extension Project**
   - [ ] Initialize TypeScript project
   - [ ] Configure Webpack
   - [ ] Create manifest.json
   - [ ] Test basic extension load

2. **Basic Job API**
   - [ ] Create Job entity and endpoints
   - [ ] Test job creation from Postman
   - [ ] Test job polling

3. **Simple Search Demo**
   - [ ] Content script that finds search box on Swiggy
   - [ ] Type query and extract results
   - [ ] Display results in popup

**Goal**: End-to-end demo of search workflow by end of Week 1

---

**Document Status**: Planning Phase - Ready for Implementation
**Next Review**: After POC completion (Week 1)
**Related Documents**:
- [MCP Research & Feasibility Report](../prompt-docs/MCP_RESEARCH_REPORT.md)
- [REST API Integration Plan](./REST_API_INTEGRATION_PLAN.md)
- [Architecture Documentation](./ARCHITECTURE_FINAL.md)

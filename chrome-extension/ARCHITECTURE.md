# FoodBot Chrome Extension - Architecture Overview

## High-Level Architecture

The FoodBot Chrome Extension uses a job-based architecture to coordinate browser automation tasks with the backend Gateway API.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome Browser                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐              ┌─────────────────────────┐      │
│  │   Popup UI   │              │   Service Worker        │      │
│  │              │◄────────────►│   (Background)          │      │
│  │  - User Input│              │   - Job Poller          │      │
│  │  - Status    │              │   - Job Executor        │      │
│  │  - Settings  │              │   - API Client          │      │
│  └──────────────┘              │   - Message Router      │      │
│         │                      └─────────────────────────┘      │
│         │                                 │                      │
│         │                                 │                      │
│         ▼                                 ▼                      │
│  ┌─────────────────────────────────────────────────┐            │
│  │           Web Page (Swiggy.com)                 │            │
│  │  ┌───────────────────────────────────────────┐  │            │
│  │  │        Content Script                     │  │            │
│  │  │  - DOM Parser                             │  │            │
│  │  │  - Action Simulator                       │  │            │
│  │  │  - Element Finder                         │  │            │
│  │  │  - Workflows (Search, Cart, Checkout)     │  │            │
│  │  └───────────────────────────────────────────┘  │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP Requests
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                    Backend Services                             │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────────────┐       │
│  │  Gateway API    │◄──────►│  LLM Orchestrator        │       │
│  │  - Job Queue    │        │  - Claude Integration    │       │
│  │  - Job Status   │        │  - Decision Engine       │       │
│  └─────────────────┘        └──────────────────────────┘       │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Database       │                                            │
│  │  - Jobs         │                                            │
│  │  - Sessions     │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Popup UI (`src/ui/`)

**Purpose**: User interface for extension interaction

**Files**:
- `popup.html`: Extension popup HTML
- `popup.ts`: Popup logic and event handlers

**Responsibilities**:
- Collect user input (order request)
- Display order status
- Manage settings (API keys, preferences)
- Communicate with background service worker

**Key Features**:
- Form validation
- Status updates in real-time
- Chrome storage integration
- Session management

---

### 2. Background Service Worker (`src/background/`)

**Purpose**: Orchestrate extension operations and communicate with backend

**Files**:
- `service-worker.ts`: Main background script
- `api-client.ts`: Gateway API client
- `job-poller.ts`: Polls for pending jobs
- `job-executor.ts`: Executes jobs on content scripts

**Architecture**:

```
Service Worker
├── Job Poller (Continuous)
│   ├── Poll Gateway API every 2s
│   ├── Fetch pending jobs
│   └── Enqueue for execution
│
├── Job Executor
│   ├── Execute job based on action type
│   ├── Send messages to content script
│   └── Update job status via API
│
├── API Client
│   ├── HTTP request handling
│   ├── Authentication
│   └── Error handling
│
└── Message Router
    ├── Handle messages from popup
    ├── Handle messages from content scripts
    └── Route to appropriate handlers
```

**Job Polling Flow**:

```
1. JobPoller.start()
   ├── Every 2 seconds:
   │   ├── apiClient.getPendingJobs()
   │   ├── Filter by maxConcurrentJobs
   │   └── For each job:
   │       ├── jobExecutor.executeJob(job)
   │       └── Track in currentJobs set
   │
2. JobExecutor.executeJob(job)
   ├── Update status: in_progress
   ├── Determine job.action:
   │   ├── SEARCH_RESTAURANT → executeSearchRestaurant()
   │   ├── SELECT_RESTAURANT → executeSelectRestaurant()
   │   ├── ADD_TO_CART → executeAddToCart()
   │   └── etc.
   ├── Send message to content script
   ├── Wait for response
   ├── Update job status: completed/failed
   └── Return result to API
```

**Responsibilities**:
- **Job Polling**: Continuously check for pending jobs from Gateway API
- **Job Execution**: Execute jobs by coordinating with content scripts
- **State Management**: Track active jobs and sessions
- **API Communication**: Send/receive data from backend
- **Error Handling**: Retry failed jobs, report errors

---

### 3. Content Scripts (`src/content-scripts/`)

**Purpose**: Interact with Swiggy/Zomato web pages and perform automation

**Files**:
- `swiggy-content.ts`: Main content script
- `dom-parser.ts`: Parse DOM structure
- `action-simulator.ts`: Simulate user actions (click, type)
- `element-finder.ts`: Find elements using selectors/AI
- `workflows/`: Pre-built workflows for common tasks
  - `search-workflow.ts`: Restaurant search
  - `cart-workflow.ts`: Cart management
  - `checkout-workflow.ts`: Checkout process

**Architecture**:

```
Content Script
├── DOM Parser
│   ├── Analyze page structure
│   ├── Extract restaurants
│   ├── Extract menu items
│   └── Extract cart data
│
├── Action Simulator
│   ├── Click elements
│   ├── Type text
│   ├── Scroll page
│   └── Wait for elements
│
├── Element Finder
│   ├── Find by selector
│   ├── Find by text content
│   ├── Find by AI description
│   └── Wait for element
│
└── Workflows
    ├── Search Workflow
    ├── Cart Workflow
    └── Checkout Workflow
```

**Content Script Execution Flow**:

```
1. Receive message from background:
   ├── message.type = EXECUTE_ACTION
   ├── message.payload = { action, target, value }
   │
2. Determine action type:
   ├── SEARCH_RESTAURANT
   │   ├── Find search input
   │   ├── Type restaurant name
   │   └── Wait for results
   │
   ├── SELECT_RESTAURANT
   │   ├── Find restaurant card by name
   │   ├── Click on card
   │   └── Wait for menu page
   │
   ├── ADD_TO_CART
   │   ├── Find menu item by name
   │   ├── Click "Add" button
   │   └── Wait for cart update
   │
   └── CHECKOUT
       ├── Click checkout button
       ├── Fill address
       ├── Select payment
       └── Confirm order
   │
3. Execute action:
   ├── Use Action Simulator
   ├── Use Element Finder
   ├── Handle errors/retries
   │
4. Send response to background:
   ├── { success: true, result: ... }
   └── { success: false, error: ... }
```

**Responsibilities**:
- **Page Analysis**: Parse and extract data from web pages
- **Action Execution**: Perform browser actions (click, type, scroll)
- **Element Location**: Find elements using various strategies
- **Workflow Management**: Execute multi-step workflows
- **Error Recovery**: Handle missing elements, timeouts

---

### 4. Shared Code (`src/shared/`)

**Purpose**: Common types, constants, and utilities

**Files**:
- `types.ts`: TypeScript interfaces and enums
- `constants.ts`: Configuration and constants

**Key Types**:

```typescript
// Message Types
enum MessageType {
  START_ORDER,
  EXECUTE_ACTION,
  ANALYZE_PAGE,
  UPDATE_STATUS,
}

// Job Types
interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  action: JobAction;
  platform: string;
  payload: object;
  result?: object;
}

enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

enum JobAction {
  SEARCH_RESTAURANT = 'search_restaurant',
  SELECT_RESTAURANT = 'select_restaurant',
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT = 'checkout',
}

// Browser Action Types
enum BrowserAction {
  CLICK,
  TYPE,
  SCROLL,
  WAIT,
}

interface ActionInstruction {
  action: BrowserAction;
  target?: string;
  value?: any;
  selector?: string;
}
```

---

### 5. LLM Integration (`src/llm/`)

**Purpose**: Claude AI integration for intelligent decision-making

**Files**:
- `claude-client.ts`: Claude API client

**Responsibilities**:
- Build prompts based on page context
- Send requests to Claude API
- Parse AI responses
- Extract action instructions

**Note**: In the job-based architecture, LLM calls are primarily handled by the backend Gateway API. The extension may still use Claude for local decision-making in specific scenarios.

---

## Job-Based Architecture

### Why Job-Based?

The extension uses a job-based architecture to:

1. **Decouple Frontend from Backend**: Extension polls for jobs rather than maintaining persistent connections
2. **Enable Scalability**: Backend can distribute jobs across multiple browser instances
3. **Improve Reliability**: Jobs can be retried, queued, and monitored centrally
4. **Track Progress**: Each job has a status, progress, and result
5. **Support Multiple Platforms**: Same job interface works for Swiggy, Zomato, etc.

### Job Lifecycle

```
1. User Request (Popup)
   ├── User enters order request
   ├── Send to Gateway API
   └── Gateway creates jobs
       │
2. Job Creation (Backend)
   ├── Gateway receives order request
   ├── LLM analyzes request
   ├── Creates series of jobs:
   │   ├── Job 1: search_restaurant
   │   ├── Job 2: select_restaurant
   │   ├── Job 3: add_to_cart (x3)
   │   ├── Job 4: checkout
   │   └── Job 5: confirm_order
   └── Jobs stored with status: PENDING
       │
3. Job Polling (Extension)
   ├── JobPoller polls every 2s
   ├── Fetches pending jobs
   ├── Filters by user/session
   └── Enqueues for execution
       │
4. Job Execution (Extension)
   ├── JobExecutor picks job
   ├── Updates status: IN_PROGRESS
   ├── Sends message to content script
   ├── Content script executes action
   ├── Receives result
   └── Updates job status:
       ├── COMPLETED (with result)
       └── FAILED (with error)
       │
5. Job Monitoring (Backend)
   ├── Gateway tracks job statuses
   ├── LLM analyzes results
   ├── Creates next jobs if needed
   └── Completes order when all jobs done
```

### Job Flow Diagram

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Popup    │────>│   Gateway   │────>│  Job Queue   │────>│  Extension  │
│  (User)    │     │    API      │     │  (Backend)   │     │  (Poller)   │
└────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
                           │                    │                    │
                           ▼                    │                    ▼
                   ┌───────────────┐            │            ┌──────────────┐
                   │ LLM (Claude)  │            │            │   Content    │
                   │  - Analyze    │            │            │   Script     │
                   │  - Plan Jobs  │            │            │  (Execute)   │
                   └───────────────┘            │            └──────────────┘
                                                ▼                    │
                                        Job Updates <────────────────┘
                                        (Status, Result, Error)
```

---

## Communication Patterns

### 1. Popup ↔ Background

**Method**: `chrome.runtime.sendMessage()`

**Example**:
```typescript
// Popup sends message
chrome.runtime.sendMessage({
  type: MessageType.START_ORDER,
  payload: { userMessage: "Order pizza" },
});

// Background receives
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.START_ORDER) {
    // Handle order start
  }
});
```

### 2. Background ↔ Content Script

**Method**: `chrome.tabs.sendMessage()`

**Example**:
```typescript
// Background sends to content script
chrome.tabs.sendMessage(tabId, {
  type: MessageType.EXECUTE_ACTION,
  payload: { action: 'SEARCH_RESTAURANT', value: 'Dominos' },
});

// Content script receives
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.EXECUTE_ACTION) {
    // Execute action
    sendResponse({ success: true, result: {...} });
  }
  return true; // Keep channel open for async
});
```

### 3. Extension ↔ Backend API

**Method**: Fetch API (`fetch()`)

**Example**:
```typescript
// Get pending jobs
const response = await fetch('http://localhost:3000/api/jobs/pending', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
});

const jobs = await response.json();
```

---

## Data Flow

### Complete Order Flow

```
1. User enters order in Popup
   ├── "I want to order a large pepperoni pizza from Domino's"
   │
2. Popup sends to Gateway API
   ├── POST /api/orders
   ├── Body: { userMessage, userId, sessionId }
   │
3. Gateway processes request
   ├── Send to LLM for analysis
   ├── LLM plans steps:
   │   ├── 1. Search for Domino's
   │   ├── 2. Select Domino's restaurant
   │   ├── 3. Find pepperoni pizza
   │   ├── 4. Add to cart (large size)
   │   ├── 5. Checkout
   │   └── 6. Confirm order
   ├── Create jobs for each step
   └── Return session info to popup
   │
4. Extension polls for jobs
   ├── JobPoller fetches pending jobs
   ├── Filter: jobs for this user/session
   ├── Example job:
   │   {
   │     id: "job-123",
   │     action: "search_restaurant",
   │     payload: { query: "Domino's" }
   │   }
   │
5. Extension executes job
   ├── JobExecutor.executeSearchRestaurant()
   ├── Send message to content script
   ├── Content script:
   │   ├── Find search input on Swiggy
   │   ├── Type "Domino's"
   │   ├── Wait for results
   │   └── Extract restaurant list
   ├── Send result back to background
   ├── Background updates job:
   │   ├── status: COMPLETED
   │   └── result: { restaurants: [...] }
   │
6. Repeat for each job
   ├── Backend creates next job based on previous result
   ├── Extension polls and executes
   └── Continue until order complete
   │
7. Order completion
   ├── All jobs completed
   ├── Gateway notifies user
   └── Extension shows success message
```

---

## Error Handling Strategy

### Extension-Level Errors

```typescript
try {
  await executeAction(action);
} catch (error) {
  // Log error
  console.error('Action failed:', error);

  // Report to backend
  await apiClient.updateJobStatus(jobId, {
    status: JobStatus.FAILED,
    error: {
      code: 'ACTION_FAILED',
      message: error.message,
      stack: error.stack,
    },
  });

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    title: 'Action Failed',
    message: 'Unable to complete action. Retrying...',
  });
}
```

### Job-Level Retries

```typescript
// In JobPoller
if (job.status === JobStatus.FAILED && job.retryCount < maxRetries) {
  // Retry after delay
  setTimeout(() => {
    this.executeJob(job);
  }, retryDelay);
}
```

### Backend Fallback

- If extension fails multiple times, backend can:
  - Create alternative job sequence
  - Notify user of issue
  - Switch to different platform (Zomato instead of Swiggy)

---

## Security Considerations

### API Key Storage

- Stored in Chrome storage (encrypted by browser)
- Never logged or exposed
- Validated before use

### Content Security Policy

- No inline scripts
- No eval()
- External scripts only from extension bundle

### Host Permissions

- Limited to specific domains (Swiggy, Zomato, localhost)
- Explicitly declared in manifest

### Data Privacy

- User data sent to backend only with consent
- No tracking or analytics by default
- Session data cleaned up after expiry

---

## Performance Optimizations

### 1. Lazy Loading

- Content scripts injected only when needed
- Workflows loaded on-demand

### 2. Caching

- Page analysis results cached
- Element selectors cached
- API responses cached (short-lived)

### 3. Debouncing

- Job polling with exponential backoff if no jobs
- Action execution with delays to avoid rate limits

### 4. Parallel Execution

- Multiple jobs executed in parallel (up to maxConcurrentJobs)
- Independent actions batched

---

## Monitoring and Debugging

### Chrome DevTools

**Service Worker Console**:
- View background logs
- Inspect job execution
- Monitor API calls

**Content Script Console**:
- View DOM parsing logs
- Inspect element finding
- Monitor action execution

**Network Tab**:
- View API requests/responses
- Check request timing
- Inspect payloads

### Logging Strategy

```typescript
// Structured logging
console.log('[Component] Action', { context });

// Examples:
console.log('[JobPoller] Polling started');
console.log('[JobExecutor] Executing job', { jobId, action });
console.log('[ContentScript] Action executed', { action, result });
console.log('[ApiClient] Request sent', { url, method });
```

---

## Future Enhancements

### 1. Multi-Platform Support

- Add Zomato content script
- Unified workflow interface
- Platform-specific selectors

### 2. Offline Mode

- Queue jobs locally when offline
- Sync when connection restored

### 3. Advanced AI Features

- Visual element recognition
- Voice commands
- Natural language queries

### 4. Performance Monitoring

- Track job execution time
- Identify bottlenecks
- Optimize slow operations

---

**For implementation details, see:**
- [README.md](./README.md) - Overview and features
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Setup instructions
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File structure
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide

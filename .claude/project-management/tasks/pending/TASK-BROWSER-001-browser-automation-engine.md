# TASK-BROWSER-001: Browser Automation & Open Claw Engine

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 18 days
**Component:** Chrome Extension / Browser Automation
**Depends On:** TASK-WF-001 (workflow engine)
**Blocks:** Client-side ordering on Swiggy/Zomato when no API available
**Related Requirements:** FR-DEV-AGENT-001

---

## Overview

Extend the Chrome extension and build an Open Claw-like browser automation engine that can control web browsers (Chrome) and mobile apps (via web view) to execute food ordering workflows on external platforms (Swiggy, Zomato). Includes DOM parsing, intelligent element identification using on-device LLM, action simulation, multi-step workflow execution, visual confirmation, error recovery, and a management dashboard.

---

## Requirements

### Functional Requirements

1. **Enhanced Chrome Extension**
   - Workflow JSON consumer (poll from backend for pending workflows)
   - Step-by-step workflow execution in browser
   - Visual step indicator overlay on page
   - User confirmation prompts for critical actions (payment, order placement)
   - Screenshot capture at each step for audit trail
   - Step undo capability
   - Pause/resume workflow execution
   - Multi-tab support (different restaurants in different tabs)

2. **Intelligent DOM Analysis**
   - On-device LLM for DOM understanding (quantized model in extension)
   - Model options: TinyLlama, Phi-2, or Gemma-2B (ONNX/WASM)
   - Capabilities:
     - Identify UI components (buttons, inputs, cards, lists)
     - Understand page context (menu page, cart page, checkout, etc.)
     - Find elements by semantic description ("add to cart button for biryani")
     - Extract structured data from pages (prices, names, availability)
     - Detect errors and unexpected states
   - Fallback: CSS selector-based identification (platform-specific)
   - Adaptive learning: record successful selectors for reuse

3. **Platform Adapters**
   - Swiggy adapter:
     - Login flow automation
     - Restaurant search
     - Menu navigation and dish selection
     - Cart management
     - Address selection
     - Payment flow (up to user confirmation)
     - Order tracking page parsing
   - Zomato adapter:
     - Same capabilities as Swiggy adapter
     - Zomato-specific UI patterns
   - Generic adapter:
     - Works on any food delivery site
     - Uses LLM for element identification
     - Slower but universal

4. **Action Simulation**
   - Human-like interactions (random delays, mouse movement paths)
   - Click simulation (mousedown, mouseup, click events)
   - Typing simulation (keydown, keypress, keyup with realistic timing)
   - Scroll simulation (smooth scroll to elements)
   - Hover and focus simulation
   - Drag and drop (for quantity sliders)
   - Form auto-fill from workflow data
   - File upload simulation (for restaurant photos)
   - Anti-detection measures (avoid bot detection)

5. **Workflow Job Management**
   - Poll backend for browser-executable workflows
   - Job queue with priority
   - Concurrent workflow limit (max 3 tabs)
   - Job status updates to backend
   - Job retry on failure
   - Job cancellation support
   - Workflow result extraction and reporting

6. **Server-Side Browser Automation (Puppeteer/Playwright)**
   - Headless browser pool management
   - Session management with cookies
   - Proxy rotation (avoid IP blocking)
   - Browser profile management
   - Concurrent page management
   - Memory management and cleanup
   - Screenshot and video recording
   - Performance optimization (reuse browser instances)

7. **Mobile Web Automation**
   - Mobile Chrome DevTools Protocol
   - Responsive layout handling
   - Touch event simulation
   - App deep link handling
   - Mobile-specific UI patterns
   - Capacitor WebView integration (for in-app browser)

8. **Security & Anti-Detection**
   - User consent before any automation
   - Rate limiting to avoid account bans
   - Human-like behavior patterns
   - No credential storage in extension (OAuth only)
   - Encrypted communication between extension and backend
   - Extension permissions minimization
   - Content Security Policy compliance

### Architecture

```
Browser Automation Architecture:

Client-Side (Chrome Extension):
Extension → Poll Backend → Get Workflow JSON → Execute Steps
  → DOM Analysis (On-Device LLM) → Action Simulation
  → Screenshot → Status Update → Next Step

Server-Side (Puppeteer):
Backend → Puppeteer Pool → Launch Browser → Navigate
  → Execute Actions → Extract Data → Report Status

Components:
├── WorkflowExecutor (Extension)
│   ├── JobPoller
│   ├── StepExecutor
│   ├── StatusReporter
│   └── WorkflowPauseResume
├── DOMAnalyzer
│   ├── OnDeviceLLM (ONNX/WASM)
│   ├── SelectorEngine
│   ├── PageContextDetector
│   ├── DataExtractor
│   └── ErrorDetector
├── PlatformAdapters
│   ├── SwiggyAdapter
│   │   ├── LoginFlow
│   │   ├── SearchFlow
│   │   ├── CartFlow
│   │   ├── CheckoutFlow
│   │   └── TrackingFlow
│   ├── ZomatoAdapter
│   │   └── (same flows)
│   └── GenericAdapter
│       └── LLMGuidedFlow
├── ActionSimulator
│   ├── ClickSimulator
│   ├── TypeSimulator
│   ├── ScrollSimulator
│   ├── HoverSimulator
│   └── AntiDetection
├── PuppeteerEngine (Server)
│   ├── BrowserPool
│   ├── SessionManager
│   ├── ProxyRotator
│   ├── PageManager
│   └── RecordingManager
└── ManagementDashboard
    ├── ActiveWorkflows
    ├── ScreenshotViewer
    ├── StepHistory
    └── ErrorDashboard
```

### Acceptance Criteria
- [ ] Chrome extension executing workflow JSON from backend
- [ ] On-device LLM identifying UI elements by description
- [ ] Swiggy adapter: search → select → cart → checkout flow
- [ ] Zomato adapter: search → select → cart → checkout flow
- [ ] Human-like action simulation (anti-detection)
- [ ] Screenshot capture at each step
- [ ] User confirmation for payment/order actions
- [ ] Pause/resume workflow execution
- [ ] Server-side Puppeteer execution for headless mode
- [ ] Multi-tab concurrent workflows (max 3)
- [ ] Job status reporting to backend
- [ ] Error recovery with retry and fallback
- [ ] Performance: step execution < 5 seconds average
- [ ] 85%+ test coverage (JS layer)
- [ ] Security: no credential storage, encrypted communication

---

## SDLC Phases

### Phase 1: Design & Architecture (Days 1-2)
- Define extension-backend communication protocol
- Design workflow JSON executor architecture
- Design platform adapter interface
- Select on-device LLM model (TinyLlama vs Phi-2 vs Gemma-2B)
- Architecture review

### Phase 2: Core Extension Enhancement (Days 3-6)
- Workflow JSON executor implementation
- Job poller and status reporter
- Step executor with pause/resume
- Visual step indicator overlay
- Screenshot capture service
- Multi-tab management

### Phase 3: DOM Analysis & LLM (Days 7-9)
- On-device LLM integration (ONNX/WASM)
- Page context detector
- Semantic element finder
- Data extractor
- Error state detector
- CSS selector fallback engine

### Phase 4: Platform Adapters (Days 10-13)
- Swiggy adapter (login, search, cart, checkout, tracking)
- Zomato adapter (login, search, cart, checkout, tracking)
- Generic LLM-guided adapter
- Adapter test suites

### Phase 5: Action Simulation (Days 14-15)
- Click simulator with human-like patterns
- Type simulator with realistic timing
- Scroll and hover simulators
- Anti-detection measures
- Form auto-fill

### Phase 6: Server-Side Automation (Days 16-17)
- Puppeteer engine with browser pool
- Session and proxy management
- Page manager with concurrent support
- Screenshot and video recording

### Phase 7: Testing & Integration (Day 18)
- Unit tests for all components
- Integration tests (extension ↔ backend)
- E2E tests (full Swiggy/Zomato flows)
- Performance testing
- Security audit

---

## Files to Create/Modify

**Chrome Extension:**
- `chrome-extension/src/workflow/workflow-json-executor.ts` (new/extend)
- `chrome-extension/src/workflow/job-poller.ts` (new)
- `chrome-extension/src/workflow/step-executor.ts` (new)
- `chrome-extension/src/workflow/status-reporter.ts` (new)
- `chrome-extension/src/dom/on-device-llm.ts` (new)
- `chrome-extension/src/dom/page-context-detector.ts` (new)
- `chrome-extension/src/dom/data-extractor.ts` (new)
- `chrome-extension/src/dom/selector-engine.ts` (new)
- `chrome-extension/src/dom/error-detector.ts` (new)
- `chrome-extension/src/adapters/swiggy-adapter.ts` (extend)
- `chrome-extension/src/adapters/zomato-adapter.ts` (extend)
- `chrome-extension/src/adapters/generic-adapter.ts` (new)
- `chrome-extension/src/simulation/click-simulator.ts` (new)
- `chrome-extension/src/simulation/type-simulator.ts` (new)
- `chrome-extension/src/simulation/scroll-simulator.ts` (new)
- `chrome-extension/src/simulation/anti-detection.ts` (new)
- `chrome-extension/src/ui/step-indicator-overlay.ts` (new)
- `chrome-extension/src/ui/confirmation-prompt.ts` (new)
- `chrome-extension/src/management/active-workflows.ts` (new)
- `chrome-extension/src/management/screenshot-viewer.ts` (new)

**Server-Side:**
- `services/browser-automation/src/puppeteer-engine.ts` (new)
- `services/browser-automation/src/browser-pool.ts` (new)
- `services/browser-automation/src/session-manager.ts` (new)
- `services/browser-automation/src/proxy-rotator.ts` (new)
- `services/browser-automation/src/page-manager.ts` (new)
- `services/browser-automation/src/recording-manager.ts` (new)
- `services/browser-automation/package.json` (new)
- `services/browser-automation/Dockerfile` (new)

**Tests:**
- `chrome-extension/src/__tests__/workflow/workflow-json-executor.spec.ts`
- `chrome-extension/src/__tests__/workflow/job-poller.spec.ts`
- `chrome-extension/src/__tests__/workflow/step-executor.spec.ts`
- `chrome-extension/src/__tests__/dom/on-device-llm.spec.ts`
- `chrome-extension/src/__tests__/dom/page-context-detector.spec.ts`
- `chrome-extension/src/__tests__/adapters/swiggy-adapter.spec.ts`
- `chrome-extension/src/__tests__/adapters/zomato-adapter.spec.ts`
- `chrome-extension/src/__tests__/adapters/generic-adapter.spec.ts`
- `chrome-extension/src/__tests__/simulation/click-simulator.spec.ts`
- `chrome-extension/src/__tests__/simulation/anti-detection.spec.ts`
- `services/browser-automation/src/__tests__/puppeteer-engine.spec.ts`
- `services/browser-automation/src/__tests__/browser-pool.spec.ts`
- `services/browser-automation/src/__tests__/session-manager.spec.ts`

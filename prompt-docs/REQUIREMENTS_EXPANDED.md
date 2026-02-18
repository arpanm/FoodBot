# FoodBot - Expanded Requirements Specification

> **Detailed, Testable Specifications for AI-Orchestrated Restaurant Commerce Platform**
> Version: 1.0.0 | Last Updated: 2026-02-17

---

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Customer Agent - Expanded Requirements](#2-customer-agent---expanded-requirements)
- [3. Restaurant Agent - Expanded Requirements](#3-restaurant-agent---expanded-requirements)
- [4. MCP Layer - Expanded Requirements](#4-mcp-layer---expanded-requirements)
- [5. LLM Service - Expanded Requirements](#5-llm-service---expanded-requirements)
- [6. Workflow Service - Expanded Requirements](#6-workflow-service---expanded-requirements)
- [7. Cross-Cutting Concerns](#7-cross-cutting-concerns)
- [8. Testing Strategy](#8-testing-strategy)

---

## 1. Introduction

### 1.1 Purpose of This Document

This document expands the high-level requirements from REQUIREMENTS.md into detailed, testable specifications. Each requirement includes:

- **Detailed Sub-Requirements**: Breaking down complex features into granular, implementable units
- **Explicit Acceptance Criteria**: Measurable conditions that must be met
- **Edge Cases**: Boundary conditions and unusual scenarios
- **Error Scenarios**: Failure modes and error handling requirements
- **Data Validation Rules**: Input/output validation specifications
- **Performance Benchmarks**: Quantifiable performance targets
- **Integration Scenarios**: Cross-service interaction patterns

### 1.2 Document Structure

Each expanded requirement follows this template:

```
[REQ-ID] Requirement Title
├── Description: What the requirement achieves
├── Sub-Requirements: Detailed breakdown
├── Acceptance Criteria: Testable conditions
├── Edge Cases: Boundary scenarios
├── Error Scenarios: Failure handling
├── Data Validation: Input/output rules
├── Performance Metrics: Quantifiable targets
├── Dependencies: Related requirements/services
└── Test Strategy: How to verify
```

---

## 2. Customer Agent - Expanded Requirements

### 2.1 User Interface Requirements

#### [FR-CA-UI-001-EXP] Rich Chatbot Interface - Expanded

**Description**: Provide an interactive, rich chatbot interface supporting text, visual components, and dynamic interactions.

**Sub-Requirements**:

**SR-001.1**: Text Input Component
- Multi-line text input with auto-resize (max 500 characters)
- Character counter display
- Support for emoji picker
- Paste image support with preview
- Voice-to-text input option (browser Speech API)

**SR-001.2**: Rich UI Card Components
- Card structure: Image (16:9 ratio) + Title + Subtitle + Attributes + CTAs
- Image lazy loading with blur-up placeholder
- Support for image carousels (max 5 images per card)
- Star rating display (0-5 stars, half-star precision)
- Price display with currency formatting
- Distance/delivery time badges
- Availability status indicator (green=available, red=unavailable, yellow=limited)

**SR-001.3**: Call-to-Action Buttons
- Primary CTA: Solid color, high contrast
- Secondary CTA: Outline style
- Icon support (leading/trailing)
- Loading state animation
- Disabled state visual feedback
- Maximum 3 CTAs per interaction to avoid choice overload

**SR-001.4**: Dynamic Input Fields
- Context-aware field rendering based on conversation state
- Field types: text, number, select, multi-select, date, time
- Inline validation with real-time feedback
- Field pre-population from user context
- Auto-focus on first required field

**SR-001.5**: Loading States
- Skeleton screens for card loading
- Typing indicator for LLM responses
- Progress bar for multi-step operations
- Timeout warning after 10 seconds
- Cancel operation button for long-running tasks

**Acceptance Criteria**:
- ✅ AC-001.1: Text input displays character count and limits to 500 chars
- ✅ AC-001.2: Cards render within 200ms with placeholder images
- ✅ AC-001.3: All images use lazy loading and reduce initial load by >40%
- ✅ AC-001.4: CTAs show visual feedback within 100ms of user interaction
- ✅ AC-001.5: Loading states display after 300ms delay (prevents flash)
- ✅ AC-001.6: Dynamic fields render in correct order with proper focus
- ✅ AC-001.7: Voice input achieves >90% accuracy in English
- ✅ AC-001.8: UI passes WCAG 2.1 AA accessibility standards

**Edge Cases**:

**EC-001.1**: Very Long User Input
- Scenario: User pastes 10,000 character text
- Expected: Input truncates to 500 chars, shows warning message
- Validation: "Your message was truncated. Max 500 characters allowed."

**EC-001.2**: Slow Network/Image Loading
- Scenario: Images fail to load or load very slowly (>5s)
- Expected: Fallback to generic placeholder, show retry button
- Validation: Alt text displays, user can proceed without images

**EC-001.3**: Rapid Button Clicks
- Scenario: User clicks CTA button 10 times rapidly
- Expected: Only first click processes, subsequent clicks ignored
- Validation: Debounce mechanism prevents duplicate actions

**EC-001.4**: Browser Back Button
- Scenario: User clicks back during conversation
- Expected: Conversation state preserved, scroll position restored
- Validation: User returns to exact same state

**EC-001.5**: Empty Card Data
- Scenario: API returns card with missing image/title
- Expected: Default values used, card still renders
- Validation: Placeholder image, "Untitled" fallback text

**Error Scenarios**:

**ES-001.1**: Voice Input Not Supported
- Trigger: Browser doesn't support Speech API
- Response: Hide voice button, show tooltip "Voice input not supported"
- Recovery: User can still use text input

**ES-001.2**: Image Upload Failure
- Trigger: Image upload API returns 500 error
- Response: Show error message "Failed to upload image. Please try again."
- Recovery: User can retry or continue without image

**ES-001.3**: Card Rendering Failure
- Trigger: Malformed data from backend causes rendering exception
- Response: Log error, show fallback text card
- Recovery: Display error card with "Unable to load details" message

**ES-001.4**: WebSocket Connection Lost
- Trigger: Network interruption disconnects WebSocket
- Response: Show "Connection lost. Reconnecting..." banner
- Recovery: Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s max)

**Data Validation Rules**:

**DV-001.1**: Text Input Validation
```typescript
interface TextInputValidation {
  minLength: 1;
  maxLength: 500;
  allowedCharacters: /^[\p{L}\p{N}\p{P}\p{Z}\p{Emoji}]+$/u; // Unicode letters, numbers, punctuation, spaces, emojis
  sanitization: "escape_html"; // Prevent XSS
  trimWhitespace: true;
}
```

**DV-001.2**: Card Data Validation
```typescript
interface CardData {
  id: string; // Required, UUID format
  title: string; // Required, 1-100 chars
  subtitle?: string; // Optional, max 200 chars
  image?: string; // Optional, valid URL or base64
  attributes: Array<{
    key: string; // Required, 1-50 chars
    value: string; // Required, 1-100 chars
    icon?: string; // Optional, icon name from allowed set
  }>; // Max 5 attributes
  ctas: Array<{
    id: string; // Required, unique within card
    label: string; // Required, 1-30 chars
    action: 'navigate' | 'api_call' | 'dialog'; // Required
    style: 'primary' | 'secondary'; // Required
    icon?: string; // Optional
  }>; // Min 1, Max 3
}
```

**Performance Metrics**:
- Card render time: p95 < 200ms
- Text input responsiveness: < 50ms
- Image load time: p95 < 1s
- First meaningful paint: < 1.5s
- Interaction to next paint (INP): < 200ms

**Dependencies**:
- Backend: Chat API endpoint (`POST /api/v1/chat`)
- Backend: Job status API (`GET /api/v1/jobs/{jobId}/status`)
- CDN: Image delivery service
- Browser APIs: Speech Recognition (optional)

**Test Strategy**:
- Unit tests: Component rendering with various data inputs
- Integration tests: User flow from input to response display
- Visual regression tests: Screenshot comparison across browsers
- Performance tests: Lighthouse CI with thresholds
- Accessibility tests: axe-core automated testing
- Manual tests: Screen reader compatibility

---

#### [FR-CA-UI-002-EXP] Real-Time Status Updates - Expanded

**Description**: Provide users with continuous feedback on long-running operations through job-based status tracking.

**Sub-Requirements**:

**SR-002.1**: Job ID Generation and Management
- Generate cryptographically secure UUID v4 for each job
- Store job metadata in Redis with 24-hour TTL
- Include job type, user ID, session ID, creation timestamp
- Support job cancellation request
- Maintain job history for user's session

**SR-002.2**: Status Polling Mechanism
- Initial poll after 500ms delay
- Subsequent polls every 2 seconds
- Long-polling option (30-second timeout) to reduce requests
- Exponential backoff on repeated failures (2s, 4s, 8s, max 16s)
- Stop polling on terminal states (COMPLETED, FAILED, CANCELLED)
- Maximum 180 polls (6 minutes) before timeout

**SR-002.3**: Status Message Display
- Status-specific messages with user-friendly language
- Progress percentage display (0-100%)
- Elapsed time counter
- Current step description
- Estimated time remaining (when calculable)
- Visual indicators: icons, colors, animations

**SR-002.4**: Workflow Stage Visualization
- Linear progress stepper showing all stages
- Highlight current stage
- Show completed stages with checkmark
- Upcoming stages in gray/disabled state
- Handle non-linear workflows (branches, loops)

**SR-002.5**: Completion Notification
- Success state with result data
- Confetti animation or success icon
- Call-to-action for next steps
- Option to view details or start new action
- Persist notification in notification center

**Acceptance Criteria**:
- ✅ AC-002.1: Job ID generated and returned within 100ms of request
- ✅ AC-002.2: Status updates reflect in UI within 2.5 seconds of backend change
- ✅ AC-002.3: Long-polling reduces API calls by >60% vs short polling
- ✅ AC-002.4: Progress percentage matches actual workflow completion
- ✅ AC-002.5: User can cancel job and receive confirmation within 1 second
- ✅ AC-002.6: All status transitions logged for debugging
- ✅ AC-002.7: Timeout message displays after 6 minutes with retry option
- ✅ AC-002.8: Completion notification displays within 500ms of job completion

**Edge Cases**:

**EC-002.1**: Job Completion Before First Poll
- Scenario: Job completes in <500ms, before first poll
- Expected: First poll returns COMPLETED status
- Validation: No intermediate states shown, direct to result

**EC-002.2**: Backend Status Inconsistency
- Scenario: Backend sends status out of order (e.g., COMPLETED before PROCESSING)
- Expected: Client validates state machine, ignores invalid transitions
- Validation: Status can only progress forward, never backward

**EC-002.3**: User Navigates Away During Job
- Scenario: User closes tab/app while job processing
- Expected: Job continues on backend, resumable on return
- Validation: Job ID stored in localStorage, resume option on app reopen

**EC-002.4**: Multiple Concurrent Jobs
- Scenario: User initiates 3 jobs simultaneously
- Expected: All jobs tracked independently, UI shows all in list
- Validation: Each job polled separately, statuses don't conflict

**EC-002.5**: Job Status Stuck in PROCESSING
- Scenario: Backend worker crashes, status never updates
- Expected: Frontend timeout after 6 minutes, show error
- Validation: "This is taking longer than expected" with retry/cancel options

**Error Scenarios**:

**ES-002.1**: Job Not Found
- Trigger: Poll for job ID that doesn't exist or expired
- Response: HTTP 404, show error message
- Recovery: "Job expired or not found. Please start a new request."

**ES-002.2**: Polling API Failure
- Trigger: Status API returns 500 or network error
- Response: Retry with exponential backoff (up to 5 retries)
- Recovery: If all retries fail, show "Unable to check status. Try again?"

**ES-002.3**: Job Failed on Backend
- Trigger: Status returns FAILED with error details
- Response: Show error message from backend
- Recovery: "Something went wrong: {error_message}. Try again?"

**ES-002.4**: WebSocket Connection for Real-Time Updates
- Trigger: WebSocket drops during job execution
- Response: Fallback to HTTP polling automatically
- Recovery: Seamless transition, user doesn't notice

**Data Validation Rules**:

**DV-002.1**: Job Status Response Validation
```typescript
interface JobStatusResponse {
  jobId: string; // UUID v4 format
  status: 'QUEUED' | 'PROCESSING' | 'INTENT_DETECTED' | 'WORKFLOW_GENERATED' |
          'WORKFLOW_EXECUTING' | 'STEP_COMPLETED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number; // 0-100
  currentStep?: {
    stepId: string;
    stepName: string;
    startTime: string; // ISO 8601
    endTime?: string; // ISO 8601, present if step completed
    result?: any;
  };
  result?: any; // Present when status is COMPLETED
  error?: {
    code: string; // Error code for programmatic handling
    message: string; // User-friendly error message
    details?: any; // Additional error context
  }; // Present when status is FAILED
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  estimatedTimeRemaining?: number; // Seconds, optional
}
```

**DV-002.2**: Status Transition Validation
```typescript
// Valid state transitions
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  QUEUED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['INTENT_DETECTED', 'FAILED', 'CANCELLED'],
  INTENT_DETECTED: ['WORKFLOW_GENERATED', 'FAILED', 'CANCELLED'],
  WORKFLOW_GENERATED: ['WORKFLOW_EXECUTING', 'FAILED', 'CANCELLED'],
  WORKFLOW_EXECUTING: ['STEP_COMPLETED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  STEP_COMPLETED: ['STEP_COMPLETED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  FAILED: [], // Terminal state
  CANCELLED: [], // Terminal state
};
```

**Performance Metrics**:
- Job creation latency: p95 < 100ms
- Status poll latency: p95 < 200ms
- UI update after status change: < 500ms
- Polling overhead: < 1% of backend load
- WebSocket message delivery: < 100ms

**Dependencies**:
- Backend: Job creation API (`POST /api/v1/jobs`)
- Backend: Job status API (`GET /api/v1/jobs/{jobId}/status`)
- Backend: Job cancellation API (`POST /api/v1/jobs/{jobId}/cancel`)
- Redis: Job status storage
- WebSocket server (optional): Real-time updates

**Test Strategy**:
- Unit tests: Status state machine transitions
- Integration tests: End-to-end job creation to completion
- Load tests: 1000 concurrent jobs with polling
- Chaos tests: Backend failures during job execution
- User tests: Observe user understanding of status messages

---

### 2.2 Conversation & Intent Management

#### [FR-CA-CONV-001-EXP] Natural Language Understanding - Expanded

**Description**: Process natural language user input to accurately detect intent and generate executable workflows.

**Sub-Requirements**:

**SR-CONV-001.1**: Input Preprocessing
- Text normalization: lowercase, remove extra whitespace
- Spell checking with context-aware corrections
- Abbreviation expansion (e.g., "pizza" from "piza")
- Slang detection and translation (e.g., "wanna" → "want to")
- Multi-language detection (support English, Hindi, Hinglish)
- Profanity filtering with replacement

**SR-CONV-001.2**: Intent Classification
- Support for 15+ intent types (see list below)
- Multi-intent detection (e.g., "Show me pizza places and add garlic bread to cart")
- Intent confidence scoring (0-1 scale)
- Fallback to general_query for low confidence (<0.7)
- Intent history tracking for context

**Supported Intents**:
1. `search_restaurant` - Find restaurants
2. `search_dish` - Find specific dishes
3. `view_restaurant` - Get details of a restaurant
4. `view_dish` - Get details of a dish
5. `get_recommendations` - Ask for personalized suggestions
6. `add_to_cart` - Add items to cart
7. `modify_cart` - Update cart items
8. `view_cart` - Show cart contents
9. `checkout` - Proceed to payment
10. `manage_address` - Add/edit delivery address
11. `track_order` - Check order status
12. `provide_feedback` - Rate order/restaurant
13. `cancel_order` - Cancel pending order
14. `repeat_order` - Reorder from history
15. `general_query` - FAQ, help, other

**SR-CONV-001.3**: Entity Extraction
- Named Entity Recognition (NER) for:
  - Restaurant names (e.g., "Domino's")
  - Dish names (e.g., "Margherita Pizza")
  - Cuisines (e.g., "Italian", "Chinese")
  - Locations (e.g., "Indiranagar", "near me")
  - Quantities (e.g., "2 pizzas")
  - Prices (e.g., "under 500 rupees")
  - Time expressions (e.g., "tonight", "7pm")
  - Dietary preferences (e.g., "vegan", "gluten-free")
- Coreference resolution (e.g., "it" → "pizza")
- Slot filling for incomplete intents

**SR-CONV-001.4**: Context Management
- Session-level context storage (last 10 turns)
- User profile context (preferences, order history)
- Conversation state tracking (e.g., in checkout flow)
- Context expiration (clear after 30 minutes inactivity)
- Context compression for long conversations

**SR-CONV-001.5**: Multi-Turn Conversation Handling
- Support for follow-up questions
- Clarification requests when intent unclear
- Confirmation prompts for high-impact actions (e.g., order placement)
- Context switching between topics
- Conversation repair (handle corrections, "no wait, I meant...")

**Acceptance Criteria**:
- ✅ AC-CONV-001.1: Intent classification accuracy >95% on test dataset
- ✅ AC-CONV-001.2: Entity extraction F1 score >90%
- ✅ AC-CONV-001.3: Multi-intent detection works for 2-3 simultaneous intents
- ✅ AC-CONV-001.4: Context maintained across 10+ turn conversations
- ✅ AC-CONV-001.5: Response generated within 3 seconds for 95% of queries
- ✅ AC-CONV-001.6: Spell correction reduces user friction by >30%
- ✅ AC-CONV-001.7: Profanity filter catches 100% of blocked words
- ✅ AC-CONV-001.8: Multi-language support for English and Hindi

**Edge Cases**:

**EC-CONV-001.1**: Ambiguous Intent
- Scenario: "What about pizza?" without prior context
- Expected: System asks clarification: "Do you want to search for pizza places or pizza dishes?"
- Validation: User provides clarification, conversation continues

**EC-CONV-001.2**: Completely Unrelated Input
- Scenario: "What's the weather today?"
- Expected: System responds: "I can help you order food. For weather, try a weather app!"
- Validation: Graceful handling, redirect to supported intents

**EC-CONV-001.3**: Very Long Input (Paragraph)
- Scenario: User pastes entire blog post about pizza
- Expected: System extracts key intents, ignores fluff
- Validation: "I found that you're looking for pizza. Here are some options..."

**EC-CONV-001.4**: Input in Unsupported Language
- Scenario: User types in Tamil or Telugu
- Expected: System detects language, responds in English: "Sorry, I currently support English and Hindi. Can you rephrase?"
- Validation: Language detection works, fallback graceful

**EC-CONV-001.5**: Rapid Context Switches
- Scenario: "Show me burgers. Actually, pizza. No wait, sushi."
- Expected: System processes final request (sushi), acknowledges changes
- Validation: "Got it, showing sushi restaurants instead."

**EC-CONV-001.6**: Sarcasm or Humor
- Scenario: "Surprise me with the worst pizza you have"
- Expected: System interprets positively or asks clarification
- Validation: "I'll show you highly rated pizza options!"

**Error Scenarios**:

**ES-CONV-001.1**: LLM API Timeout
- Trigger: LLM takes >30 seconds to respond
- Response: Cancel request, use fallback intent classification (rule-based)
- Recovery: "Taking longer than expected. Using quick search instead."

**ES-CONV-001.2**: LLM API Rate Limit
- Trigger: Exceeded API quota
- Response: Use cached similar query result
- Recovery: If no cache hit, show error: "High demand right now. Please try again in a moment."

**ES-CONV-001.3**: Malformed User Input (XSS Attempt)
- Trigger: Input contains script tags or SQL injection attempt
- Response: Sanitize input, log security event
- Recovery: Process sanitized input normally, user doesn't notice

**ES-CONV-001.4**: Intent Confidence Too Low
- Trigger: All intents score <0.5
- Response: Ask user to rephrase: "I didn't quite understand. Can you rephrase?"
- Recovery: User provides clearer input

**ES-CONV-001.5**: Entity Extraction Failure
- Trigger: NER model fails to load
- Response: Use regex-based fallback extraction
- Recovery: Degraded accuracy (80% vs 90%) but functional

**Data Validation Rules**:

**DV-CONV-001.1**: User Input Validation
```typescript
interface UserInputValidation {
  minLength: 1;
  maxLength: 500;
  sanitization: {
    removeScriptTags: true;
    escapeSql: true;
    normalizeWhitespace: true;
    trimWhitespace: true;
  };
  profanityFilter: {
    enabled: true;
    action: 'replace' | 'reject';
    replacement: '***';
  };
}
```

**DV-CONV-001.2**: Intent Detection Response
```typescript
interface IntentDetectionResponse {
  intents: Array<{
    name: string; // One of supported intent types
    confidence: number; // 0-1
    entities: Array<{
      type: string; // e.g., 'restaurant_name', 'dish_name', 'quantity'
      value: string; // Extracted value
      startIndex: number; // Position in original text
      endIndex: number;
    }>;
  }>;
  primaryIntent: string; // Highest confidence intent
  requiresClarification: boolean;
  clarificationQuestion?: string;
  metadata: {
    languageDetected: string; // ISO 639-1 code
    processingTimeMs: number;
    modelVersion: string;
  };
}
```

**DV-CONV-001.3**: Context Structure
```typescript
interface ConversationContext {
  sessionId: string;
  userId: string;
  history: Array<{
    turnId: string;
    timestamp: string; // ISO 8601
    userInput: string;
    intent: string;
    entities: Record<string, any>;
    systemResponse: string;
  }>; // Max 10 recent turns
  userProfile: {
    preferences: {
      dietaryRestrictions: string[];
      favoriteCuisines: string[];
      priceRange: 'budget' | 'moderate' | 'premium';
    };
    location: {
      lat: number;
      lng: number;
      address: string;
    };
    orderHistory: Array<{
      orderId: string;
      restaurantId: string;
      items: Array<{dishId: string; dishName: string}>;
      timestamp: string;
    }>; // Last 5 orders
  };
  conversationState: {
    currentFlow?: 'browsing' | 'checkout' | 'tracking' | 'feedback';
    cartId?: string;
    selectedRestaurant?: string;
  };
}
```

**Performance Metrics**:
- Intent classification latency: p95 < 2 seconds
- Entity extraction latency: p95 < 1 second
- Context loading time: p95 < 100ms
- Memory per session: < 5MB
- Concurrent sessions supported: 10,000+

**Dependencies**:
- LLM Service: Intent classification and workflow generation
- Redis: Session context storage
- GraphDB: User preference graph
- Vector DB: Semantic search for similar queries

**Test Strategy**:
- Unit tests: Intent classifier with labeled dataset (1000+ examples)
- Integration tests: End-to-end conversation flows
- Accuracy tests: Benchmark against human-labeled test set
- Load tests: 1000 concurrent conversations
- Edge case tests: Ambiguous, malformed, adversarial inputs
- A/B tests: Compare different LLM models/prompts

---

#### [FR-CA-CONV-002-EXP] Prompt Caching & Optimization - Expanded

**Description**: Cache prompt-to-intent mappings and query results to reduce LLM API calls and improve response times.

**Sub-Requirements**:

**SR-CONV-002.1**: Vector Embedding Generation
- Embed user prompts using OpenAI text-embedding-3-small (1536 dimensions)
- Normalize vectors for cosine similarity
- Batch embedding requests (up to 100 prompts)
- Cache embeddings for repeated prompts
- TTL for embeddings: 7 days

**SR-CONV-002.2**: Semantic Similarity Search
- Index embeddings in vector database (Pinecone/Qdrant/Weaviate)
- Cosine similarity threshold: 0.85 for cache hit
- Return top-5 similar prompts for consideration
- Filter by user context (location, preferences)
- Rerank results using recency and success rate

**SR-CONV-002.3**: Cache Storage Strategy
- Store: (prompt_embedding → intent + workflow_json + result)
- Cache hit: Similarity >0.85 AND context match
- Cache invalidation triggers:
  - Menu updates for affected restaurants
  - Availability changes
  - Price changes
  - User explicitly says "refresh" or "latest"
- Cache warming: Pre-populate with top 100 common queries

**SR-CONV-002.4**: Cache Miss Handling
- On miss, call LLM API for fresh intent detection
- Store new result in cache for future hits
- Update cache statistics (hit rate, latency improvement)
- Learn from user feedback (thumbs up/down on results)

**SR-CONV-002.5**: Cache Analytics and Monitoring
- Track cache hit rate per user, per intent type
- Monitor cache size and eviction rate
- A/B test different similarity thresholds
- Alert if hit rate drops below 60%
- Dashboard showing cache performance

**Acceptance Criteria**:
- ✅ AC-CONV-002.1: Cache hit rate >70% after warm-up period (1 week)
- ✅ AC-CONV-002.2: Cached responses return within 200ms (vs 3s for LLM)
- ✅ AC-CONV-002.3: Similarity search completes in <50ms
- ✅ AC-CONV-002.4: False positive rate (wrong cache hit) <5%
- ✅ AC-CONV-002.5: LLM API calls reduced by >60% with caching
- ✅ AC-CONV-002.6: Cache invalidation completes within 1 second
- ✅ AC-CONV-002.7: Cache storage uses <10GB for 1M entries
- ✅ AC-CONV-002.8: User satisfaction with cached results >95%

**Edge Cases**:

**EC-CONV-002.1**: Very Similar But Different Intent
- Scenario: "Show me pizza places" vs "Show me pasta places"
- Expected: Similarity might be high (0.88) but results should differ
- Validation: Context filter or entity matching prevents false hit

**EC-CONV-002.2**: Outdated Cache Hit
- Scenario: Cached result has restaurant that's now closed
- Expected: Cache invalidation should have removed this
- Validation: Fallback validation checks restaurant status before returning

**EC-CONV-002.3**: User Context Change
- Scenario: User changes location, cached results no longer relevant
- Expected: Context filter prevents cache hit for wrong location
- Validation: Cache keyed by (embedding + location + preferences)

**EC-CONV-002.4**: Cold Start (Empty Cache)
- Scenario: New deployment, cache is empty
- Expected: Gradual warm-up, no errors
- Validation: First 100 queries slower, then improved performance

**EC-CONV-002.5**: Cache Poisoning Attempt
- Scenario: Attacker tries to insert malicious cache entries
- Expected: Cache writes only from trusted backend service
- Validation: Authentication required for cache writes

**Error Scenarios**:

**ES-CONV-002.1**: Vector DB Unavailable
- Trigger: Pinecone/Qdrant service down
- Response: Skip cache, go directly to LLM
- Recovery: Degrade gracefully, log event, retry after 1 minute

**ES-CONV-002.2**: Embedding API Failure
- Trigger: OpenAI embedding API returns 500
- Response: Use cached embedding if available, else skip cache
- Recovery: Retry with exponential backoff

**ES-CONV-002.3**: Cache Corruption
- Trigger: Invalid data in cache (malformed JSON)
- Response: Skip corrupted entry, log error
- Recovery: Evict corrupted entry, fetch fresh data

**ES-CONV-002.4**: Memory Pressure (Cache Too Large)
- Trigger: Cache exceeds size limit (10GB)
- Response: Evict LRU (Least Recently Used) entries
- Recovery: Maintain cache size, oldest entries removed first

**Data Validation Rules**:

**DV-CONV-002.1**: Cache Entry Structure
```typescript
interface CacheEntry {
  id: string; // UUID
  promptEmbedding: number[]; // 1536-dim vector
  originalPrompt: string; // For debugging
  intent: string;
  workflowJson: WorkflowDefinition;
  result: any; // Cached execution result
  context: {
    location?: {lat: number; lng: number};
    preferences?: string[];
    timestamp: string; // ISO 8601
  };
  metadata: {
    hitCount: number; // How many times this was served
    lastAccessed: string; // ISO 8601
    createdAt: string;
    expiresAt: string;
    successRate: number; // 0-1, based on user feedback
  };
}
```

**DV-CONV-002.2**: Similarity Search Request
```typescript
interface SimilaritySearchRequest {
  queryEmbedding: number[]; // 1536-dim vector
  topK: number; // Default 5, max 20
  similarityThreshold: number; // Default 0.85, range 0.5-0.99
  contextFilter?: {
    location?: {lat: number; lng: number; radius: number}; // Radius in km
    maxAge?: number; // Max age in seconds
  };
  rerank?: {
    byRecency: boolean;
    bySuccessRate: boolean;
  };
}
```

**Performance Metrics**:
- Embedding generation: p95 < 200ms
- Similarity search: p95 < 50ms
- Cache retrieval: p95 < 20ms
- Cache write: p95 < 50ms
- Hit rate: >70% (target), >60% (acceptable)
- False positive rate: <5%
- Latency reduction: >85% for cache hits

**Dependencies**:
- Vector Database: Pinecone/Qdrant/Weaviate
- Embedding API: OpenAI text-embedding-3-small
- Redis: Cache metadata and quick lookups
- Kafka: Cache invalidation events

**Test Strategy**:
- Unit tests: Cache hit/miss logic
- Integration tests: End-to-end caching flow
- Load tests: 10,000 queries/sec with cache
- Accuracy tests: False positive/negative rates
- Chaos tests: Vector DB failures
- Performance tests: Latency improvements

---

### 2.3 Search & Discovery

#### [FR-CA-SEARCH-001-EXP] Restaurant Search - Expanded

**Description**: Enable comprehensive restaurant search with multiple criteria and intelligent ranking.

**Sub-Requirements**:

**SR-SEARCH-001.1**: Full-Text Search
- Elasticsearch-based search on restaurant name and description
- Support for:
  - Fuzzy matching (Levenshtein distance ≤2)
  - Partial matches ("domino" matches "Domino's Pizza")
  - Phonetic matching ("pizza" matches "piza")
  - Synonym expansion ("fast food" includes "quick service")
- Boost exact matches higher in results
- Highlight matched terms in results

**SR-SEARCH-001.2**: Cuisine-Based Search
- Predefined cuisine taxonomy (50+ types)
- Multi-cuisine restaurants supported
- Cuisine filtering (multi-select)
- Fuzzy cuisine matching ("italian" matches "Italian", "Italy")
- Popular cuisines suggested first

**SR-SEARCH-001.3**: Location-Based Search
- Geo-spatial search within radius (default 5km)
- "Near me" uses device GPS (with permission)
- Manual location selection (map or address)
- Sort by distance (nearest first)
- Show distance in km/miles
- Account for delivery areas (not just crow flies)

**SR-SEARCH-001.4**: Rating and Popularity
- Filter by minimum rating (1-5 stars)
- Sort by rating (highest first)
- Include review count as quality signal
- Trending/popular restaurants badge
- New restaurants badge (<30 days)

**SR-SEARCH-001.5**: Price Range Filtering
- 4-tier price range (₹, ₹₹, ₹₹₹, ₹₹₹₹)
- Multi-select price filters
- Average order value calculation
- Price range displayed on cards

**SR-SEARCH-001.6**: Advanced Filters
- Delivery time filter (< 30 min, < 45 min, < 60 min)
- Open now vs all restaurants
- Minimum order value
- Free delivery
- Offers/discounts available
- Pure veg restaurants
- Accepts specific payment methods

**SR-SEARCH-001.7**: Search Result Ranking
- Relevance score (0-100) based on:
  - Text match score (40%)
  - User preference match (30%)
  - Rating × review count (20%)
  - Recency/freshness (10%)
- Personalization boost for user favorites
- A/B tested ranking algorithms

**SR-SEARCH-001.8**: Pagination and Lazy Loading
- Initial load: 20 restaurants
- Infinite scroll loads 20 more
- Virtual scrolling for performance
- Total result count displayed
- "Load more" button fallback

**Acceptance Criteria**:
- ✅ AC-SEARCH-001.1: Search returns results within 500ms for p95
- ✅ AC-SEARCH-001.2: Typo tolerance handles 1-2 character errors
- ✅ AC-SEARCH-001.3: Geo-search accurate within 1km
- ✅ AC-SEARCH-001.4: Result ranking has >80% user satisfaction
- ✅ AC-SEARCH-001.5: Filters reduce results correctly (no false positives)
- ✅ AC-SEARCH-001.6: Pagination loads smoothly without lag
- ✅ AC-SEARCH-001.7: Empty state shows helpful suggestions
- ✅ AC-SEARCH-001.8: Search handles 1000+ restaurants in city

**Edge Cases**:

**EC-SEARCH-001.1**: No Results Found
- Scenario: Search for "martian cuisine" returns 0 results
- Expected: Show "No restaurants found. Try: [suggestions]"
- Validation: Suggest popular cuisines or nearby restaurants

**EC-SEARCH-001.2**: Too Many Results (10,000+)
- Scenario: Search "restaurant" in Mumbai
- Expected: Prompt user to refine search
- Validation: "Too many results. Add filters or be more specific."

**EC-SEARCH-001.3**: Exact Duplicate Names
- Scenario: Multiple "McDonald's" locations
- Expected: Show all with location differentiators
- Validation: "McDonald's - Koramangala", "McDonald's - Indiranagar"

**EC-SEARCH-001.4**: Location Permission Denied
- Scenario: User denies GPS access
- Expected: Fallback to manual location entry
- Validation: Show map or city selector

**EC-SEARCH-001.5**: User in Unsupported City
- Scenario: GPS shows user in small town not in database
- Expected: Show nearest supported city
- Validation: "No restaurants in your area. Try: [nearest city]"

**EC-SEARCH-001.6**: All Restaurants Closed
- Scenario: Search at 3 AM, all restaurants closed
- Expected: Still show results with "Closed" badge
- Validation: Allow advanced ordering for next day

**Error Scenarios**:

**ES-SEARCH-001.1**: Elasticsearch Down
- Trigger: ES cluster unavailable
- Response: Fallback to PostgreSQL LIKE query (degraded performance)
- Recovery: "Search running slower than usual. Results may be limited."

**ES-SEARCH-001.2**: Geo-Location Service Failure
- Trigger: GPS hardware error or timeout
- Response: Skip geo-sorting, use other criteria
- Recovery: "Unable to detect location. Enter manually?"

**ES-SEARCH-001.3**: Malformed Search Query
- Trigger: Special characters causing ES query parse error
- Response: Sanitize query, retry
- Recovery: Escape special chars, treat as literal

**ES-SEARCH-001.4**: Search Index Out of Sync
- Trigger: New restaurant added but not yet indexed
- Response: Show results from last index, stale by <5 min
- Recovery: Near real-time indexing via Kafka

**Data Validation Rules**:

**DV-SEARCH-001.1**: Search Request Validation
```typescript
interface RestaurantSearchRequest {
  query?: string; // Min 1, max 100 chars, sanitized
  location?: {
    lat: number; // -90 to 90
    lng: number; // -180 to 180
    radius: number; // 1-50 km, default 5
  };
  filters?: {
    cuisines?: string[]; // Max 10, from allowed taxonomy
    minRating?: number; // 1-5, increments of 0.5
    priceRange?: ('₹' | '₹₹' | '₹₹₹' | '₹₹₹₹')[]; // Max 4
    maxDeliveryTime?: number; // 15, 30, 45, 60 minutes
    isVeg?: boolean;
    hasOffers?: boolean;
    openNow?: boolean;
  };
  sort?: 'relevance' | 'rating' | 'distance' | 'deliveryTime' | 'popularity';
  pagination?: {
    page: number; // Min 1, default 1
    pageSize: number; // Min 10, max 50, default 20
  };
}
```

**DV-SEARCH-001.2**: Search Response Validation
```typescript
interface RestaurantSearchResponse {
  results: Array<{
    id: string;
    name: string;
    cuisine: string[];
    rating: number; // 0-5, one decimal
    reviewCount: number;
    priceRange: 1 | 2 | 3 | 4;
    deliveryTime: number; // Minutes
    distance?: number; // km, two decimals
    isOpen: boolean;
    hasOffers: boolean;
    image: string; // URL
    relevanceScore: number; // 0-100, for debugging
  }>;
  metadata: {
    totalResults: number;
    page: number;
    pageSize: number;
    totalPages: number;
    searchTimeMs: number;
  };
  suggestions?: string[]; // If no results or typo detected
}
```

**Performance Metrics**:
- Search latency: p50 < 200ms, p95 < 500ms, p99 < 1s
- Index size: < 1GB for 100K restaurants
- Query throughput: 1000+ queries/second
- Index refresh lag: < 5 seconds
- Filter application time: < 50ms

**Dependencies**:
- Elasticsearch: Primary search index
- PostgreSQL: Fallback and source of truth
- Kafka: Real-time indexing events
- Redis: Cached popular searches
- MCP Providers: Restaurant data source

**Test Strategy**:
- Unit tests: Search query building
- Integration tests: ES → API → UI flow
- Accuracy tests: Search relevance benchmarks
- Load tests: 10,000 concurrent searches
- Edge case tests: Empty, huge, malformed queries
- User tests: Search satisfaction surveys

---

(Continued in next section due to length...)


## 3. Restaurant Agent - Expanded Requirements

### 3.1 Menu Management

#### [FR-RA-MENU-001-EXP] Menu Operations - Expanded

**Description**: Comprehensive menu management with CRUD operations, bulk uploads, and real-time synchronization.

**Sub-Requirements**:

**SR-MENU-001.1**: Add New Dish
- Form fields:
  - Name: Required, 3-100 chars, unique per restaurant
  - Description: Optional, max 500 chars, support markdown
  - Category: Required, from predefined list or custom
  - Subcategory: Optional
  - Base Price: Required, min ₹10, max ₹10,000
  - Portion Size: Required (e.g., "250g", "Serves 2")
  - Preparation Time: Required, 5-120 minutes
  - Dietary Tags: Multi-select (Veg, Non-Veg, Vegan, Gluten-Free, etc.)
- Image upload:
  - Min 1, max 5 images
  - Formats: JPG, PNG, WebP
  - Max size: 5MB per image
  - Auto-resize to multiple resolutions (thumbnail, card, full)
  - CDN upload with progress bar
- Customization options:
  - Add-ons (e.g., Extra Cheese: +₹50)
  - Variants (e.g., Regular/Large: ₹200/₹350)
  - Special instructions allowed (Yes/No)
- Availability settings:
  - Available by default
  - Schedule availability (weekday/time-based)
  - Stock tracking enabled/disabled

**SR-MENU-001.2**: Edit Existing Dish
- Load all current values in form
- Track changes for audit log
- Preserve image history (don't delete old images immediately)
- Price change notification to customers who added to cart
- Immediate sync to Elasticsearch index
- Version history (last 10 changes)

**SR-MENU-001.3**: Delete Dish
- Soft delete (mark as inactive, not hard delete)
- Cannot delete if part of active orders
- Confirmation dialog: "Are you sure? X active orders include this dish"
- Remove from search index immediately
- Keep in order history for reporting

**SR-MENU-001.4**: Bulk Menu Upload
- CSV/Excel template download
- Required columns: name, category, price, description
- Optional columns: dietary_tags, prep_time, portion_size
- Validate entire file before import
- Show preview with errors highlighted
- Import in background job with progress
- Email notification on completion
- Rollback option if errors detected

**SR-MENU-001.5**: Menu Categorization
- Drag-and-drop category reordering
- Move dishes between categories
- Create custom categories (max 20 per restaurant)
- Category visibility toggle (hide/show)
- Category images and descriptions

**SR-MENU-001.6**: Real-Time Sync
- Publish events to Kafka on any change
- Consumers update:
  - PostgreSQL (source of truth)
  - Elasticsearch (search index)
  - Redis cache (invalidate)
  - MCP provider databases
- Sync latency target: <5 seconds

**Acceptance Criteria**:
- ✅ AC-MENU-001.1: Add dish form validates all fields correctly
- ✅ AC-MENU-001.2: Image upload completes within 10 seconds per image
- ✅ AC-MENU-001.3: Images auto-resize to 3 resolutions (200px, 500px, 1200px)
- ✅ AC-MENU-001.4: Edit dish updates reflect in search within 5 seconds
- ✅ AC-MENU-001.5: Cannot delete dish with active orders (validation error)
- ✅ AC-MENU-001.6: Bulk upload handles 500 dishes in <2 minutes
- ✅ AC-MENU-001.7: CSV validation catches all format errors before import
- ✅ AC-MENU-001.8: Category reorder saves and persists correctly
- ✅ AC-MENU-001.9: Audit log captures who changed what and when

**Edge Cases**:

**EC-MENU-001.1**: Dish Name Conflict
- Scenario: Restaurant tries to add "Chicken Burger" when it already exists
- Expected: Show error: "Dish name already exists. Use different name or edit existing."
- Validation: Enforce unique constraint at DB level

**EC-MENU-001.2**: Extremely Long Description
- Scenario: Description exceeds 500 chars
- Expected: Truncate with warning, allow saving truncated version
- Validation: Show char count, red when >500

**EC-MENU-001.3**: Image Upload Failure Mid-Process
- Scenario: Upload 5 images, 3rd one fails
- Expected: Retry failed image, keep successful ones
- Validation: Partial progress saved, user can retry or save without failed image

**EC-MENU-001.4**: Bulk Upload with Some Errors
- Scenario: CSV has 100 rows, 10 have errors
- Expected: Import 90 valid rows, show error report for 10
- Validation: Partial import option, or fix errors and re-upload

**EC-MENU-001.5**: Edit During Active Order
- Scenario: Customer orders "Pizza Margherita", then price changed
- Expected: Order locked to old price, new customers see new price
- Validation: Price snapshot in order record

**EC-MENU-001.6**: Category Deletion with Dishes
- Scenario: Delete category containing 20 dishes
- Expected: Prompt to move dishes to another category or make them uncategorized
- Validation: Cannot orphan dishes

**Error Scenarios**:

**ES-MENU-001.1**: Database Write Failure
- Trigger: PostgreSQL connection lost during save
- Response: Show error, data not saved
- Recovery: "Failed to save changes. Please try again."

**ES-MENU-001.2**: Image CDN Upload Failure
- Trigger: CDN service returns 500 error
- Response: Retry up to 3 times, then fail
- Recovery: "Image upload failed. Try again or continue without image."

**ES-MENU-001.3**: Kafka Publish Failure
- Trigger: Kafka broker down
- Response: Save to DB succeeds, queue event for later replay
- Recovery: Background job retries Kafka publish every 30 seconds

**ES-MENU-001.4**: Elasticsearch Indexing Failure
- Trigger: ES cluster unhealthy
- Response: Dish saved but not searchable yet
- Recovery: Re-index job runs every 5 minutes to catch up

**ES-MENU-001.5**: Concurrent Edit Conflict
- Trigger: Two restaurant staff edit same dish simultaneously
- Response: Last write wins, show warning to second user
- Recovery: "Dish was updated by another user. Please refresh and try again."

**Data Validation Rules**:

**DV-MENU-001.1**: Dish Data Model
```typescript
interface Dish {
  id: string; // UUID
  restaurantId: string; // UUID, foreign key
  name: string; // 3-100 chars, trimmed
  description?: string; // Max 500 chars
  category: string; // Required, 50 char max
  subcategory?: string; // Optional, 50 char max
  price: number; // Min 10, max 10000, no decimals (paise)
  portionSize: string; // e.g., "250g", "Serves 2", 50 char max
  preparationTime: number; // Minutes, 5-120
  images: Array<{
    url: string; // HTTPS URL
    thumbnailUrl: string;
    fullSizeUrl: string;
    order: number; // Display order, 1-5
  }>; // Min 1, max 5
  dietaryTags: Array<'VEG' | 'NON_VEG' | 'VEGAN' | 'GLUTEN_FREE' | 'DAIRY_FREE' | 'NUT_FREE'>;
  customizations?: Array<{
    id: string;
    name: string; // e.g., "Size"
    type: 'ADDON' | 'VARIANT';
    required: boolean;
    options: Array<{
      name: string; // e.g., "Large"
      priceModifier: number; // e.g., +50 (rupees)
    }>;
  }>;
  availability: {
    isAvailable: boolean;
    schedule?: {
      daysOfWeek: number[]; // 0=Sunday, 6=Saturday
      startTime: string; // HH:MM
      endTime: string; // HH:MM
    };
    stockLevel?: number; // Optional, if tracking enabled
  };
  metadata: {
    createdAt: string; // ISO 8601
    updatedAt: string;
    createdBy: string; // User ID
    version: number; // Increments on each edit
  };
}
```

**DV-MENU-001.2**: Bulk Upload CSV Format
```csv
name,category,subcategory,price,portion_size,prep_time,dietary_tags,description
"Chicken Burger","Main Course","Burgers",250,"Serves 1",25,"NON_VEG","Juicy grilled chicken with lettuce and mayo"
"Paneer Tikka Pizza","Main Course","Pizzas",350,"Medium 10 inch",35,"VEG","Wood-fired pizza with marinated paneer"
```

**Performance Metrics**:
- Add dish operation: <2 seconds end-to-end
- Edit dish operation: <1.5 seconds
- Image upload: <10 seconds per image
- Bulk upload: <2 minutes for 500 dishes
- Sync to Elasticsearch: <5 seconds
- Category reorder: <500ms

**Dependencies**:
- PostgreSQL: Dish data storage
- CDN: Image hosting (AWS S3 / Cloudinary)
- Kafka: Change events
- Elasticsearch: Search indexing
- Redis: Cache invalidation

**Test Strategy**:
- Unit tests: Form validation logic
- Integration tests: End-to-end add/edit/delete flows
- Load tests: Bulk upload of 1000 dishes
- Chaos tests: Kafka/ES failures during operations
- UI tests: Form interactions, image uploads
- Manual tests: Edge cases, concurrent edits

---

### 3.2 Order Management

#### [FR-RA-ORDER-001-EXP] Order Operations - Expanded

**Description**: Real-time order reception, status management, and fulfillment workflow.

**Sub-Requirements**:

**SR-ORDER-001.1**: Incoming Order Notification
- Push notification (FCM) on new order
- In-app notification banner (prominent)
- Sound alert (configurable, can disable)
- Vibration (mobile devices)
- Badge count on app icon
- Desktop notification (web)
- SMS fallback if app not active (optional)

**SR-ORDER-001.2**: Order Details View
- Customer information:
  - Name, phone (masked for privacy)
  - Delivery address
  - Special instructions
- Order items:
  - Dish name, quantity, customizations
  - Price breakdown per item
- Totals:
  - Subtotal, taxes, delivery fee, discounts, grand total
- Payment info:
  - Payment method
  - Payment status (Paid/COD)
  - Transaction ID
- Timestamps:
  - Order placed time
  - Expected delivery time
  - Acceptance deadline (e.g., respond within 5 minutes)

**SR-ORDER-001.3**: Accept Order
- One-tap accept button
- Auto-accept option (configurable in settings)
- Accept deadline: 5 minutes (configurable)
- On accept:
  - Update order status to "Confirmed"
  - Notify customer via push notification
  - Start preparation timer
  - Send to kitchen display system (if integrated)
- Cannot accept if:
  - Restaurant is marked closed
  - Items out of stock (show warning, allow override)

**SR-ORDER-001.4**: Reject Order
- Requires reason selection:
  - "Too busy, can't fulfill"
  - "Items unavailable"
  - "Outside delivery area"
  - "Other" (free text required)
- Confirmation dialog: "Are you sure you want to reject this order?"
- On reject:
  - Update order status to "Rejected"
  - Full refund initiated automatically
  - Notify customer with reason
  - Log rejection for analytics
- Impact:
  - High rejection rate affects restaurant rating
  - Alert if rejection rate >10%

**SR-ORDER-001.5**: Update Order Status
- Status progression:
  - Confirmed → Preparing → Ready for Pickup → Out for Delivery → Delivered
- Status update triggers:
  - Manual button click
  - Auto-progression based on time (optional)
- Each status update:
  - Notifies customer
  - Logs timestamp
  - Updates tracking page
- Preparation timer:
  - Shows estimated time remaining
  - Alerts if overdue
  - Suggests updating status

**SR-ORDER-001.6**: Cancel Order
- Can cancel only before "Out for Delivery" status
- Requires reason (similar to reject)
- Confirmation dialog
- Full refund initiated
- Customer notified
- Impacts restaurant metrics

**SR-ORDER-001.7**: Order List View
- Tabs: Active | Completed | Cancelled
- Active orders sorted by urgency (oldest first)
- Visual indicators:
  - Red: Overdue preparation
  - Yellow: Nearing deadline
  - Green: On track
- Quick actions: Accept, Reject, Update Status
- Filter by date, status, payment method
- Search by order ID or customer name

**Acceptance Criteria**:
- ✅ AC-ORDER-001.1: New order notification within 5 seconds of placement
- ✅ AC-ORDER-001.2: Sound alert plays reliably on all devices
- ✅ AC-ORDER-001.3: Order details load within 1 second
- ✅ AC-ORDER-001.4: Accept/reject actions complete within 500ms
- ✅ AC-ORDER-001.5: Auto-accept works when enabled (accepts within 30 seconds)
- ✅ AC-ORDER-001.6: Status updates reflect in customer app within 10 seconds
- ✅ AC-ORDER-001.7: Cannot accept orders if restaurant marked closed
- ✅ AC-ORDER-001.8: Rejection reason required before reject allowed
- ✅ AC-ORDER-001.9: Order list loads 100 orders within 2 seconds

**Edge Cases**:

**EC-ORDER-001.1**: Order Received When Closed
- Scenario: Customer places order just as restaurant closes
- Expected: Auto-reject with reason "Restaurant closed"
- Validation: Check operating hours before accepting

**EC-ORDER-001.2**: Duplicate Order (User Double-Clicked)
- Scenario: Same items, same customer, within 1 minute
- Expected: Flag as potential duplicate, ask restaurant to confirm
- Validation: "This looks like a duplicate order. Accept anyway?"

**EC-ORDER-001.3**: Very Large Order (50+ Items)
- Scenario: Corporate order with 50 items
- Expected: Highlight as large order, ask for confirmation
- Validation: "Large order! Confirm you can fulfill within estimated time?"

**EC-ORDER-001.4**: Customer Unreachable
- Scenario: Customer phone number invalid or not answering
- Expected: Provide option to cancel with reason
- Validation: Log attempt to contact, allow cancellation after 2 tries

**EC-ORDER-001.5**: Power Outage During Order
- Scenario: Restaurant loses power, cannot prepare
- Expected: Allow status update with custom reason
- Validation: "Unforeseen circumstances" cancellation option

**Error Scenarios**:

**ES-ORDER-001.1**: Notification Service Down
- Trigger: FCM returns error
- Response: Store notification for retry, show in-app anyway
- Recovery: Retry notification every 30 seconds, up to 5 times

**ES-ORDER-001.2**: Status Update API Failure
- Trigger: Backend API returns 500
- Response: Retry with exponential backoff
- Recovery: Queue status update locally, sync when connection restored

**ES-ORDER-001.3**: Refund Initiation Failure
- Trigger: Payment gateway API error
- Response: Mark refund as pending, retry in background
- Recovery: Alert admin, manual intervention if retries fail

**ES-ORDER-001.4**: Database Write Failure
- Trigger: PostgreSQL connection lost
- Response: Show error, action not saved
- Recovery: "Failed to update order. Check connection and retry."

**Data Validation Rules**:

**DV-ORDER-001.1**: Order Data Model
```typescript
interface Order {
  id: string; // UUID
  orderNumber: string; // Human-readable (e.g., "ORD-12345")
  restaurantId: string;
  customerId: string;
  customer: {
    name: string;
    phone: string; // Masked except last 4 digits
    deliveryAddress: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      coordinates: {lat: number; lng: number};
    };
  };
  items: Array<{
    dishId: string;
    dishName: string;
    quantity: number; // Min 1
    price: number; // Price at time of order
    customizations?: Array<{
      name: string;
      value: string;
      priceModifier: number;
    }>;
    specialInstructions?: string;
  }>;
  pricing: {
    subtotal: number;
    taxAmount: number;
    deliveryFee: number;
    discountAmount: number;
    grandTotal: number;
  };
  payment: {
    method: 'CARD' | 'UPI' | 'NET_BANKING' | 'COD' | 'WALLET';
    status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
    transactionId?: string;
  };
  status: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 
          'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string; // ISO 8601
    updatedBy: string; // User ID or system
    notes?: string;
  }>;
  timings: {
    placedAt: string; // ISO 8601
    confirmedAt?: string;
    estimatedDeliveryAt: string;
    deliveredAt?: string;
    acceptanceDeadline: string; // 5 min from placedAt
  };
  rejectionReason?: {
    code: string;
    description: string;
  };
  metadata: {
    source: 'APP' | 'WEB' | 'PHONE';
    deliveryPartnerId?: string;
    restaurantNotes?: string;
  };
}
```

**Performance Metrics**:
- Notification delivery: <5 seconds
- Order details load: <1 second
- Accept/reject action: <500ms
- Status update propagation: <10 seconds
- Order list load: <2 seconds for 100 orders

**Dependencies**:
- FCM: Push notifications
- PostgreSQL: Order data storage
- Payment Gateway: Refund API
- Kafka: Order status events
- Customer Agent Backend: Status sync

**Test Strategy**:
- Unit tests: Status transition logic
- Integration tests: End-to-end order flow
- Load tests: 100 concurrent orders
- Notification tests: FCM delivery reliability
- Edge case tests: Duplicate, large, invalid orders
- Manual tests: Sound alerts, UI responsiveness

---

## 4. MCP Layer - Expanded Requirements

### 4.1 Provider Orchestration

#### [FR-MCP-ORCHESTRATION-001-EXP] Provider Routing & Aggregation - Expanded

**Description**: Intelligent routing of requests to appropriate MCP providers with result aggregation and normalization.

**Sub-Requirements**:

**SR-ORCH-001.1**: Provider Selection Logic
- Route based on:
  - Restaurant source (which provider owns this restaurant)
  - User preference (if they prefer specific provider)
  - Provider availability (health check status)
  - Performance metrics (latency, error rate)
  - Cost optimization (API call pricing)
- Default routing hierarchy:
  - 1st: Restaurant's native provider
  - 2nd: Provider with best performance
  - 3rd: Mock provider (fallback)
- Route configuration updatable without restart

**SR-ORCH-001.2**: Multi-Provider Aggregation
- For search queries:
  - Query all enabled providers in parallel
  - Merge results, remove duplicates (same restaurant on multiple platforms)
  - De-duplicate by restaurant name + location fuzzy match
  - Sort merged results by relevance
  - Limit to top 50 results
- Timeout handling:
  - Wait max 3 seconds for all providers
  - Return partial results if some providers timeout
  - Indicate which providers responded

**SR-ORCH-001.3**: Response Normalization
- Convert provider-specific formats to internal schema
- Field mapping:
  - Provider ID → Internal ID
  - Provider-specific enums → Standard enums
  - Currency conversion (if needed)
  - Date format standardization (ISO 8601)
  - Image URL transformation (CDN)
- Handle missing fields gracefully (use defaults)

**SR-ORCH-001.4**: Request Transformation
- Convert internal requests to provider-specific format
- Add provider-required headers:
  - API key
  - Request ID (for tracing)
  - User-Agent
- Parameter mapping:
  - Internal query params → Provider params
  - Filter translation
- Request validation before sending

**SR-ORCH-001.5**: Circuit Breaker Pattern
- Per-provider circuit breaker
- States: Closed (normal) | Open (failing) | Half-Open (testing)
- Threshold: 5 failures in 1 minute → Open
- Open duration: 30 seconds
- Half-Open: Allow 1 test request
  - Success → Close circuit
  - Failure → Re-open for another 30 seconds
- Metrics dashboard showing circuit states

**SR-ORCH-001.6**: Rate Limiting
- Per-provider rate limits:
  - Mock: Unlimited (local)
  - Swiggy: 100 requests/minute (hypothetical)
  - Zomato: 100 requests/minute (hypothetical)
- Token bucket algorithm
- Queue requests when limit reached
- Return 429 Too Many Requests if queue full
- Priority queue: User-facing > Background jobs

**SR-ORCH-001.7**: Caching Layer
- Cache provider responses in Redis
- Cache keys: Request hash + provider + user context
- TTL by endpoint:
  - Restaurant details: 5 minutes
  - Menu: 2 minutes
  - Search results: 1 minute
  - Availability: 30 seconds
  - Order status: No cache (always fresh)
- Cache invalidation on update events

**SR-ORCH-001.8**: Retry Strategy
- Exponential backoff: 1s, 2s, 4s
- Max 3 retries per request
- Retry only on transient errors:
  - Network timeouts
  - 5xx server errors
  - Rate limit exceeded (after backoff)
- Don't retry on:
  - 4xx client errors (except 429)
  - Invalid requests
  - Authentication failures

**Acceptance Criteria**:
- ✅ AC-ORCH-001.1: Routing selects correct provider >99% of time
- ✅ AC-ORCH-001.2: Multi-provider search aggregates within 3 seconds
- ✅ AC-ORCH-001.3: Duplicate restaurants removed accurately (>95% precision)
- ✅ AC-ORCH-001.4: Response normalization handles all provider formats
- ✅ AC-ORCH-001.5: Circuit breaker opens/closes correctly under load
- ✅ AC-ORCH-001.6: Rate limiting prevents exceeding provider quotas
- ✅ AC-ORCH-001.7: Cache hit rate >60% in production
- ✅ AC-ORCH-001.8: Retry logic succeeds on transient failures
- ✅ AC-ORCH-001.9: Failed provider doesn't affect overall availability

**Edge Cases**:

**EC-ORCH-001.1**: All Providers Down
- Scenario: Swiggy, Zomato both return 500, Mock MCP also fails
- Expected: Return cached results (even if stale)
- Validation: "Showing cached results. Some info may be outdated."

**EC-ORCH-001.2**: Restaurant on Multiple Providers
- Scenario: "Pizza Hut" on both Swiggy and Zomato with different IDs
- Expected: De-duplicate, merge data, show single result
- Validation: Use name + location + phone matching

**EC-ORCH-001.3**: Provider Returns Partial Data
- Scenario: Zomato API returns restaurant without menu
- Expected: Fill from another provider or mark as incomplete
- Validation: "Menu not available from this provider"

**EC-ORCH-001.4**: Slow Provider Delays Aggregation
- Scenario: Swiggy responds in 50ms, Zomato takes 10 seconds
- Expected: Timeout Zomato at 3s, return Swiggy results
- Validation: Indicate partial results, option to "Load more"

**EC-ORCH-001.5**: Rate Limit Reached Mid-Request
- Scenario: 100th request hits rate limit
- Expected: Queue and wait, or fail fast with retry-after header
- Validation: User sees "Please wait a moment" or cached result

**Error Scenarios**:

**ES-ORCH-001.1**: Provider API Authentication Failure
- Trigger: API key expired or invalid
- Response: Disable provider, alert admin
- Recovery: "Provider temporarily unavailable. Using alternatives."

**ES-ORCH-001.2**: Network Partition
- Trigger: Can't reach provider due to network issue
- Response: Open circuit breaker, use cache
- Recovery: Retry with exponential backoff

**ES-ORCH-001.3**: Malformed Provider Response
- Trigger: Provider returns invalid JSON
- Response: Log error, skip provider, use others
- Recovery: Return partial results from successful providers

**ES-ORCH-001.4**: Timeout During Aggregation
- Trigger: Provider exceeds 3-second timeout
- Response: Cancel request, use partial results
- Recovery: Indicate "Some results may be missing"

**ES-ORCH-001.5**: Cache Service Down
- Trigger: Redis unavailable
- Response: Skip cache, query providers directly
- Recovery: Degrade gracefully, higher latency but functional

**Data Validation Rules**:

**DV-ORCH-001.1**: Provider Configuration
```typescript
interface ProviderConfig {
  providerId: string; // 'mock' | 'swiggy' | 'zomato'
  enabled: boolean;
  priority: number; // Higher = preferred, 1-100
  baseUrl: string;
  authentication: {
    type: 'API_KEY' | 'OAUTH' | 'NONE';
    apiKey?: string;
    oauth?: {
      clientId: string;
      clientSecret: string;
      tokenUrl: string;
    };
  };
  rateLimits: {
    requestsPerMinute: number;
    burstLimit: number; // Max requests in burst
  };
  circuitBreaker: {
    failureThreshold: number; // Default 5
    timeoutSeconds: number; // Default 30
    halfOpenRequests: number; // Default 1
  };
  retry: {
    maxAttempts: number; // Default 3
    backoffMultiplier: number; // Default 2
    initialDelayMs: number; // Default 1000
  };
  timeout: {
    connect: number; // Milliseconds, default 2000
    read: number; // Milliseconds, default 5000
  };
  caching: {
    enabled: boolean;
    ttl: Record<string, number>; // TTL per endpoint pattern
  };
}
```

**DV-ORCH-001.2**: Normalized Response Schema
```typescript
interface NormalizedRestaurant {
  internalId: string; // Our UUID
  externalId: string; // Provider's ID
  providerId: string;
  name: string;
  description: string;
  cuisine: string[];
  address: {
    line1: string;
    city: string;
    postalCode: string;
    coordinates: {lat: number; lng: number};
  };
  rating: number; // Normalized to 0-5 scale
  reviewCount: number;
  priceRange: 1 | 2 | 3 | 4;
  deliveryTime: number; // Minutes
  isOpen: boolean;
  images: string[]; // CDN URLs
  metadata: {
    sourceProvider: string;
    lastSyncedAt: string; // ISO 8601
    dataQuality: number; // 0-100, completeness score
  };
}
```

**Performance Metrics**:
- Routing decision: <10ms
- Single provider request: p95 <1s
- Multi-provider aggregation: p95 <3s
- Response normalization: <50ms
- Cache lookup: <20ms
- Circuit breaker check: <1ms

**Dependencies**:
- Redis: Caching and rate limiting
- PostgreSQL: Provider configuration
- Kafka: Health check events
- Metrics: Prometheus + Grafana
- MCP Providers: External APIs

**Test Strategy**:
- Unit tests: Routing logic, normalization
- Integration tests: End-to-end provider calls
- Load tests: 5000 req/sec with all providers
- Chaos tests: Provider failures, network issues
- Contract tests: Provider response formats
- Performance tests: Latency benchmarks

---

## 5. LLM Service - Expanded Requirements

### 5.1 Prompt Management

#### [FR-LLM-PROMPT-001-EXP] Prompt Templates & Optimization - Expanded

**Description**: Structured prompt management with versioning, A/B testing, and performance tracking.

**Sub-Requirements**:

**SR-PROMPT-001.1**: Prompt Template Structure
- Template components:
  - System message (role, capabilities, constraints)
  - Context variables (user preferences, history, location)
  - User message (actual query)
  - Few-shot examples (for intent classification)
  - Output schema (JSON structure expected)
- Template placeholders: `{{variable_name}}`
- Conditional blocks: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`
- Template inheritance (base template + specific templates)

**SR-PROMPT-001.2**: Intent Classification Prompt
```
System: You are an intent classifier for a food ordering platform.
Analyze the user's message and identify their intent.

Supported Intents:
- search_restaurant: User wants to find restaurants
- search_dish: User wants to find specific dishes
- view_restaurant: User wants details of a restaurant
- add_to_cart: User wants to add items to cart
- checkout: User wants to place order
- track_order: User wants order status
- provide_feedback: User wants to rate/review
- general_query: Other questions

Context:
- User Location: {{user_location}}
- Recent Orders: {{recent_orders}}
- Current Cart: {{cart_items}}

User Message: "{{user_input}}"

Output JSON:
{
  "primaryIntent": "string",
  "confidence": 0-1,
  "entities": [
    {"type": "string", "value": "string"}
  ],
  "requiresClarification": boolean,
  "clarificationQuestion": "string (if needed)"
}
```

**SR-PROMPT-001.3**: Workflow Generation Prompt
```
System: You are a workflow orchestrator for a food ordering platform.
Given the user's intent and context, generate an executable workflow JSON.

Intent: {{intent}}
Entities: {{entities}}
User Context: {{user_context}}

Available Actions:
- search_restaurants(query, filters)
- get_restaurant_details(restaurant_id)
- search_dishes(query, restaurant_id)
- get_dish_details(dish_id)
- add_to_cart(dish_id, quantity, customizations)
- get_cart()
- checkout(address_id, payment_method)
- get_order_status(order_id)

Workflow Schema:
{
  "workflowId": "uuid",
  "steps": [
    {
      "stepId": "1",
      "action": "action_name",
      "params": {...},
      "dependencies": ["stepId"],
      "errorHandling": {
        "retry": {enabled: boolean, maxAttempts: number},
        "fallback": {alternativeStep: "stepId"}
      }
    }
  ]
}

Generate workflow:
```

**SR-PROMPT-001.4**: Conversational Response Prompt
```
System: You are a friendly food ordering assistant.
Generate a natural, helpful response based on the workflow result.

Workflow Result: {{workflow_result}}
Conversation History: {{conversation_history}}

Guidelines:
- Be concise (2-3 sentences)
- Use emoji sparingly (1-2 max)
- Provide clear next steps
- Handle errors gracefully
- Ask clarifying questions when needed

Generate response:
```

**SR-PROMPT-001.5**: Prompt Versioning
- Each template has semantic version (v1.0.0, v1.1.0, v2.0.0)
- Store templates in database with version history
- Active version configurable per template type
- Rollback to previous version in 1 click
- Compare versions side-by-side
- Migration plan for breaking changes

**SR-PROMPT-001.6**: A/B Testing Framework
- Split traffic: 50/50, 80/20, 90/10 (configurable)
- Variant A: Control (current prompt)
- Variant B: Experiment (new prompt)
- Metrics tracked:
  - Intent classification accuracy
  - Workflow success rate
  - User satisfaction (thumbs up/down)
  - Conversation length (shorter = better)
  - Task completion rate
- Statistical significance calculator (p-value < 0.05)
- Auto-promotion: If B is significantly better, make it default

**SR-PROMPT-001.7**: Prompt Performance Analytics
- Dashboard showing:
  - Average latency per prompt template
  - Token usage (input + output)
  - Cost per prompt ($ per 1K tokens)
  - Success rate (valid JSON output)
  - User feedback scores
- Breakdown by LLM provider
- Trends over time (daily, weekly, monthly)
- Alerts for anomalies (sudden accuracy drop)

**SR-PROMPT-001.8**: Dynamic Prompt Assembly
- Base prompt + Context enrichment
- Load user preferences from GraphDB
- Load recent orders from PostgreSQL
- Load current cart from Redis
- Load location from session
- Assemble full prompt in <100ms
- Context compression if prompt exceeds token limit

**Acceptance Criteria**:
- ✅ AC-PROMPT-001.1: Templates render with variables correctly
- ✅ AC-PROMPT-001.2: Intent classification prompt achieves >95% accuracy
- ✅ AC-PROMPT-001.3: Workflow generation prompt creates valid JSON >98% of time
- ✅ AC-PROMPT-001.4: Conversational responses rated helpful by users >90%
- ✅ AC-PROMPT-001.5: Version rollback completes within 1 minute
- ✅ AC-PROMPT-001.6: A/B tests show statistically significant results in 1 week
- ✅ AC-PROMPT-001.7: Prompt assembly completes in <100ms
- ✅ AC-PROMPT-001.8: Analytics dashboard updates in real-time

**Edge Cases**:

**EC-PROMPT-001.1**: Very Long Context
- Scenario: User has 100 orders in history, prompt exceeds token limit
- Expected: Compress context, keep only recent/relevant items
- Validation: Summarize history, keep last 5 orders

**EC-PROMPT-001.2**: Missing Context Variables
- Scenario: User location unknown
- Expected: Use fallback value or omit gracefully
- Validation: Template handles missing vars: `{{user_location || "Unknown"}}`

**EC-PROMPT-001.3**: Malformed Template
- Scenario: Template has syntax error (`{{#if}}` without closing)
- Expected: Validation catches before saving
- Validation: Template editor shows syntax errors

**EC-PROMPT-001.4**: A/B Test with No Traffic
- Scenario: Very few users, not enough data for significance
- Expected: Extend test duration or increase traffic allocation
- Validation: "Need 1000 samples for significance. Current: 50."

**EC-PROMPT-001.5**: LLM Output Doesn't Match Schema
- Scenario: LLM returns text instead of JSON
- Expected: Retry with stricter instructions
- Validation: Parse error → Append "IMPORTANT: Respond ONLY with valid JSON"

**Error Scenarios**:

**ES-PROMPT-001.1**: Template Rendering Failure
- Trigger: Template variable not found in context
- Response: Use default value or empty string
- Recovery: Log warning, render best-effort prompt

**ES-PROMPT-001.2**: LLM API Timeout
- Trigger: LLM takes >30 seconds
- Response: Cancel request, use fallback prompt or cached result
- Recovery: "This is taking longer than expected. Try simpler query?"

**ES-PROMPT-001.3**: Invalid JSON Response
- Trigger: LLM returns malformed JSON
- Response: Retry with clarifying instruction (max 2 retries)
- Recovery: If still fails, use rule-based fallback

**ES-PROMPT-001.4**: Context Loading Failure
- Trigger: GraphDB query times out
- Response: Use partial context (without preferences)
- Recovery: Degrade gracefully, less personalized but functional

**Data Validation Rules**:

**DV-PROMPT-001.1**: Prompt Template Schema
```typescript
interface PromptTemplate {
  id: string;
  name: string; // e.g., "intent_classification_v2"
  version: string; // Semantic version
  type: 'INTENT_CLASSIFICATION' | 'WORKFLOW_GENERATION' | 'CONVERSATIONAL_RESPONSE';
  template: {
    systemMessage: string;
    userMessageTemplate: string;
    outputSchema?: object; // JSON schema
    fewShotExamples?: Array<{
      input: string;
      output: string;
    }>;
  };
  metadata: {
    createdAt: string;
    createdBy: string;
    isActive: boolean;
    description: string;
    changeLog: string;
  };
  performance: {
    avgLatency: number;
    avgTokens: number;
    successRate: number;
    userSatisfaction: number;
  };
}
```

**DV-PROMPT-001.2**: A/B Test Configuration
```typescript
interface ABTest {
  id: string;
  name: string;
  description: string;
  variantA: {
    templateId: string;
    trafficPercentage: number; // 0-100
  };
  variantB: {
    templateId: string;
    trafficPercentage: number;
  };
  metrics: {
    primaryMetric: 'accuracy' | 'latency' | 'user_satisfaction';
    minimumSampleSize: number; // Default 1000
    significanceLevel: number; // Default 0.05
  };
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  results?: {
    variantA: {sampleSize: number; metric: number};
    variantB: {sampleSize: number; metric: number};
    winner?: 'A' | 'B' | 'INCONCLUSIVE';
    pValue: number;
  };
}
```

**Performance Metrics**:
- Template rendering: <50ms
- Context loading: <100ms
- Full prompt assembly: <150ms
- LLM API call: p95 <3s
- JSON parsing: <10ms
- A/B test query: <200ms

**Dependencies**:
- PostgreSQL: Template storage
- GraphDB: User context
- Redis: Session data, cart
- LLM APIs: Claude, OpenAI, Gemini
- Analytics: Prometheus, Grafana

**Test Strategy**:
- Unit tests: Template rendering
- Integration tests: End-to-end prompt → LLM → parse
- Accuracy tests: Benchmark datasets
- Load tests: 1000 prompts/second
- A/B tests: Real user traffic
- Manual tests: Prompt quality review

---

## 6. Workflow Service - Expanded Requirements

### 6.1 Temporal Workflow Execution

#### [FR-WORKFLOW-EXEC-001-EXP] Durable Workflow Execution - Expanded

**Description**: Reliable, fault-tolerant workflow execution using Temporal with comprehensive error handling.

**Sub-Requirements**:

**SR-EXEC-001.1**: Workflow Definition
- Workflow types:
  - `SearchRestaurantWorkflow`
  - `ViewRestaurantDetailsWorkflow`
  - `AddToCartWorkflow`
  - `CheckoutWorkflow`
  - `TrackOrderWorkflow`
- Each workflow defined as Temporal workflow class
- Workflow signature: `execute(input: WorkflowInput): WorkflowResult`
- Workflows are deterministic (no random, no direct I/O)
- Side effects in activities only

**SR-EXEC-001.2**: Activity Definition
- Activities are non-deterministic tasks:
  - `callMCPAPI(endpoint, params)`
  - `loadUserContext(userId)`
  - `updateCart(userId, items)`
  - `initiatePayment(orderId, amount)`
  - `sendNotification(userId, message)`
- Activities have retry policies
- Activities have timeout policies
- Activities are idempotent (safe to retry)

**SR-EXEC-001.3**: Workflow State Persistence
- Temporal persists workflow state after each activity
- Workflow can pause for days (e.g., waiting for payment confirmation)
- State includes:
  - Workflow input
  - Intermediate results
  - Activity outputs
  - Timers
  - Signals received
- State queryable at any time

**SR-EXEC-001.4**: Long-Running Workflows
- Support workflows lasting hours/days
- Use case: Order delivery tracking (ends when delivered)
- Workflow sleeps between status checks (saves resources)
- Workflow wakes on:
  - Timer expiration
  - External signal (status update from restaurant)
  - Cancellation request

**SR-EXEC-001.5**: Workflow History Tracking
- Every workflow execution has full history
- History includes:
  - Workflow started event
  - Activity scheduled/started/completed/failed events
  - Timer fired events
  - Workflow completed/failed/cancelled events
- History queryable via Temporal UI or API
- History retention: 30 days in Temporal, then archived to PostgreSQL

**Acceptance Criteria**:
- ✅ AC-EXEC-001.1: Workflows execute reliably under normal conditions
- ✅ AC-EXEC-001.2: Workflow state persists correctly after each activity
- ✅ AC-EXEC-001.3: Workflows resume correctly after worker restart
- ✅ AC-EXEC-001.4: Long-running workflows supported (24+ hours)
- ✅ AC-EXEC-001.5: Workflow history accurately logged
- ✅ AC-EXEC-001.6: Query workflow state returns current status within 100ms
- ✅ AC-EXEC-001.7: Workflow cancellation propagates to activities
- ✅ AC-EXEC-001.8: Deterministic execution (replay produces same result)

**Edge Cases**:

**EC-EXEC-001.1**: Workflow Stuck in Infinite Loop
- Scenario: Bug causes workflow to loop forever
- Expected: Timeout policy kills workflow after max duration (1 hour)
- Validation: Workflow fails with "ExecutionTimeout" error

**EC-EXEC-001.2**: Worker Crashes Mid-Activity
- Scenario: Temporal worker process crashes during activity execution
- Expected: Temporal reschedules activity on another worker
- Validation: Activity retried, workflow continues

**EC-EXEC-001.3**: Non-Deterministic Code in Workflow
- Scenario: Workflow uses Math.random() or Date.now()
- Expected: Temporal detects non-determinism on replay
- Validation: Workflow fails with "NonDeterministicError", developer alerted

**EC-EXEC-001.4**: Workflow Input Too Large
- Scenario: Workflow input exceeds 2MB limit
- Expected: Reject workflow with error
- Validation: "Workflow input too large. Use external storage."

**EC-EXEC-001.5**: Signal Lost Due to Timing
- Scenario: Signal sent to workflow that hasn't started yet
- Expected: Signal buffered, delivered when workflow starts
- Validation: Workflow receives signal even if sent early

**Error Scenarios**:

**ES-EXEC-001.1**: Activity Timeout
- Trigger: Activity exceeds configured timeout (e.g., 30s)
- Response: Temporal cancels activity, retries per policy
- Recovery: If max retries exhausted, workflow handles ActivityTimeoutError

**ES-EXEC-001.2**: Activity Returns Non-Serializable Result
- Trigger: Activity returns object with circular references
- Response: Serialization fails
- Recovery: Workflow fails with "SerializationError"

**ES-EXEC-001.3**: Temporal Server Unavailable
- Trigger: Temporal server down
- Response: Workflow workers queue tasks locally
- Recovery: When Temporal up, workers sync and resume

**ES-EXEC-001.4**: Workflow Cancelled by User
- Trigger: User cancels long-running workflow
- Response: Workflow receives cancellation signal
- Recovery: Workflow cleanup logic runs, resources released

**Data Validation Rules**:

**DV-EXEC-001.1**: Workflow Input Schema
```typescript
interface WorkflowInput {
  workflowId: string; // UUID
  userId: string;
  sessionId: string;
  intent: string;
  parameters: Record<string, any>; // Intent-specific params
  context: {
    location?: {lat: number; lng: number};
    preferences?: string[];
    cartId?: string;
  };
  metadata: {
    source: 'APP' | 'WEB';
    traceId: string; // For distributed tracing
    timestamp: string; // ISO 8601
  };
}
```

**DV-EXEC-001.2**: Workflow Result Schema
```typescript
interface WorkflowResult {
  success: boolean;
  result?: any; // Workflow-specific result
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    executionTimeMs: number;
    retryCount: number;
    activitiesExecuted: number;
  };
}
```

**DV-EXEC-001.3**: Activity Retry Policy
```typescript
interface ActivityRetryPolicy {
  initialInterval: number; // 1000ms
  backoffCoefficient: number; // 2.0
  maximumInterval: number; // 60000ms
  maximumAttempts: number; // 3
  nonRetryableErrorTypes: string[]; // e.g., ['ValidationError']
}
```

**Performance Metrics**:
- Workflow start latency: <200ms
- Activity scheduling latency: <50ms
- State query latency: <100ms
- Workflow throughput: 1000+ concurrent workflows per worker
- History size: <1MB per workflow

**Dependencies**:
- Temporal Server: Workflow orchestration
- PostgreSQL: Workflow metadata
- Redis: Job status cache
- Kafka: Workflow events
- MCP Providers: Activity I/O

**Test Strategy**:
- Unit tests: Workflow logic (mocked activities)
- Integration tests: End-to-end workflows with Temporal test server
- Replay tests: Ensure determinism
- Failure tests: Kill workers, timeout activities
- Load tests: 10,000 concurrent workflows
- Manual tests: Long-running workflow observation

---

## 7. Cross-Cutting Concerns

### 7.1 Error Handling & Recovery

#### [XC-ERROR-001] Comprehensive Error Handling Strategy

**Description**: Unified error handling across all services with consistent error codes, messages, and recovery strategies.

**Sub-Requirements**:

**SR-ERROR-001.1**: Error Classification
- Error categories:
  - **Client Errors (4xx)**:
    - VALIDATION_ERROR: Invalid input data
    - AUTHENTICATION_ERROR: Auth token invalid/expired
    - AUTHORIZATION_ERROR: User lacks permission
    - NOT_FOUND: Resource doesn't exist
    - CONFLICT: Resource state conflict (e.g., double booking)
    - RATE_LIMIT_EXCEEDED: Too many requests
  - **Server Errors (5xx)**:
    - INTERNAL_ERROR: Unexpected server error
    - SERVICE_UNAVAILABLE: Dependency down
    - TIMEOUT: Operation exceeded time limit
    - CIRCUIT_OPEN: Circuit breaker open
  - **Business Errors**:
    - RESTAURANT_CLOSED: Can't order, restaurant closed
    - OUT_OF_STOCK: Dish unavailable
    - PAYMENT_FAILED: Payment gateway error
    - DELIVERY_UNAVAILABLE: Address out of range

**SR-ERROR-001.2**: Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string; // e.g., "VALIDATION_ERROR"
    message: string; // User-friendly message
    details?: Array<{
      field?: string; // For validation errors
      issue: string;
      value?: any; // Redact sensitive data
    }>;
    traceId: string; // For debugging
    timestamp: string; // ISO 8601
    retryable: boolean; // Can client retry?
    retryAfter?: number; // Seconds to wait before retry
  };
}
```

**SR-ERROR-001.3**: Error Logging Strategy
- All errors logged to centralized logging (ELK stack)
- Log levels:
  - ERROR: 5xx errors, payment failures, data corruption
  - WARN: 4xx errors, business rule violations
  - INFO: Handled errors, retries
- Log structure:
  ```json
  {
    "level": "ERROR",
    "timestamp": "ISO 8601",
    "traceId": "UUID",
    "service": "customer-agent",
    "error": {
      "code": "SERVICE_UNAVAILABLE",
      "message": "MCP provider timeout",
      "stack": "..."
    },
    "context": {
      "userId": "...",
      "endpoint": "/api/v1/restaurants/search",
      "duration": 5000
    }
  }
  ```

**SR-ERROR-001.4**: User-Facing Error Messages
- Friendly, non-technical language
- Actionable guidance
- Examples:
  - ❌ "Database connection failed" (too technical)
  - ✅ "We're having trouble loading restaurants. Please try again." (user-friendly)
- Include support contact for critical errors
- Localization support (English, Hindi)

**SR-ERROR-001.5**: Automatic Retry Logic
- Retry matrix:
  | Error Type | Retry? | Strategy |
  |------------|--------|----------|
  | VALIDATION_ERROR | No | User must fix input |
  | TIMEOUT | Yes | Exponential backoff, max 3 |
  | SERVICE_UNAVAILABLE | Yes | Exponential backoff, max 3 |
  | RATE_LIMIT | Yes | Wait retryAfter duration |
  | PAYMENT_FAILED | Yes | Allow user to retry payment |
  | AUTHENTICATION_ERROR | No | User must re-login |

**SR-ERROR-001.6**: Circuit Breaker Integration
- Open circuit on repeated failures (5 in 1 min)
- While open:
  - Return cached data if available
  - Show degraded experience ("Some features unavailable")
  - Don't attempt failing operation
- Half-open test after 30 seconds
- Close circuit on success

**SR-ERROR-001.7**: Graceful Degradation
- Priority of features:
  1. Critical: Browse restaurants, view cart, place order
  2. Important: Search, recommendations, order tracking
  3. Nice-to-have: Reviews, ratings, social features
- When errors occur:
  - Disable non-critical features
  - Cache critical data for offline
  - Notify user of limitations
  - Auto-restore when service recovers

**SR-ERROR-001.8**: Error Monitoring & Alerting
- Alert triggers:
  - Error rate >1% for 5 minutes → Warning
  - Error rate >5% for 5 minutes → Critical
  - Specific error codes (PAYMENT_FAILED) → Immediate
  - Circuit breaker open → Immediate
- Alert channels:
  - PagerDuty for critical (24/7 oncall)
  - Slack for warnings (business hours)
  - Email for summaries (daily)

**Acceptance Criteria**:
- ✅ AC-ERROR-001.1: All errors return standard format
- ✅ AC-ERROR-001.2: User-facing messages are non-technical
- ✅ AC-ERROR-001.3: Retryable errors retry automatically
- ✅ AC-ERROR-001.4: Error logs include traceId for debugging
- ✅ AC-ERROR-001.5: Circuit breaker prevents cascading failures
- ✅ AC-ERROR-001.6: Graceful degradation maintains core functionality
- ✅ AC-ERROR-001.7: Alerts trigger within 1 minute of threshold breach
- ✅ AC-ERROR-001.8: Error rate <0.1% under normal load

**Edge Cases**:

**EC-ERROR-001.1**: Error During Error Handling
- Scenario: Logging service fails while logging an error
- Expected: Fallback to stdout, don't block main flow
- Validation: Error logged locally, main request continues

**EC-ERROR-001.2**: Infinite Retry Loop
- Scenario: Retry logic keeps retrying forever
- Expected: Max attempts enforced (3), then fail
- Validation: After 3 retries, return error to user

**EC-ERROR-001.3**: Multiple Simultaneous Errors
- Scenario: Database down + Redis down + LLM timeout
- Expected: Return highest priority error, log all
- Validation: User sees "Service temporarily unavailable"

**EC-ERROR-001.4**: Error in Circuit Breaker Logic
- Scenario: Circuit breaker itself fails
- Expected: Bypass circuit breaker, allow requests
- Validation: Log circuit breaker error, don't block traffic

**Error Scenarios**:

**ES-ERROR-001.1**: Unhandled Exception
- Trigger: Unexpected error not caught by try/catch
- Response: Global exception handler catches, logs, returns 500
- Recovery: "An unexpected error occurred. Our team has been notified."

**ES-ERROR-001.2**: Out of Memory
- Trigger: Service consumes too much memory
- Response: Process crashes, orchestrator restarts
- Recovery: Health check fails, traffic routed to healthy instances

**ES-ERROR-001.3**: Database Connection Pool Exhausted
- Trigger: All DB connections in use
- Response: Request queued or rejected
- Recovery: "Service busy. Please try again shortly."

**Data Validation Rules**:

**DV-ERROR-001.1**: Error Code Registry
```typescript
enum ErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  
  // Business Errors
  RESTAURANT_CLOSED = 'RESTAURANT_CLOSED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DELIVERY_UNAVAILABLE = 'DELIVERY_UNAVAILABLE',
}
```

**Performance Metrics**:
- Error detection latency: <10ms
- Error logging latency: <50ms
- Alert trigger latency: <1 minute
- Error rate: <0.1% target

**Dependencies**:
- Logging: ELK stack (Elasticsearch, Logstash, Kibana)
- Monitoring: Prometheus + Grafana
- Alerting: PagerDuty, Slack
- Tracing: Jaeger

**Test Strategy**:
- Unit tests: Error handling code paths
- Integration tests: End-to-end error scenarios
- Chaos tests: Kill dependencies, saturate resources
- Load tests: Error rate under high load
- Manual tests: User-facing error messages

---

### 7.2 Security & Data Protection

#### [XC-SECURITY-001] Comprehensive Security Requirements

**Description**: Multi-layered security covering authentication, authorization, data protection, and threat prevention.

**Sub-Requirements**:

**SR-SEC-001.1**: Authentication
- JWT token-based authentication
- Token structure:
  ```json
  {
    "sub": "user_id",
    "role": "customer | restaurant_owner | admin",
    "exp": 1234567890,
    "iat": 1234567000
  }
  ```
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Token rotation on refresh
- Logout invalidates tokens (blacklist in Redis)
- OAuth 2.0 for social login (Google, Facebook)
- MFA (Multi-Factor Authentication) for:
  - Restaurant owner accounts
  - Large transactions (>₹5000)
  - Account settings changes

**SR-SEC-001.2**: Authorization (RBAC)
- Roles:
  - **Customer**: Browse, order, review
  - **Restaurant Owner**: Manage menu, orders, analytics
  - **Admin**: Platform management, support
- Permissions matrix:
  | Resource | Customer | Restaurant Owner | Admin |
  |----------|----------|------------------|-------|
  | Browse restaurants | ✓ | ✓ | ✓ |
  | Place order | ✓ | ✗ | ✓ |
  | Manage menu | ✗ | ✓ (own) | ✓ (all) |
  | View analytics | ✗ | ✓ (own) | ✓ (all) |
  | Manage users | ✗ | ✗ | ✓ |
- Resource-level permissions: Owner can only edit own restaurant
- Permission checks at API gateway and service levels

**SR-SEC-001.3**: Data Encryption
- **At Rest**:
  - Database: AES-256 encryption
  - Backups: Encrypted before storage
  - PII fields: Application-level encryption
  - Payment data: Never stored (use tokens from gateway)
- **In Transit**:
  - HTTPS/TLS 1.3 for all external communication
  - mTLS for inter-service communication
  - Certificate pinning for mobile apps
- **Key Management**:
  - AWS KMS or HashiCorp Vault
  - Key rotation every 90 days
  - Separate keys for production/staging

**SR-SEC-001.4**: PII (Personally Identifiable Information) Protection
- PII fields: Name, email, phone, address, payment info
- Handling requirements:
  - Minimize collection (only what's needed)
  - Mask in logs (e.g., `9876543210` → `98****3210`)
  - Encrypt in database
  - Access audit (who accessed what, when)
  - Anonymize in analytics (aggregate only)
- GDPR compliance:
  - Right to access (export user data)
  - Right to deletion (anonymize, not hard delete)
  - Data retention: 3 years, then anonymize
  - Consent tracking

**SR-SEC-001.5**: API Security
- **Rate Limiting**:
  - Unauthenticated: 10 req/min per IP
  - Authenticated: 100 req/min per user
  - Admin: 1000 req/min
  - Burst allowance: 2x rate for 10 seconds
- **Input Validation**:
  - Whitelist validation (allowed chars, patterns)
  - Length limits on all inputs
  - Type checking (string, number, enum)
  - SQL injection prevention (parameterized queries)
  - XSS prevention (sanitize HTML, escape output)
  - Command injection prevention (no shell execution from input)
- **CORS (Cross-Origin Resource Sharing)**:
  - Allowed origins: app.foodbot.com, web.foodbot.com
  - Allowed methods: GET, POST, PUT, DELETE
  - Credentials allowed: true
  - Preflight cache: 24 hours
- **CSRF Protection**:
  - CSRF tokens for state-changing requests (POST, PUT, DELETE)
  - SameSite cookie attribute
  - Origin header validation
- **API Versioning**:
  - Version in URL: `/api/v1/...`
  - Deprecation notices 6 months in advance
  - Support 2 versions simultaneously

**SR-SEC-001.6**: Threat Prevention
- **DDoS Protection**:
  - Cloudflare or AWS Shield
  - Rate limiting per IP
  - CAPTCHA for suspicious traffic
- **Intrusion Detection**:
  - Monitor for SQL injection attempts
  - Monitor for path traversal attempts
  - Monitor for brute force login attempts
  - Auto-ban IPs with >10 failed logins in 5 min
- **Secrets Management**:
  - No secrets in code (use env vars or vault)
  - Secrets rotation every 90 days
  - Audit log of secret access
- **Dependency Security**:
  - Automated vulnerability scanning (Snyk, Dependabot)
  - Update dependencies monthly
  - No high/critical vulnerabilities in production

**SR-SEC-001.7**: Audit Logging
- Log all security-relevant events:
  - Login/logout
  - Failed authentication
  - Permission denied
  - Data export (GDPR requests)
  - Admin actions
  - PII access
- Audit log fields:
  ```json
  {
    "timestamp": "ISO 8601",
    "eventType": "LOGIN_SUCCESS",
    "userId": "...",
    "ipAddress": "...",
    "userAgent": "...",
    "resource": "/api/v1/auth/login",
    "outcome": "SUCCESS | FAILURE",
    "metadata": {...}
  }
  ```
- Audit log retention: 1 year
- Audit log immutability (append-only)

**SR-SEC-001.8**: Incident Response Plan
- Security incidents:
  - Data breach
  - DDoS attack
  - Unauthorized access
  - Payment fraud
- Response steps:
  1. Detect: Monitoring alerts
  2. Contain: Isolate affected systems
  3. Investigate: Root cause analysis
  4. Remediate: Fix vulnerability
  5. Notify: Users, authorities (if required)
  6. Review: Post-mortem, improve defenses
- Incident response team:
  - Security lead
  - DevOps engineer
  - Legal counsel
  - PR/Communications
- Incident response SLA: < 1 hour acknowledgment

**Acceptance Criteria**:
- ✅ AC-SEC-001.1: All API endpoints require authentication (except login/signup)
- ✅ AC-SEC-001.2: Authorization checks prevent unauthorized access
- ✅ AC-SEC-001.3: All data encrypted in transit (TLS 1.3)
- ✅ AC-SEC-001.4: PII fields encrypted at rest
- ✅ AC-SEC-001.5: No secrets in code (secrets scan passes)
- ✅ AC-SEC-001.6: Rate limiting prevents abuse
- ✅ AC-SEC-001.7: No high/critical vulnerabilities in dependencies
- ✅ AC-SEC-001.8: Audit logs capture all security events
- ✅ AC-SEC-001.9: GDPR data export works within 30 days

**Edge Cases**:

**EC-SEC-001.1**: Token Expires During Request
- Scenario: User starts request, token expires mid-request
- Expected: Request completes with expired token (grace period)
- Validation: Grace period of 60 seconds

**EC-SEC-001.2**: User Changes Role
- Scenario: User promoted from customer to restaurant owner
- Expected: Next request uses new role
- Validation: Token invalidated on role change, user must re-login

**EC-SEC-001.3**: Excessive Rate Limit Requests
- Scenario: User hits rate limit, keeps trying
- Expected: Ban increases (1 min → 5 min → 15 min)
- Validation: Exponential ban duration

**EC-SEC-001.4**: SQL Injection Attempt
- Scenario: User sends `'; DROP TABLE users; --` in input
- Expected: Input sanitized, query safe
- Validation: Parameterized queries prevent execution

**Error Scenarios**:

**ES-SEC-001.1**: Token Validation Failure
- Trigger: Invalid JWT signature
- Response: Return 401 Unauthorized
- Recovery: "Invalid token. Please login again."

**ES-SEC-001.2**: MFA Code Expired
- Trigger: User enters MFA code after 5-minute expiry
- Response: Return error, send new code
- Recovery: "Code expired. New code sent."

**ES-SEC-001.3**: Encryption Key Unavailable
- Trigger: KMS service down
- Response: Fail secure, reject requests
- Recovery: "Service temporarily unavailable."

**ES-SEC-001.4**: GDPR Data Export Failure
- Trigger: Database query times out during export
- Response: Retry export, notify user of delay
- Recovery: "Data export in progress. You'll receive email when ready."

**Data Validation Rules**:

**DV-SEC-001.1**: Password Requirements
```typescript
interface PasswordPolicy {
  minLength: 8;
  maxLength: 128;
  requireUppercase: true;
  requireLowercase: true;
  requireNumber: true;
  requireSpecialChar: true;
  preventCommon: true; // No "password123"
  preventReuse: 5; // Can't reuse last 5 passwords
}
```

**DV-SEC-001.2**: Rate Limit Configuration
```typescript
interface RateLimitConfig {
  unauthenticated: {
    requestsPerMinute: 10;
    burstSize: 20;
    banDuration: 60; // Seconds
  };
  authenticated: {
    requestsPerMinute: 100;
    burstSize: 200;
    banDuration: 300;
  };
  admin: {
    requestsPerMinute: 1000;
    burstSize: 2000;
    banDuration: 0; // No ban for admins
  };
}
```

**Performance Metrics**:
- Token validation: <10ms
- Permission check: <5ms
- Encryption/decryption: <50ms
- Rate limit check: <5ms

**Dependencies**:
- JWT Library: jsonwebtoken (Node.js)
- Encryption: AWS KMS or HashiCorp Vault
- Rate Limiting: Redis
- Security Scanning: Snyk, OWASP ZAP
- Secrets Management: AWS Secrets Manager

**Test Strategy**:
- Unit tests: Authentication, authorization logic
- Integration tests: End-to-end auth flows
- Security tests: OWASP Top 10 vulnerabilities
- Penetration testing: Annual third-party audit
- Compliance tests: GDPR data export/deletion
- Load tests: Rate limiting under high traffic

---

## 8. Testing Strategy

### 8.1 Comprehensive Testing Approach

**Description**: Multi-layered testing strategy ensuring quality, reliability, and performance.

**Testing Pyramid**:
```
        /\
       /E2E\       10% - End-to-End Tests
      /______\
     /        \
    /Integration\ 30% - Integration Tests
   /____________\
  /              \
 /  Unit Tests    \ 60% - Unit Tests
/__________________\
```

**SR-TEST-001.1**: Unit Testing
- **Coverage**: >80% line coverage
- **Tools**: Jest (JavaScript/TypeScript)
- **Focus**:
  - Pure functions (business logic)
  - Validators
  - Formatters
  - Data transformations
- **Mocking**: Mock external dependencies
- **Execution**: Run on every commit (CI pipeline)
- **Duration**: <5 minutes for full suite

**SR-TEST-001.2**: Integration Testing
- **Coverage**: All API endpoints
- **Tools**: Jest + Supertest
- **Focus**:
  - API request/response
  - Database interactions
  - Service-to-service calls
- **Test Database**: Isolated test DB (Docker)
- **Data Setup**: Fixtures and factories
- **Execution**: Run on PR creation
- **Duration**: <15 minutes for full suite

**SR-TEST-001.3**: End-to-End Testing
- **Coverage**: Critical user journeys
- **Tools**: Playwright
- **Scenarios**:
  1. User browses → adds to cart → checks out → places order
  2. Restaurant receives order → accepts → updates status → completes
  3. User tracks order → receives notification → provides feedback
- **Environments**: Staging environment
- **Execution**: Nightly and before releases
- **Duration**: <30 minutes for full suite

**SR-TEST-001.4**: Performance Testing
- **Tools**: Artillery, k6
- **Tests**:
  - Load testing: 1000 concurrent users
  - Stress testing: 5000 concurrent users
  - Spike testing: Sudden traffic surge
  - Soak testing: 24-hour sustained load
- **Metrics**:
  - Response time: p95, p99
  - Throughput: requests/second
  - Error rate: <0.1%
  - Resource usage: CPU, memory
- **Execution**: Weekly and before releases

**SR-TEST-001.5**: Security Testing
- **Tools**: OWASP ZAP, Snyk
- **Tests**:
  - Vulnerability scanning
  - Dependency checks
  - Penetration testing (annual)
  - Authentication/authorization tests
- **Execution**: On every build (dependency scan), quarterly (penetration)

**SR-TEST-001.6**: Accessibility Testing
- **Tools**: axe-core, Lighthouse
- **Standards**: WCAG 2.1 Level AA
- **Tests**:
  - Screen reader compatibility
  - Keyboard navigation
  - Color contrast
  - Alt text for images
- **Execution**: On every PR

**SR-TEST-001.7**: Chaos Engineering
- **Tools**: Chaos Monkey, Gremlin
- **Scenarios**:
  - Kill random service instances
  - Inject latency in network calls
  - Exhaust database connections
  - Simulate cloud provider outages
- **Execution**: Weekly in staging, monthly in production (off-peak)

**SR-TEST-001.8**: Test Data Management
- **Anonymized Production Data**: For realistic testing
- **Synthetic Data**: Generators for edge cases
- **Data Refresh**: Reset test DB daily
- **Data Privacy**: No real PII in test environments

**Acceptance Criteria**:
- ✅ AC-TEST-001.1: Unit test coverage >80%
- ✅ AC-TEST-001.2: All integration tests pass before merge
- ✅ AC-TEST-001.3: E2E tests cover critical user journeys
- ✅ AC-TEST-001.4: Performance tests meet SLA targets
- ✅ AC-TEST-001.5: No high/critical security vulnerabilities
- ✅ AC-TEST-001.6: Accessibility score >90 (Lighthouse)
- ✅ AC-TEST-001.7: Chaos tests demonstrate resiliency
- ✅ AC-TEST-001.8: Test suite runs in <1 hour total

---

## Appendix

### A. Missing Requirements Identified

Based on analysis of the original REQUIREMENTS.md, the following requirements were missing or under-specified and have been added in this expanded document:

1. **Error Handling**:
   - Comprehensive error taxonomy
   - Error response formats
   - Retry strategies
   - Circuit breaker patterns
   - Graceful degradation

2. **Audit Logging**:
   - Security event logging
   - PII access tracking
   - Admin action logs
   - Compliance requirements

3. **Data Consistency**:
   - Distributed transaction handling
   - Eventual consistency patterns
   - Conflict resolution strategies
   - Data synchronization across providers

4. **Integration Failure Scenarios**:
   - MCP provider failures
   - LLM API failures
   - Payment gateway failures
   - Notification service failures
   - Recovery strategies for each

5. **Monitoring & Observability**:
   - Metrics collection
   - Distributed tracing
   - Log aggregation
   - Alerting thresholds
   - Dashboard requirements

6. **Data Validation**:
   - Input validation rules
   - Output format specifications
   - Data sanitization
   - Type safety

7. **Performance Benchmarks**:
   - Latency targets (p50, p95, p99)
   - Throughput requirements
   - Resource usage limits
   - Scalability thresholds

8. **Testing Requirements**:
   - Testing pyramid
   - Coverage targets
   - Testing tools
   - Test execution frequency
   - Chaos engineering

### B. Recommended Next Steps

1. **Phase 1: Foundation** (Weeks 1-4)
   - Implement core data models
   - Set up databases (PostgreSQL, Redis, etc.)
   - Build authentication/authorization
   - Create error handling framework

2. **Phase 2: Customer Agent** (Weeks 5-8)
   - Build chat interface
   - Implement LLM integration
   - Create workflow service
   - Develop search functionality

3. **Phase 3: Restaurant Agent** (Weeks 9-10)
   - Build menu management
   - Implement order management
   - Create analytics dashboard

4. **Phase 4: MCP Layer** (Weeks 11-12)
   - Build orchestration layer
   - Implement Mock MCP
   - Create Elasticsearch indexing

5. **Phase 5: Integration & Testing** (Weeks 13-14)
   - End-to-end testing
   - Performance optimization
   - Security hardening

6. **Phase 6: Production Readiness** (Weeks 15-16)
   - Load testing
   - Monitoring setup
   - Documentation
   - Launch preparation

### C. Metrics Dashboard Requirements

**Must-Have Dashboards**:

1. **Customer Experience Dashboard**:
   - Active users (real-time)
   - Order conversion rate
   - Average session duration
   - Cart abandonment rate
   - Search success rate
   - Top searches

2. **Restaurant Operations Dashboard**:
   - Active orders
   - Average prep time
   - Order acceptance rate
   - Menu update frequency
   - Revenue (today/week/month)

3. **Technical Health Dashboard**:
   - API latency (p50, p95, p99)
   - Error rate (per endpoint)
   - Service uptime
   - Database connection pool status
   - Cache hit rate
   - LLM API usage

4. **Business Metrics Dashboard**:
   - GMV (Gross Merchandise Value)
   - Order volume
   - Average order value
   - Customer acquisition cost
   - Retention rate
   - NPS (Net Promoter Score)

### D. Document Maintenance

**Update Frequency**: This document should be reviewed and updated:
- Monthly: Performance metrics, success criteria
- Quarterly: Requirements additions, architectural changes
- Annually: Comprehensive review

**Change Management**:
- All changes require approval from Product Manager + Tech Lead
- Version control with semantic versioning
- Changelog maintained for major updates

---

**Document Status**: ✅ Complete
**Version**: 1.0.0
**Last Updated**: 2026-02-17
**Next Review**: 2026-03-17
**Owner**: Product & Engineering Team

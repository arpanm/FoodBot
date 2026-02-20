# Async Job Processing Requirements - Gateway API

**Component:** `apps/gateway-api`
**Category:** Core Architecture
**Status:** In Implementation
**Priority:** Critical

---

## Overview

The Gateway API implements an asynchronous job processing system for handling LLM-powered chat requests. This enables long-running operations (LLM inference, workflow execution, external API calls) to be processed without blocking the client.

---

## Functional Requirements

### FR-JOB-001: Job Submission
**Status:** ⚠️ In Implementation
**Location:** `src/modules/chat/chat.controller.ts`

**Description:** Users submit chat prompts that are processed asynchronously.

**Implementation Details:**
- Endpoint: `POST /api/v1/chat`
- Requires JWT authentication
- Returns job ID immediately (< 100ms response time)
- Job processing happens in background

**Request Schema:**
```typescript
{
  userId: string (from JWT)
  prompt: string (required, min 1 char, max 2000 chars)
  context?: {
    location?: { lat: number, lng: number }
    previousMessages?: Message[]
    preferences?: UserPreferences
  }
  providerPreferences?: {
    swiggy?: boolean
    zomato?: boolean
    ondc?: boolean
    internal?: boolean
  }
}
```

**Response:**
```typescript
{
  jobId: string (UUID)
  status: 'queued'
  estimatedWaitTime: number (seconds)
  createdAt: string (ISO 8601)
}
```

**Processing Flow:**
1. Validate request payload
2. Generate unique job ID
3. Store job in Redis with status 'queued'
4. Publish job to Kafka topic `chat-jobs`
5. Return job ID to client
6. Background worker picks up job from Kafka
7. Process through LLM → Workflow → MCP execution

**Rate Limiting:**
- 10 requests per minute per user
- 100 requests per minute per IP (burst)

---

### FR-JOB-002: Job Status Polling
**Status:** ⚠️ In Implementation
**Location:** `src/modules/chat/job.controller.ts`

**Description:** Clients poll job status to track progress and retrieve results.

**Implementation Details:**
- Endpoint: `GET /api/v1/chat/jobs/:jobId`
- Requires JWT authentication
- Returns current job status and result (if complete)

**Response Schema:**
```typescript
{
  jobId: string
  status: JobStatus // 'queued' | 'llm_processing' | 'workflow_executing' | 'completed' | 'failed'
  progress: {
    stage: string // 'llm' | 'workflow' | 'mcp_execution' | 'done'
    percentage: number // 0-100
    message: string // Human-readable progress message
  }
  result?: {
    response: string // LLM-generated response
    actions?: Action[] // Workflow actions (search, order, etc.)
    executionResults?: any // Results from MCP execution
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamps: {
    createdAt: string
    startedAt?: string
    completedAt?: string
  }
  metadata?: {
    llmProvider: string // 'claude' | 'openai' | 'gemini'
    workflowType?: string
    mcpProviders?: string[] // ['swiggy', 'zomato', 'internal']
  }
}
```

**Status Transitions:**
```
queued → llm_processing → workflow_executing → completed
                                             ↘ failed
```

**Polling Recommendations:**
- Initial poll: 500ms after submission
- Subsequent polls: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Max polling duration: 5 minutes
- After 5 minutes, consider job abandoned

**Caching:**
- Job status cached in Redis with 1-minute TTL
- Completed jobs cached for 24 hours
- Failed jobs cached for 1 hour

---

### FR-JOB-003: Job Status Updates
**Status:** ⚠️ In Implementation
**Location:** `src/modules/chat/job.service.ts`

**Description:** Background workers update job status as processing progresses.

**Update Mechanism:**
- Worker publishes status updates to Redis
- Status updates include progress percentage and stage
- Updates trigger cache invalidation

**Status Update Events:**
```typescript
enum JobEvent {
  QUEUED = 'queued',
  LLM_STARTED = 'llm_started',
  LLM_COMPLETED = 'llm_completed',
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_EXECUTING = 'workflow_executing',
  MCP_EXECUTION_STARTED = 'mcp_execution_started',
  MCP_EXECUTION_COMPLETED = 'mcp_execution_completed',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

**Implementation:**
```typescript
async updateJobStatus(jobId: string, event: JobEvent, data?: any) {
  const job = await this.getJob(jobId);

  job.status = mapEventToStatus(event);
  job.progress = calculateProgress(event);
  job.timestamps[event] = new Date();

  await this.redis.set(`job:${jobId}`, JSON.stringify(job), 'EX', 3600);

  // Publish to WebSocket for real-time updates (optional)
  await this.publishJobUpdate(jobId, job);
}
```

---

### FR-JOB-004: WebSocket Real-Time Updates (Optional)
**Status:** ❌ Planned
**Location:** `src/modules/chat/job.gateway.ts`

**Description:** Alternative to polling: clients subscribe to WebSocket for real-time job updates.

**Implementation:**
- WebSocket endpoint: `ws://api.foodbot.com/ws/jobs/:jobId`
- Requires JWT token in initial handshake
- Server pushes status updates to connected clients
- Auto-reconnect with exponential backoff

**Message Format:**
```typescript
{
  type: 'JOB_UPDATE',
  jobId: string,
  status: JobStatus,
  progress: Progress,
  timestamp: string
}
```

**Benefits:**
- Eliminates polling overhead
- Real-time feedback (< 500ms latency)
- Reduced server load

**Challenges:**
- WebSocket connection management
- Scalability with multiple instances
- Requires Redis pub/sub for multi-instance coordination

---

### FR-JOB-005: Job Cancellation
**Status:** ❌ Planned
**Location:** `src/modules/chat/job.controller.ts`

**Description:** Users can cancel in-progress jobs.

**Implementation Details:**
- Endpoint: `DELETE /api/v1/chat/jobs/:jobId`
- Requires JWT authentication
- Only job owner can cancel

**Cancellation Logic:**
1. Update job status to 'cancelled'
2. Publish cancellation event to Kafka
3. Worker checks cancellation flag before each step
4. Gracefully stop processing
5. Clean up resources (temp data, connections)

**Response:**
```typescript
{
  jobId: string,
  status: 'cancelled',
  message: 'Job cancelled successfully'
}
```

---

### FR-JOB-006: Job Result Persistence
**Status:** ⚠️ In Implementation
**Location:** `src/modules/chat/chat-history.service.ts`

**Description:** Completed job results are persisted for user history.

**Storage Strategy:**
- **Redis:** Short-term cache (24 hours)
- **PostgreSQL:** Long-term storage (90 days)
- **S3:** Archive for compliance (7 years)

**Database Schema:**
```sql
CREATE TABLE chat_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  llm_provider VARCHAR(50),
  workflow_type VARCHAR(100),
  mcp_providers TEXT[],
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_chat_history_user ON chat_history(user_id, created_at DESC);
CREATE INDEX idx_chat_history_job ON chat_history(job_id);
```

**Retention Policy:**
- Active users: 90 days
- Deleted users: 30 days after deletion
- Compliance archive: 7 years (encrypted)

---

## Technical Requirements

### NFR-JOB-001: Performance Targets
**Status:** ⚠️ In Implementation

**Response Times:**
- Job submission: < 100ms (p95)
- Job status query: < 50ms (p95)
- End-to-end processing: < 30s (p95)

**Throughput:**
- Job submissions: 1000 req/sec
- Status queries: 5000 req/sec
- Concurrent jobs: 10,000

**Scalability:**
- Horizontal scaling of API servers
- Worker pool auto-scaling based on queue depth
- Redis Cluster for job state

---

### NFR-JOB-002: Reliability
**Status:** ⚠️ In Implementation

**Requirements:**
- No job loss (Kafka persistence)
- At-least-once processing (idempotent workers)
- Automatic retry for transient failures
- Dead-letter queue for failed jobs

**Retry Strategy:**
```typescript
const retryPolicy = {
  maxRetries: 3,
  backoff: 'exponential', // 1s, 2s, 4s
  retryableErrors: [
    'TIMEOUT',
    'RATE_LIMIT',
    'SERVICE_UNAVAILABLE'
  ]
};
```

**Dead Letter Queue:**
- Failed jobs after max retries → DLQ
- Manual review and reprocessing
- Alerts for high DLQ depth

---

### NFR-JOB-003: Monitoring & Observability
**Status:** ⚠️ In Implementation

**Metrics:**
- Job submission rate (counter)
- Job processing duration (histogram)
- Job status distribution (gauge)
- Queue depth (gauge)
- Error rate by error type (counter)

**Logging:**
```typescript
{
  level: 'info',
  timestamp: '2026-02-20T10:30:00.000Z',
  jobId: 'job-abc-123',
  userId: 'user-456',
  event: 'JOB_COMPLETED',
  duration: 12500,
  llmProvider: 'claude',
  workflowType: 'search_restaurants',
  mcpProviders: ['swiggy', 'internal']
}
```

**Alerts:**
- Queue depth > 1000 (5 min sustained)
- Error rate > 5% (1 min sustained)
- Processing time > 60s (p95)
- Worker failures

---

## Job Processing Architecture

### Job Queue (Kafka)

**Topic:** `chat-jobs`
**Partitions:** 10 (keyed by userId for ordering)
**Retention:** 7 days

**Message Format:**
```typescript
{
  jobId: string,
  userId: string,
  prompt: string,
  context: ChatContext,
  providerPreferences: ProviderPreferences,
  createdAt: string
}
```

### Worker Pool

**Service:** `apps/chat-worker`

**Responsibilities:**
1. Consume jobs from Kafka
2. Process through LLM Router
3. Execute Temporal workflows
4. Invoke MCP Adapter for external operations
5. Update job status in Redis
6. Store results in PostgreSQL

**Scaling:**
- Min workers: 3
- Max workers: 20
- Auto-scale based on queue depth

**Configuration:**
```bash
WORKER_POOL_SIZE=5
KAFKA_GROUP_ID=chat-workers
KAFKA_TOPIC=chat-jobs
REDIS_JOB_STORE=redis://localhost:6379/2
```

---

## Integration Points

### LLM Router Integration

**Flow:**
1. Worker receives job
2. Sends prompt to LLM Router
3. LLM Router selects provider (Claude/OpenAI/Gemini)
4. Returns structured response + actions

**Request:**
```typescript
{
  userId: string,
  prompt: string,
  context: ChatContext
}
```

**Response:**
```typescript
{
  response: string,
  intent: 'search_restaurants' | 'place_order' | 'track_order',
  actions: Action[],
  confidence: number
}
```

---

### Temporal Workflow Integration

**Flow:**
1. Worker extracts actions from LLM response
2. Determines workflow type (search, order, track)
3. Starts Temporal workflow
4. Waits for workflow completion (with timeout)
5. Returns workflow result

**Workflow Types:**
- `SearchRestaurantsWorkflow`
- `PlaceOrderWorkflow`
- `TrackOrderWorkflow`
- `ModifyOrderWorkflow`

---

### MCP Adapter Integration

**Flow:**
1. Workflow activity invokes MCP Adapter
2. MCP Adapter aggregates results from providers
3. Returns normalized results
4. Workflow processes results

**Providers:**
- Swiggy (via OAuth)
- Zomato (via OAuth)
- ONDC (via protocol)
- Internal (direct DB)

---

## Error Handling

### Error Types

**User Errors (4xx):**
- Invalid prompt format
- Unauthorized access
- Rate limit exceeded

**System Errors (5xx):**
- LLM provider timeout
- Workflow execution failure
- MCP adapter unavailable
- Database connection error

**Error Response:**
```typescript
{
  jobId: string,
  status: 'failed',
  error: {
    code: 'LLM_TIMEOUT',
    message: 'LLM provider did not respond within 30 seconds',
    retryable: true,
    userMessage: 'Your request took too long to process. Please try again.'
  }
}
```

---

## Security

### Authentication & Authorization

**Requirements:**
- All job endpoints require JWT authentication
- Users can only access their own jobs
- Job IDs are UUIDs (non-guessable)
- Rate limiting per user and IP

### Data Protection

**Requirements:**
- Job data encrypted at rest (PostgreSQL encryption)
- Job data encrypted in transit (TLS)
- Sensitive data (PII) redacted in logs
- Job results expire after retention period

---

## Testing Requirements

### Unit Tests

**Coverage:**
- Job submission handler
- Status update logic
- Error handling
- Retry logic

### Integration Tests

**Scenarios:**
- End-to-end job flow (submission → completion)
- Job status polling
- Job cancellation
- Error scenarios (LLM timeout, workflow failure)
- Concurrent job processing

### Performance Tests

**Scenarios:**
- 1000 concurrent job submissions
- 5000 status queries per second
- Worker scaling under load
- Queue backlog recovery

---

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/chat` | POST | JWT | Submit chat prompt (async job) |
| `/chat/jobs/:jobId` | GET | JWT | Get job status and result |
| `/chat/jobs/:jobId` | DELETE | JWT | Cancel job (planned) |
| `/chat/history` | GET | JWT | Get user's chat history |
| `/chat/history/:id` | GET | JWT | Get specific chat by ID |

---

## Configuration

**Environment Variables:**
```bash
# Job Processing
JOB_TIMEOUT=30000                    # 30 seconds
JOB_MAX_RETRIES=3
JOB_BACKOFF_FACTOR=2

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_TOPIC_JOBS=chat-jobs
KAFKA_CONSUMER_GROUP=chat-workers

# Redis (Job State)
REDIS_JOB_STORE_URL=redis://localhost:6379/2
REDIS_JOB_TTL=86400                  # 24 hours

# Worker Pool
WORKER_POOL_SIZE=5
WORKER_CONCURRENCY=10

# LLM Router
LLM_ROUTER_URL=http://localhost:4000
LLM_ROUTER_TIMEOUT=25000             # 25 seconds

# Temporal
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=foodbot
```

---

## Future Enhancements

- [ ] WebSocket real-time updates (eliminate polling)
- [ ] Priority queue for premium users
- [ ] Job chaining (multi-turn conversations)
- [ ] Streaming LLM responses (progressive display)
- [ ] Job scheduling (delayed execution)
- [ ] Batch job processing
- [ ] Job analytics dashboard

---

**Last Updated:** 2026-02-20
**Documented By:** MCP Integration Requirements Update
**Related Documents:**
- `001_authentication_authorization.md`
- `.claude/project-management/requirements/llm-orchestration/`
- `.claude/project-management/requirements/workflows/`
- `.claude/project-management/requirements/mcp-orchestrator/`

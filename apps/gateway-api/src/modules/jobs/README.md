# Jobs API Module

## Overview

The Jobs API module manages agent jobs for automating food ordering tasks across different platforms (Swiggy, Zomato). It provides a complete job lifecycle management system with status tracking, progress monitoring, and result storage.

## Architecture

```
jobs/
├── dto/                          # Data Transfer Objects
│   ├── create-job.dto.ts        # Job creation payload
│   ├── update-job-status.dto.ts # Status update payload
│   ├── save-job-data.dto.ts     # Result data payload
│   └── job-response.dto.ts      # Response DTOs
├── __tests__/                    # Test files
│   ├── jobs.controller.spec.ts  # Unit tests
│   └── jobs.controller.e2e.spec.ts # Integration tests
├── jobs.controller.ts            # HTTP endpoints
├── jobs.service.ts               # Business logic
└── jobs.module.ts                # Module definition
```

## Entity Schema

```typescript
@Entity('agent_jobs')
export class AgentJob {
  id: string;                    // UUID primary key
  userId: string;                // UUID foreign key to users
  status: JobStatus;             // Current job status
  action: JobAction;             // Type of action to perform
  platform: string;              // Platform (swiggy/zomato)
  payload: Record<string, any>;  // Action-specific data
  result: Record<string, any>;   // Result data after completion
  currentStep: string;           // Current execution step
  progress: number;              // Progress percentage (0-100)
  errorMessage: string;          // Error details if failed
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
  completedAt: Date;             // Completion timestamp
}
```

## Enums

### JobStatus

- `PENDING` - Job created, waiting to be picked up
- `IN_PROGRESS` - Job is being executed
- `AWAITING_USER_ACTION` - Waiting for user input/confirmation
- `COMPLETED` - Job finished successfully
- `FAILED` - Job execution failed
- `CANCELLED` - Job cancelled by user

### JobAction

- `SEARCH_RESTAURANT` - Search for restaurants
- `OPEN_RESTAURANT` - Open restaurant details
- `ADD_TO_CART` - Add items to cart
- `CHECKOUT` - Complete checkout process
- `TRACK_ORDER` - Track order status

## API Endpoints

### Create Job

```http
POST /jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "search_restaurant",
  "platform": "swiggy",
  "payload": {
    "query": "pizza",
    "location": "Mumbai"
  }
}
```

**Response:**

```json
{
  "id": "job-uuid",
  "userId": "user-uuid",
  "status": "pending",
  "action": "search_restaurant",
  "platform": "swiggy",
  "payload": {
    "query": "pizza",
    "location": "Mumbai"
  },
  "result": null,
  "currentStep": null,
  "progress": 0,
  "errorMessage": null,
  "createdAt": "2024-02-17T10:00:00Z",
  "updatedAt": "2024-02-17T10:00:00Z",
  "completedAt": null
}
```

### Get Pending Jobs

```http
GET /jobs/pending?limit=10
Authorization: Bearer <token>
```

**Response:**

```json
{
  "jobs": [...],
  "total": 5
}
```

### Get My Jobs

```http
GET /jobs/my-jobs?limit=50
Authorization: Bearer <token>
```

**Response:**

```json
{
  "jobs": [...],
  "total": 20
}
```

### Get Job by ID

```http
GET /jobs/:jobId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "job-uuid",
  "userId": "user-uuid",
  "status": "in_progress",
  ...
}
```

### Update Job Status

```http
PATCH /jobs/:jobId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "currentStep": "Searching restaurants",
  "progress": 30
}
```

**Response:**

```json
{
  "id": "job-uuid",
  "status": "in_progress",
  "currentStep": "Searching restaurants",
  "progress": 30,
  ...
}
```

### Save Job Data

```http
POST /jobs/:jobId/data
Authorization: Bearer <token>
Content-Type: application/json

{
  "result": {
    "restaurants": [
      { "id": "rest-1", "name": "Pizza Hut" }
    ]
  }
}
```

**Response:**

```json
{
  "id": "job-uuid",
  "result": {
    "restaurants": [...]
  },
  ...
}
```

### Cancel Job

```http
DELETE /jobs/:jobId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "job-uuid",
  "status": "cancelled",
  "completedAt": "2024-02-17T10:05:00Z",
  ...
}
```

## Status Transitions

Valid status transitions:

```
PENDING → IN_PROGRESS
PENDING → CANCELLED
PENDING → FAILED

IN_PROGRESS → AWAITING_USER_ACTION
IN_PROGRESS → COMPLETED
IN_PROGRESS → FAILED
IN_PROGRESS → CANCELLED

AWAITING_USER_ACTION → IN_PROGRESS
AWAITING_USER_ACTION → COMPLETED
AWAITING_USER_ACTION → FAILED
AWAITING_USER_ACTION → CANCELLED

COMPLETED → (no transitions)
FAILED → (no transitions)
CANCELLED → (no transitions)
```

## Error Handling

### Common Errors

- `404 Not Found` - Job ID does not exist
- `403 Forbidden` - User does not have access to job
- `400 Bad Request` - Invalid status transition or payload
- `401 Unauthorized` - Missing or invalid authentication token

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid status transition from completed to pending",
  "error": "Bad Request"
}
```

## Usage Examples

### Agent Worker Flow

```typescript
// 1. Agent picks up pending job
const response = await fetch('/jobs/pending?limit=1', {
  headers: { Authorization: `Bearer ${agentToken}` }
});
const { jobs } = await response.json();
const job = jobs[0];

// 2. Update status to in_progress
await fetch(`/jobs/${job.id}/status`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${agentToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'in_progress',
    currentStep: 'Logging into platform',
    progress: 10
  })
});

// 3. Execute job action
const result = await executeJobAction(job);

// 4. Save result data
await fetch(`/jobs/${job.id}/data`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${agentToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ result })
});

// 5. Mark as completed
await fetch(`/jobs/${job.id}/status`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${agentToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'completed',
    progress: 100
  })
});
```

### User Flow

```typescript
// 1. User creates job
const response = await fetch('/jobs', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'search_restaurant',
    platform: 'swiggy',
    payload: { query: 'pizza' }
  })
});
const job = await response.json();

// 2. Poll for job completion
const pollJob = async () => {
  const response = await fetch(`/jobs/${job.id}`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const updatedJob = await response.json();

  if (updatedJob.status === 'completed') {
    console.log('Result:', updatedJob.result);
  } else if (updatedJob.status === 'failed') {
    console.error('Error:', updatedJob.errorMessage);
  } else {
    setTimeout(pollJob, 2000); // Poll every 2 seconds
  }
};

pollJob();
```

## Testing

### Run Unit Tests

```bash
npm test -- jobs.controller.spec
```

### Run E2E Tests

```bash
npm run test:e2e -- jobs.controller.e2e.spec
```

## Security

- All endpoints require JWT authentication
- Users can only access their own jobs
- Status transitions are validated to prevent invalid state changes
- Input validation using class-validator decorators

## Performance Considerations

- Database indexes on `userId`, `status`, and `createdAt` columns
- Default limits on list queries (10 for pending, 50 for user jobs)
- Progress tracking reduces need for frequent status checks
- Result data stored as JSONB for flexible querying

## Future Enhancements

- Webhook notifications for job completion
- Job retry mechanism for failed jobs
- Job priority levels
- Batch job operations
- Job scheduling with cron expressions

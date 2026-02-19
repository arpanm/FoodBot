# Background Service Worker - FoodBot Chrome Extension

This directory contains the background service worker components that handle API communication and job execution for the FoodBot Chrome Extension.

## Architecture

```
background/
├── service-worker.ts    # Main entry point, event handlers
├── api-client.ts        # Gateway API communication
├── job-poller.ts        # Job polling mechanism
├── job-executor.ts      # Job execution logic
└── README.md           # This file
```

## Components

### 1. Service Worker (`service-worker.ts`)

The main background script that:
- Initializes the extension on install/startup
- Manages message passing between popup and content scripts
- Coordinates job polling and execution
- Monitors extension health and API connectivity
- Handles browser events (tabs, alarms, commands)

**Key Features:**
- Automatic API health checks every 5 minutes
- Session management and cleanup
- Badge updates to show extension status
- Platform detection (Swiggy/Zomato)
- Content script injection

### 2. API Client (`api-client.ts`)

Handles all communication with the Gateway API:

**Methods:**
- `getPendingJobs(limit)` - Fetch pending jobs from API
- `getJobDetails(jobId)` - Get specific job information
- `updateJobStatus(jobId, update)` - Update job progress/status
- `saveJobData(jobId, data)` - Save job execution results
- `completeJob(jobId, result)` - Mark job as completed
- `reportJobFailure(jobId, error)` - Report job failure
- `healthCheck()` - Check API connectivity

**Features:**
- Configurable timeouts (default 10s)
- Automatic error handling
- Request/response logging
- AbortController for timeout handling

### 3. Job Poller (`job-poller.ts`)

Continuously polls the Gateway API for new jobs:

**Configuration:**
```typescript
{
  pollingInterval: 2000,        // 2 seconds between polls
  batchSize: 10,                // Max jobs to fetch per poll
  maxConcurrentJobs: 3,         // Max jobs executing simultaneously
  retryAttempts: 3,             // Max retry attempts per job
  retryDelay: 5000             // Delay between retries (ms)
}
```

**Features:**
- Automatic retry with exponential backoff
- Non-retriable error detection
- Health check before polling
- Concurrent job execution management
- Force poll capability

**Status Values:**
- `isPolling` - Whether polling is active
- `currentJobs` - Number of jobs currently executing
- `maxConcurrentJobs` - Maximum concurrent job limit

### 4. Job Executor (`job-executor.ts`)

Executes different types of jobs by communicating with content scripts:

**Supported Job Actions:**
- `SEARCH_RESTAURANT` - Search for restaurants
- `SELECT_RESTAURANT` - Select a restaurant
- `BROWSE_MENU` - Browse restaurant menu
- `ADD_TO_CART` - Add items to cart
- `MODIFY_CART` - Modify cart contents
- `CHECKOUT` - Initiate checkout
- `FILL_ADDRESS` - Fill delivery address
- `CONFIRM_ORDER` - Confirm order placement
- `EXTRACT_DATA` - Extract page data

**Workflow:**
1. Update job status to "in_progress"
2. Send action instruction to content script
3. Wait for content script response
4. Update job progress periodically
5. Save execution data
6. Mark job as completed or failed

## Job Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Gateway API                              │
│                 (Creates Jobs)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Job Poller                                 │
│  • Polls every 2 seconds                                    │
│  • Fetches pending jobs                                     │
│  • Manages concurrency                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Job Executor                               │
│  • Routes jobs by action type                               │
│  • Updates progress                                         │
│  • Handles errors and retries                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Content Scripts                               │
│  • Execute browser actions                                  │
│  • Return results                                           │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

### Retry Logic

Jobs are automatically retried up to 3 times with exponential backoff:

```typescript
Attempt 1: Immediate
Attempt 2: Wait 5 seconds
Attempt 3: Wait 10 seconds
```

### Non-Retriable Errors

The following errors will NOT be retried:
- `INVALID_PAYLOAD`
- `INVALID_ACTION`
- `AUTHENTICATION_FAILED`
- `PERMISSION_DENIED`

### Error Reporting

All errors are reported with:
- Error code
- Error message
- Stack trace
- Context (job ID, action, etc.)

## API Endpoints

The API client communicates with these endpoints:

```
GET  /api/health                    # Health check
GET  /api/jobs/pending?limit=10     # Get pending jobs
GET  /api/jobs/:jobId               # Get job details
PATCH /api/jobs/:jobId/status       # Update job status
POST /api/jobs/:jobId/data          # Save job data
```

## Status Badge

The extension badge shows current status:

| Badge | Color  | Meaning                    |
|-------|--------|----------------------------|
| ●     | Green  | Active - polling for jobs  |
| ●     | Orange | Paused - polling stopped   |
| ●     | Red    | Error - API unreachable    |

## Message Types

### From Popup/Content Script to Background:

```typescript
{
  type: 'START_ORDER',
  payload: { userId, sessionId, userMessage }
}

{
  type: 'UPDATE_STATUS',
  payload: { jobId, status, progress }
}

{
  type: 'EXTRACT_MENU',
  payload: {}
}

{
  type: 'ANALYZE_PAGE',
  payload: {}
}
```

### From Background to Content Script:

```typescript
{
  type: 'EXECUTE_ACTION',
  payload: {
    action: 'ADD_TO_CART',
    target: 'item-123',
    value: { quantity: 2 }
  }
}
```

## Storage

### Chrome Storage Sync:
- `apiBaseUrl` - Gateway API URL
- `autoStartPolling` - Auto-start polling on launch
- `pollingInterval` - Polling interval in ms

### Chrome Storage Local:
- `session_*` - Active user sessions
- Sessions expire after 24 hours
- Automatic cleanup every hour

## Commands (Keyboard Shortcuts)

- `toggle-polling` - Start/stop job polling
- `force-poll` - Trigger immediate poll

## Alarms (Periodic Tasks)

- `health-check` - Every 5 minutes
- `cleanup` - Every 60 minutes

## Development

### Testing Locally

1. Update API base URL:
```typescript
const apiClient = new ApiClient('http://localhost:3000');
```

2. Load extension in Chrome:
- Navigate to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `chrome-extension` directory

3. Monitor background console:
- Click "Inspect views: service worker" in extension card

### Debugging

Enable debug logging:
```typescript
console.log('[ServiceWorker] Message:', message);
console.log('[ApiClient] Request:', url);
console.log('[JobPoller] Status:', status);
console.log('[JobExecutor] Executing:', job.action);
```

### Configuration

Update polling configuration in `service-worker.ts`:
```typescript
const jobPoller = new JobPoller(apiClient, {
  pollingInterval: 2000,      // Faster/slower polling
  maxConcurrentJobs: 5,       // More/fewer concurrent jobs
  retryAttempts: 5,           // More/fewer retries
});
```

## Production Considerations

1. **API Base URL**: Update to production URL
2. **Polling Interval**: Consider increasing to reduce server load
3. **Error Monitoring**: Integrate with error tracking service
4. **Logging**: Reduce console logs in production
5. **Timeouts**: Adjust based on production performance
6. **Health Checks**: Monitor API availability

## Security

- No secrets in code (use environment/storage)
- All API requests use HTTPS in production
- Validate all job payloads before execution
- Sanitize all user inputs
- Implement rate limiting for API calls

## Performance

- Jobs execute concurrently (max 3 by default)
- Automatic cleanup of old sessions
- Health checks prevent unnecessary API calls
- Exponential backoff for retries
- Request timeouts prevent hanging

## Future Enhancements

- [ ] WebSocket support for real-time job updates
- [ ] Job prioritization
- [ ] Advanced retry strategies (circuit breaker)
- [ ] Job scheduling/queuing
- [ ] Performance metrics collection
- [ ] A/B testing support
- [ ] Multi-platform job routing

## Troubleshooting

### Issue: Jobs not being fetched

**Check:**
1. API health check passing? (`apiClient.healthCheck()`)
2. Polling active? (Check badge - should be green)
3. Network connectivity?
4. API endpoint accessible?

### Issue: Jobs failing to execute

**Check:**
1. Content script injected? (Check console)
2. Platform supported? (Swiggy/Zomato)
3. Valid job payload?
4. Browser permissions granted?

### Issue: High CPU usage

**Check:**
1. Polling interval too fast?
2. Too many concurrent jobs?
3. Infinite retry loop?
4. Memory leak in content scripts?

## License

Copyright (c) 2024 FoodBot. All rights reserved.

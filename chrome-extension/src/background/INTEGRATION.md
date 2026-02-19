# Integration Guide - Background Service Worker

This guide explains how the background service worker components integrate with the rest of the FoodBot system.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface                              │
│                    (Telegram Bot / Web UI)                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ Creates Order Request
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Gateway Service                               │
│                  (services/gateway-service)                         │
│  • Receives order requests                                          │
│  • Creates jobs in database                                         │
│  • Exposes REST API for job polling                                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ Polls via REST API
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Chrome Extension Background                        │
│                   (chrome-extension/background)                     │
│                                                                      │
│  ┌────────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   API Client   │───▶│  Job Poller  │───▶│  Job Executor   │   │
│  └────────────────┘    └──────────────┘    └─────────────────┘   │
│         │                      │                     │             │
│         │ Updates Status       │ Polls Every 2s      │ Sends       │
│         │                      │                     │ Actions     │
│         ▼                      ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Service Worker Coordinator                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ Message Passing
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Content Scripts                                 │
│               (chrome-extension/content-scripts)                    │
│  • Swiggy automation                                                │
│  • Zomato automation                                                │
│  • DOM manipulation                                                 │
│  • Action execution                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Job Creation (Gateway Service)

When a user sends an order request:

```typescript
// Gateway Service creates a job
const job = await jobRepository.create({
  userId: 'user-123',
  action: JobAction.SEARCH_RESTAURANT,
  platform: 'swiggy',
  status: JobStatus.PENDING,
  payload: {
    searchQuery: 'Pizza near me',
    location: 'Bangalore',
  },
  progress: 0,
});
```

### 2. Job Polling (Chrome Extension)

The background service worker polls for jobs:

```typescript
// Job Poller (every 2 seconds)
const jobs = await apiClient.getPendingJobs(10);
// Returns: [{ id: 'job-123', action: 'search_restaurant', ... }]

// Job Executor processes the job
await jobExecutor.executeJob(job);
```

### 3. Job Execution (Content Script Communication)

The executor sends actions to content scripts:

```typescript
// Background → Content Script
chrome.tabs.sendMessage(tabId, {
  type: 'EXECUTE_ACTION',
  payload: {
    action: BrowserAction.SEARCH_RESTAURANT,
    value: 'Pizza near me',
  },
});

// Content Script Response → Background
{
  success: true,
  data: {
    restaurantCount: 15,
    topRestaurants: [...]
  }
}
```

### 4. Status Updates (Back to Gateway)

The executor reports progress:

```typescript
// Update status: In Progress
await apiClient.updateJobStatus(jobId, {
  status: JobStatus.IN_PROGRESS,
  progress: 25,
  currentStep: 'Searching for restaurants',
});

// Save execution data
await apiClient.saveJobData(jobId, {
  searchResults: [...],
  timestamp: Date.now(),
});

// Complete the job
await apiClient.completeJob(jobId, {
  restaurantsFound: 15,
  executionTime: 2500,
});
```

## Message Flow Diagrams

### Scenario 1: Search Restaurant

```
User           Gateway        Background       Content Script    Swiggy
  │               │                │                  │             │
  │  "Pizza"      │                │                  │             │
  ├──────────────▶│                │                  │             │
  │               │ Create Job     │                  │             │
  │               ├───────────────▶│                  │             │
  │               │                │ Poll Jobs        │             │
  │               │◀───────────────┤                  │             │
  │               │                │ Execute Job      │             │
  │               │                ├─────────────────▶│             │
  │               │                │                  │ Search      │
  │               │                │                  ├────────────▶│
  │               │                │                  │ Results     │
  │               │                │                  ◀────────────┤
  │               │                │ Results          │             │
  │               │                ◀─────────────────┤             │
  │               │ Update Status  │                  │             │
  │               ◀────────────────┤                  │             │
  │               │ Save Data      │                  │             │
  │               ◀────────────────┤                  │             │
  │  Results      │                │                  │             │
  ◀───────────────┤                │                  │             │
```

### Scenario 2: Add to Cart

```
Background       Content Script         Swiggy
    │                   │                  │
    │ Add Item         │                  │
    ├──────────────────▶│                  │
    │                   │ Find Element    │
    │                   ├─────────────────▶│
    │                   │                  │
    │                   │ Click "Add"     │
    │                   ├─────────────────▶│
    │                   │                  │
    │                   │ Wait for Cart   │
    │                   │◀─────────────────┤
    │                   │                  │
    │ Item Added       │                  │
    ◀──────────────────┤                  │
    │                   │                  │
    │ Update Progress  │                  │
    │ (50%)            │                  │
```

## API Endpoints

### Gateway Service REST API

The background service worker communicates with these endpoints:

#### 1. Health Check
```http
GET /api/health
Response: { status: 'ok', timestamp: 1234567890 }
```

#### 2. Get Pending Jobs
```http
GET /api/jobs/pending?limit=10
Response: [
  {
    id: 'job-123',
    userId: 'user-123',
    action: 'search_restaurant',
    platform: 'swiggy',
    status: 'pending',
    payload: { searchQuery: 'Pizza' },
    progress: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]
```

#### 3. Get Job Details
```http
GET /api/jobs/:jobId
Response: {
  id: 'job-123',
  userId: 'user-123',
  action: 'search_restaurant',
  status: 'in_progress',
  progress: 50,
  currentStep: 'Searching restaurants',
  ...
}
```

#### 4. Update Job Status
```http
PATCH /api/jobs/:jobId/status
Body: {
  status: 'in_progress',
  progress: 50,
  currentStep: 'Searching restaurants'
}
Response: { success: true }
```

#### 5. Save Job Data
```http
POST /api/jobs/:jobId/data
Body: {
  data: {
    searchResults: [...],
    timestamp: 1234567890
  }
}
Response: { success: true }
```

## Configuration

### Environment Variables

The extension reads configuration from Chrome storage:

```javascript
// Default configuration
{
  apiBaseUrl: 'http://localhost:3000',
  autoStartPolling: true,
  pollingInterval: 2000,
  maxConcurrentJobs: 3,
  retryAttempts: 3
}
```

### Setting Configuration

Via Chrome Storage API:
```javascript
chrome.storage.sync.set({
  apiBaseUrl: 'https://api.production.com',
  pollingInterval: 5000,
  maxConcurrentJobs: 5
});
```

Via Extension Options Page:
```javascript
// In options UI
document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({
    apiBaseUrl: document.getElementById('apiUrl').value,
  });
});
```

## Error Handling

### Network Errors

```typescript
// API Client handles network errors
try {
  const jobs = await apiClient.getPendingJobs();
} catch (error) {
  // Logged but doesn't stop polling
  console.error('Failed to fetch jobs:', error);
  return []; // Return empty array
}
```

### Job Execution Errors

```typescript
// Job Executor reports failures
try {
  await executeJob(job);
} catch (error) {
  await apiClient.reportJobFailure(job.id, {
    code: 'EXECUTION_ERROR',
    message: error.message,
    stack: error.stack,
  });
}
```

### Retry Logic

```typescript
// Automatic retry with exponential backoff
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    await executeJob(job);
    return; // Success
  } catch (error) {
    if (isNonRetriable(error)) throw error;
    await delay(retryDelay * attempt);
  }
}
```

## Testing

### Unit Tests

```typescript
// Test API Client
describe('ApiClient', () => {
  it('should fetch pending jobs', async () => {
    const jobs = await apiClient.getPendingJobs(10);
    expect(jobs).toHaveLength(10);
  });
});
```

### Integration Tests

```typescript
// Test full workflow
describe('Job Execution', () => {
  it('should execute search job end-to-end', async () => {
    const job = createMockJob('search_restaurant');
    await jobExecutor.executeJob(job);
    expect(job.status).toBe(JobStatus.COMPLETED);
  });
});
```

### Manual Testing

1. Load extension in Chrome
2. Open Swiggy/Zomato
3. Check background console for logs
4. Verify API calls in Network tab
5. Monitor job status in database

## Monitoring

### Logging

All components log important events:

```typescript
console.log('[ServiceWorker] Extension started');
console.log('[ApiClient] Request:', url);
console.log('[JobPoller] Found 5 pending jobs');
console.log('[JobExecutor] Executing job', jobId);
```

### Metrics

Track these metrics:
- Jobs polled per minute
- Jobs executed successfully
- Jobs failed
- Average execution time
- API response times
- Retry counts

### Health Checks

Automatic health checks every 5 minutes:
```typescript
const isHealthy = await apiClient.healthCheck();
if (!isHealthy) {
  updateBadge('error');
  notifyUser('API unavailable');
}
```

## Security Considerations

1. **API Authentication**: Add API key to requests
2. **HTTPS Only**: Use HTTPS in production
3. **Input Validation**: Validate all job payloads
4. **Rate Limiting**: Implement rate limits on polling
5. **Error Sanitization**: Don't expose sensitive data in errors

## Performance Optimization

1. **Batch Processing**: Fetch multiple jobs per poll
2. **Concurrent Execution**: Execute up to 3 jobs simultaneously
3. **Smart Polling**: Skip polls when API is unhealthy
4. **Request Caching**: Cache health check results
5. **Cleanup**: Remove old session data regularly

## Deployment

### Development

```bash
# Build extension
cd chrome-extension
npm run build

# Load in Chrome
1. Go to chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select chrome-extension/dist
```

### Production

```bash
# Build for production
npm run build:prod

# Package extension
cd dist && zip -r ../extension.zip .
```

### Publishing

1. Create Chrome Web Store developer account
2. Upload extension.zip
3. Fill in store listing details
4. Submit for review

## Troubleshooting

### Common Issues

**Issue**: Jobs not being fetched
- Check API URL configuration
- Verify network connectivity
- Check Chrome DevTools console for errors

**Issue**: Jobs failing to execute
- Ensure content script is injected
- Check for JavaScript errors in page
- Verify platform compatibility

**Issue**: High CPU usage
- Reduce polling interval
- Decrease concurrent jobs
- Check for infinite loops

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Job queue management in extension
- [ ] Advanced error recovery strategies
- [ ] Performance metrics dashboard
- [ ] A/B testing framework
- [ ] Multi-account support
- [ ] Offline mode with queue sync

## Support

For issues or questions:
- GitHub Issues: https://github.com/foodbot/extension/issues
- Slack: #foodbot-extension
- Email: support@foodbot.com

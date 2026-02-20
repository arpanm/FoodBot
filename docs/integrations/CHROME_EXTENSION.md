# Chrome Extension Integration

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** ✅ Implemented

---

## Overview

The FoodBot Chrome Extension enables automated restaurant data extraction from Swiggy and Zomato websites using browser automation. This integration was chosen because neither platform provides public REST APIs for third-party applications.

**Location:** `/chrome-extension/`

---

## Architecture

### Integration Pattern: Job-Based Workflow

```
User Request → Gateway API → Job Queue → Chrome Extension → DOM Parsing → Results
```

1. **User Request**: FoodBot receives a search/order request
2. **Job Creation**: Gateway creates a job with parameters (platform, location, query)
3. **Extension Processing**: Chrome extension picks up job, navigates to website, extracts data
4. **Result Delivery**: Parsed data returned to Gateway, normalized to common format

### Key Components

```
chrome-extension/
├── manifest.json              # Extension configuration
├── src/
│   ├── background/           # Service worker for job management
│   ├── content-scripts/      # DOM parsing and automation
│   │   ├── common/          # Shared utilities
│   │   ├── swiggy/          # Swiggy-specific parsers
│   │   └── zomato/          # Zomato-specific parsers
│   ├── api/                 # Gateway API client
│   └── types/               # TypeScript type definitions
└── tests/                   # Unit and integration tests
```

---

## Supported Platforms

### Swiggy
- ✅ Restaurant search by location
- ✅ Menu extraction
- ✅ Pricing and availability
- ✅ Restaurant details (ratings, delivery time)
- ⚠️ Order placement (manual intervention required)

### Zomato
- ✅ Restaurant search by location
- ✅ Menu extraction
- ✅ Pricing and availability
- ✅ Restaurant details (ratings, delivery time)
- ⚠️ Order placement (requires authentication)

---

## Installation

### Development Setup

```bash
cd /Users/arpan1.mukherjee/code/FoodBot/chrome-extension

# Install dependencies
npm install

# Build extension
npm run build

# Development mode with auto-reload
npm run watch
```

### Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/chrome-extension/dist/` directory
5. Extension should appear with FoodBot icon

### Configuration

Create `.env` file in `chrome-extension/` directory:

```env
GATEWAY_API_URL=http://localhost:3000
GATEWAY_API_KEY=your_api_key_here
JOB_POLL_INTERVAL=5000
MAX_CONCURRENT_JOBS=2
```

---

## API Integration

### Gateway Job API

The extension communicates with the Gateway API's job endpoints:

#### Create Job
```http
POST /api/v1/jobs
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "platform": "swiggy",
  "action": "search",
  "parameters": {
    "location": "Bangalore",
    "query": "pizza",
    "filters": {
      "cuisine": "italian",
      "rating": 4.0
    }
  }
}
```

**Response:**
```json
{
  "jobId": "job-abc-123",
  "status": "pending",
  "createdAt": "2026-02-20T10:30:00Z"
}
```

#### Get Job Status
```http
GET /api/v1/jobs/{jobId}
Authorization: Bearer <api_key>
```

**Response:**
```json
{
  "jobId": "job-abc-123",
  "status": "completed",
  "result": {
    "restaurants": [
      {
        "id": "rest-1",
        "name": "Pizza Paradise",
        "rating": 4.5,
        "deliveryTime": "30-35 mins",
        "cuisine": ["Italian", "Pizza"],
        "priceForTwo": 400,
        "items": [...]
      }
    ]
  },
  "completedAt": "2026-02-20T10:30:15Z"
}
```

---

## DOM Parsing Strategy

### LLM-Assisted Parsing

The extension uses a hybrid approach:

1. **Static Selectors**: Predefined CSS selectors for known elements
2. **LLM Fallback**: When selectors fail, Claude analyzes DOM structure

**Example:**
```typescript
// Static selector approach
const restaurantName = document.querySelector('.restaurant-name')?.textContent;

// LLM fallback when structure changes
if (!restaurantName) {
  const llmResult = await llm.analyze({
    html: document.body.innerHTML,
    task: "Extract restaurant name from this HTML"
  });
  restaurantName = llmResult.name;
}
```

### Resilience Features

- **Selector Healing**: Automatically updates selectors when DOM changes
- **Multiple Strategies**: Tries multiple parsing approaches before failing
- **Error Recovery**: Graceful degradation when parsing fails
- **Rate Limiting**: Respects platform rate limits to avoid bans

---

## Data Normalization

Platform-specific responses are normalized to FoodBot's common schema:

```typescript
interface Restaurant {
  id: string;
  name: string;
  rating: number;
  cuisine: string[];
  priceForTwo: number;
  deliveryTime: string;
  availability: boolean;
  items: MenuItem[];
  metadata: {
    platform: 'swiggy' | 'zomato';
    platformId: string;
    lastUpdated: string;
  };
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  vegetarian: boolean;
  available: boolean;
  imageUrl?: string;
}
```

---

## Workflows

### Restaurant Search Workflow

1. **Job Creation**: Gateway creates search job
2. **Job Pickup**: Extension polls for pending jobs
3. **Navigation**: Extension opens Swiggy/Zomato in new tab
4. **Search**: Enters location and search query
5. **Extraction**: Parses restaurant list from results page
6. **Normalization**: Converts to common format
7. **Upload**: Sends results to Gateway API
8. **Cleanup**: Closes tab, marks job complete

### Menu Extraction Workflow

1. **Restaurant Selection**: Job specifies restaurant ID
2. **Navigation**: Extension opens restaurant page
3. **Menu Parsing**: Extracts all menu items, categories, prices
4. **Image Extraction**: Downloads menu item images (optional)
5. **Availability Check**: Verifies item availability
6. **Upload**: Sends menu data to Gateway API

---

## Error Handling

### Common Issues

#### Issue: Selector Not Found
**Cause:** Website structure changed
**Solution:** LLM fallback parsing
**Action:** Update selectors in next release

#### Issue: Rate Limiting
**Cause:** Too many requests
**Solution:** Exponential backoff, reduce concurrent jobs
**Action:** Configure `MAX_CONCURRENT_JOBS=1`

#### Issue: Authentication Required
**Cause:** Platform requires login
**Solution:** Manual authentication (future: OAuth integration)
**Action:** User logs in to Swiggy/Zomato before starting jobs

#### Issue: Job Timeout
**Cause:** Slow network, complex page
**Solution:** Increase timeout, retry with simpler parsing
**Action:** Configure `JOB_TIMEOUT_MS=60000`

---

## Performance

### Benchmarks

| Operation | Swiggy | Zomato | Notes |
|-----------|--------|--------|-------|
| Restaurant Search | 5-8s | 6-10s | Depends on network |
| Menu Extraction | 10-15s | 12-18s | Includes image loading |
| Single Job | 15-25s | 18-30s | End-to-end |

### Optimization

- **Parallel Jobs**: Run multiple jobs concurrently (max 2-3)
- **Caching**: Cache restaurant data for 1 hour
- **Image Lazy Loading**: Skip images unless explicitly requested
- **Headless Mode**: Future enhancement for faster processing

---

## Testing

### Unit Tests

```bash
cd chrome-extension
npm test
```

Coverage: 85% (target: 80%+)

### Integration Tests

```bash
npm run test:integration
```

Tests real DOM parsing against live websites (use sparingly to avoid rate limits).

### Manual Testing

1. Load extension in Chrome
2. Open Gateway dashboard
3. Create test job via API or UI
4. Verify job completion and data quality

---

## Deployment

### Production Configuration

```env
GATEWAY_API_URL=https://api.foodbot.com
GATEWAY_API_KEY=<production_key>
JOB_POLL_INTERVAL=10000
MAX_CONCURRENT_JOBS=2
ENABLE_TELEMETRY=true
```

### Chrome Web Store (Future)

Not yet published. Users must install manually via developer mode.

**Blockers:**
- Need to implement OAuth for production use
- Privacy policy required
- Store listing creation

---

## Security

### Permissions

The extension requires these permissions:

- `activeTab`: Access current tab for DOM parsing
- `storage`: Store configuration and cache
- `webRequest`: Monitor network requests (optional)

### Data Privacy

- **No PII Collection**: Extension doesn't collect personal information
- **Temporary Storage**: Parsed data deleted after job completion
- **Secure Communication**: HTTPS-only API calls
- **No Tracking**: No analytics or tracking scripts

---

## Known Limitations

1. **No Order Placement**: Extension doesn't support automated ordering (requires user interaction)
2. **Manual Authentication**: Users must be logged in to platforms
3. **Rate Limits**: Subject to platform rate limits (not officially sanctioned)
4. **DOM Changes**: Parsing breaks when platforms update their UI (requires maintenance)
5. **Single-User Mode**: One user per browser instance

---

## Future Enhancements

### Short Term
- [ ] OAuth integration for automatic authentication
- [ ] Headless browser support for server-side deployment
- [ ] Real-time menu updates via WebSocket

### Long Term
- [ ] Chrome Web Store publication
- [ ] Multi-platform support (Deliveroo, UberEats)
- [ ] AI-powered selector maintenance
- [ ] Order placement automation (with user consent)

---

## Troubleshooting

### Extension Not Loading Jobs

**Check:**
1. Gateway API URL configured correctly in `.env`
2. API key valid and not expired
3. Job queue has pending jobs (check Gateway dashboard)
4. Extension enabled in `chrome://extensions/`

**Solution:**
```bash
# Check extension logs
Open Chrome DevTools → Console → Filter: "FoodBot"

# Verify API connectivity
curl -H "Authorization: Bearer <api_key>" \
  https://api.foodbot.com/api/v1/jobs
```

### Parsing Errors

**Check:**
1. Website structure changed (compare with selectors)
2. JavaScript not fully loaded (increase wait time)
3. Rate limiting (reduce concurrent jobs)

**Solution:**
```typescript
// Increase wait time in content script
await new Promise(resolve => setTimeout(resolve, 5000));
```

---

## Related Documentation

- **Chrome Extension Setup Guide**: `/chrome-extension/SETUP_GUIDE.md`
- **Architecture Documentation**: `/chrome-extension/ARCHITECTURE.md`
- **Platform Abstraction Summary**: `/chrome-extension/PLATFORM_ABSTRACTION_SUMMARY.md`
- **API Integration Plan**: `.claude/project-management/archive/implementation-plans/CHROME_PLUGIN_INTEGRATION_PLAN.md`

---

## Support

For issues or questions:
1. Check `/chrome-extension/README.md` for setup issues
2. Review logs in Chrome DevTools
3. Contact development team with job ID and error details

---

**Last Updated:** 2026-02-20
**Maintained By:** FoodBot Engineering Team

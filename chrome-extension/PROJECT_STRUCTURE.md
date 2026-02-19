# FoodBot Chrome Extension - Project Structure

## Directory Layout

```
chrome-extension/
├── src/                          # Source code (TypeScript)
│   ├── background/               # Background service worker
│   │   └── service-worker.ts     # Main background script
│   ├── content-scripts/          # Content scripts for web pages
│   │   └── swiggy-content.ts     # Swiggy automation script
│   ├── ui/                       # User interface
│   │   ├── popup.html            # Extension popup HTML
│   │   └── popup.ts              # Popup logic
│   ├── shared/                   # Shared code and types
│   │   ├── types.ts              # TypeScript interfaces & types
│   │   └── constants.ts          # Configuration constants
│   └── llm/                      # AI integration
│       └── claude-client.ts      # Claude API client
├── dist/                         # Build output (generated, gitignored)
│   ├── background/
│   ├── content-scripts/
│   ├── ui/
│   ├── manifest.json
│   └── images/
├── images/                       # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── manifest.json                 # Chrome extension manifest (Manifest V3)
├── package.json                  # npm dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── webpack.config.js             # Webpack build configuration
├── .eslintrc.json               # ESLint rules
├── .gitignore                   # Git ignore patterns
├── README.md                    # Main documentation
├── SETUP_GUIDE.md              # Detailed setup instructions
└── PROJECT_STRUCTURE.md        # This file
```

## Core Files Explained

### manifest.json

**Purpose**: Defines extension metadata, permissions, and components

**Key Sections**:
- `manifest_version`: 3 (latest Chrome extension standard)
- `permissions`: Storage, notifications, scripting
- `host_permissions`: Allowed websites (Swiggy, Zomato)
- `background`: Service worker configuration
- `content_scripts`: Scripts injected into web pages
- `action`: Popup configuration

**When to edit**: Adding new permissions, content scripts, or changing metadata

---

### src/background/service-worker.ts

**Purpose**: Background process that coordinates extension components

**Responsibilities**:
- Message routing between popup and content scripts
- Session state management
- Chrome storage operations
- Notification handling
- Periodic cleanup tasks

**Key Classes**:
- `BackgroundService`: Main service worker class

**Message Handlers**:
- `START_ORDER`: Initiates order automation
- `EXTRACT_MENU`: Requests menu data from content script
- `ANALYZE_PAGE`: Requests page analysis
- `UPDATE_STATUS`: Updates session status

**When to edit**: Adding new message types, changing session logic, adding new background tasks

---

### src/content-scripts/swiggy-content.ts

**Purpose**: Runs in Swiggy web pages, performs DOM manipulation

**Responsibilities**:
- Page analysis and data extraction
- Restaurant and menu item parsing
- Cart management
- Browser action execution (click, type, scroll)
- Communication with background script

**Key Classes**:
- `SwiggyContentScript`: Main content script class

**Key Methods**:
- `analyzePage()`: Analyzes current page structure
- `extractRestaurants()`: Parses restaurant list
- `extractMenuItems()`: Parses menu items
- `executeAction()`: Executes browser actions

**When to edit**: Updating selectors, adding new actions, changing extraction logic

---

### src/ui/popup.ts

**Purpose**: Handles extension popup UI logic

**Responsibilities**:
- User input handling
- Form validation
- Message sending to background
- Status display
- Chrome storage operations

**Key Classes**:
- `PopupUI`: Main popup class

**Key Methods**:
- `handleSubmit()`: Processes order form submission
- `loadSavedData()`: Loads previous orders from storage
- `showStatus()`: Displays status messages

**When to edit**: Adding UI features, changing form behavior

---

### src/shared/types.ts

**Purpose**: TypeScript type definitions shared across all components

**Key Types**:
- `MessageType`: Enum of message types
- `ExtensionMessage`: Message structure
- `OrderRequest`: Order request data
- `MenuItem`, `Restaurant`, `CartItem`: Data models
- `PageAnalysis`: Page structure analysis
- `BrowserAction`: Available browser actions
- `Job`: Job tracking structure
- `ExtensionError`: Custom error class

**When to edit**: Adding new data structures, changing existing types

---

### src/shared/constants.ts

**Purpose**: Configuration constants and settings

**Key Constants**:
- `API_CONFIG`: API endpoints and timeouts
- `PLATFORM_URLS`: Swiggy and Zomato URLs
- `STORAGE_KEYS`: Chrome storage key names
- `TIMEOUTS`: Operation timeout values
- `SWIGGY_SELECTORS`: DOM selectors for Swiggy
- `LLM_CONFIG`: Claude AI configuration
- `FEATURE_FLAGS`: Enable/disable features

**When to edit**: Changing configurations, updating selectors, adjusting timeouts

---

### src/llm/claude-client.ts

**Purpose**: Integration with Claude AI API

**Responsibilities**:
- API key management
- Prompt building
- API request handling
- Response parsing
- Error handling

**Key Classes**:
- `ClaudeClient`: Claude API wrapper

**Key Methods**:
- `analyzePageAndDecide()`: Sends page analysis to Claude
- `buildPrompt()`: Constructs AI prompt
- `callClaude()`: Makes API request
- `parseResponse()`: Parses AI response

**When to edit**: Changing AI prompts, updating response parsing, modifying API calls

---

### webpack.config.js

**Purpose**: Webpack build configuration

**Key Configuration**:
- Entry points for each script
- TypeScript loader setup
- Output directory configuration
- Plugin configuration (copy, HTML generation)
- Source map settings

**When to edit**: Adding new entry points, changing build output, adding webpack plugins

---

### tsconfig.json

**Purpose**: TypeScript compiler configuration

**Key Settings**:
- `strict: true`: Enables all strict type checks
- `target: ES2020`: JavaScript version
- `moduleResolution: node`: Module resolution strategy
- `types: ["chrome"]`: Chrome API types

**When to edit**: Changing TypeScript strictness, adding new type definitions

---

### package.json

**Purpose**: npm package configuration

**Key Sections**:
- `scripts`: Build and development commands
- `devDependencies`: Development tools (TypeScript, Webpack, ESLint)
- `dependencies`: Runtime dependencies (Anthropic SDK)

**Scripts**:
- `build`: Production build
- `dev`: Development build with watch mode
- `lint`: Run ESLint
- `lint:fix`: Auto-fix linting issues
- `type-check`: TypeScript type checking

**When to edit**: Adding dependencies, changing scripts

---

## Data Flow

### Order Initiation Flow

```
User Input (popup.html)
    ↓
Popup UI (popup.ts)
    ↓ [chrome.runtime.sendMessage]
Background Service Worker (service-worker.ts)
    ↓ [chrome.tabs.sendMessage]
Content Script (swiggy-content.ts)
    ↓
Web Page (Swiggy.com)
```

### Page Analysis Flow

```
Content Script (swiggy-content.ts)
    ↓ [analyzePage()]
Page Analysis Object
    ↓ [chrome.runtime.sendMessage]
Background Service Worker (service-worker.ts)
    ↓ [API request]
Claude AI (claude-client.ts)
    ↓ [Response]
Background Service Worker
    ↓ [chrome.tabs.sendMessage]
Content Script
    ↓ [executeAction()]
Web Page
```

### State Management

```
Chrome Storage (chrome.storage.local)
    ↓
Stored Data:
├── Session info (session_*)
├── User preferences (foodbot_preferences)
├── Current order (foodbot_current_order)
├── API key (claude_api_key)
└── User ID (foodbot_user_id)
```

## Communication Patterns

### Message Passing

All inter-component communication uses Chrome's message passing API:

```typescript
// Sending message
chrome.runtime.sendMessage({
  type: MessageType.START_ORDER,
  payload: orderRequest,
});

// Receiving message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message
  sendResponse({ success: true });
  return true; // Keep channel open for async response
});
```

### Storage Operations

```typescript
// Save data
await chrome.storage.local.set({ key: value });

// Load data
const result = await chrome.storage.local.get('key');
const value = result.key;

// Remove data
await chrome.storage.local.remove('key');
```

## Build Process

### Development Build (`npm run dev`)

1. Webpack reads entry points from `webpack.config.js`
2. TypeScript files compiled via `ts-loader`
3. Modules bundled into output files
4. Manifest and images copied to `dist/`
5. HTML templates processed
6. Source maps generated
7. Watch mode enabled (auto-rebuild on changes)

### Production Build (`npm run build`)

Same as development but:
- Optimizations enabled
- No source maps (optional)
- Minification applied

## Extension Architecture

### Manifest V3 Architecture

```
┌─────────────────────────────────────────────┐
│              Chrome Browser                  │
├─────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────────┐  │
│  │  Popup UI    │    │  Service Worker  │  │
│  │  (popup.ts)  │◄──►│ (background)     │  │
│  └──────────────┘    └──────────────────┘  │
│         ▲                    ▲               │
│         │                    │               │
│         ▼                    ▼               │
│  ┌──────────────────────────────────────┐  │
│  │     Web Page (Swiggy.com)            │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │  Content Script                │  │  │
│  │  │  (swiggy-content.ts)           │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ▲
                    │ API Calls
                    ▼
          ┌─────────────────┐
          │   Claude AI     │
          │  (External API) │
          └─────────────────┘
```

## Key Design Patterns

### 1. Message-Based Architecture

All components communicate via messages, not direct calls.

**Benefits**:
- Loose coupling
- Easy to debug
- Aligns with Chrome extension security model

### 2. Type-Safe Communication

All messages and data structures are strongly typed.

**Benefits**:
- Compile-time error detection
- Better IDE autocomplete
- Self-documenting code

### 3. Separation of Concerns

- **Background**: Coordination and state
- **Content Scripts**: DOM interaction
- **Popup**: User interface
- **LLM Client**: AI integration

### 4. Error Handling

Custom `ExtensionError` class with error codes and context.

**Benefits**:
- Consistent error format
- Easy error tracking
- Better debugging

## Development Guidelines

### Adding a New Feature

1. **Define Types** (`src/shared/types.ts`)
   - Add necessary interfaces and enums

2. **Update Constants** (`src/shared/constants.ts`)
   - Add new configuration values

3. **Implement Logic**
   - Background: Add message handler
   - Content Script: Add DOM interaction
   - Popup: Add UI elements

4. **Test**
   - Build extension
   - Reload in Chrome
   - Test on Swiggy.com

5. **Document**
   - Update README.md
   - Add code comments

### Code Quality Checklist

- [ ] TypeScript strict mode compliance
- [ ] No `any` types
- [ ] Explicit return types
- [ ] Error handling for all async operations
- [ ] Timeouts for all external calls
- [ ] ESLint passing
- [ ] Functions under 50 lines
- [ ] Files under 300 lines
- [ ] Cyclomatic complexity under 10

## Security Considerations

### Manifest V3 Security

- No inline scripts (all scripts external)
- Content Security Policy enforced
- Host permissions explicitly declared
- Service workers (no persistent background pages)

### Data Protection

- API keys stored in Chrome storage (encrypted by Chrome)
- No sensitive data in logs
- HTTPS-only communication
- Minimal permissions requested

### Best Practices

1. Always validate user input
2. Sanitize data before DOM insertion
3. Use parameterized queries
4. Keep API keys separate from code
5. Implement rate limiting for API calls

---

**For more details, see README.md and SETUP_GUIDE.md**

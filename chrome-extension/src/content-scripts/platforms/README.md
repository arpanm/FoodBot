# Platform Abstraction Layer

## Overview

The Platform Abstraction Layer enables FoodBot Chrome Extension to support multiple food delivery platforms (Swiggy, Zomato, and future platforms) with maximum code reuse (target: 85%+).

## Architecture

```
┌─────────────────────────────────────────┐
│      Universal Content Script          │
│  (Detects platform & initializes)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Platform Factory                 │
│  (Creates platform-specific instance)   │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌─────────────┐ ┌─────────────┐
│   Swiggy    │ │   Zomato    │
│  Content    │ │  Content    │
│   Script    │ │   Script    │
└─────────────┘ └─────────────┘
        │             │
        └──────┬──────┘
               ▼
┌─────────────────────────────────────────┐
│       Shared Components (85%)           │
│  - DomParser                            │
│  - ActionSimulator                      │
│  - ElementFinder                        │
│  - Workflows (Search, Cart, Checkout)   │
└─────────────────────────────────────────┘
```

## Key Components

### 1. Types (`types.ts`)

Defines core interfaces and types:

- `Platform`: Enum of supported platforms (SWIGGY, ZOMATO, UNKNOWN)
- `SelectorConfig`: Multi-layered fallback selector configuration
- `IPlatformContentScript`: Interface all platform implementations must follow
- `IPageDetector`: Interface for page type detection

### 2. Platform Factory (`platform-factory.ts`)

**Responsibilities:**
- Multi-stage platform detection (URL → Meta Tags → DOM Signatures)
- Creates appropriate content script instance based on platform
- Validates platform detection confidence

**Detection Strategy:**
```typescript
Stage 1: URL-based (confidence: 1.0)
  ├─ Check hostname (www.swiggy.com, www.zomato.com)
  └─ Most reliable, fastest

Stage 2: Meta tags (confidence: 0.9-0.95)
  ├─ Check og:site_name
  ├─ Check meta property/name/content
  └─ Fallback when URL is ambiguous

Stage 3: DOM signatures (confidence: 0.7-0.8)
  ├─ Check platform-specific IDs/classes
  ├─ Check text patterns
  └─ Last resort fallback
```

**Usage:**
```typescript
// Check if platform is supported
if (PlatformFactory.isSupported()) {
  // Create platform-specific content script
  const script = await PlatformFactory.createContentScript();
  await script.initialize();
}
```

### 3. Selector Configuration

Each platform has its own selector config with **multi-layered fallback**:

**Priority Levels:**
1. **ARIA attributes** (Most stable) - `[aria-label*="Search"]`
2. **Placeholder text** - `input[placeholder*="Search"]`
3. **Semantic HTML** - `input[type="search"]`
4. **Data attributes** - `[data-testid="search"]`
5. **Class-based** - `.search-input`
6. **Structural** (Fallback) - `header input[type="text"]`

**Example:**
```typescript
searchInput: [
  'input[aria-label*="Search"]',      // Priority 1: ARIA
  'input[placeholder*="Search"]',     // Priority 2: Placeholder
  'input[type="search"]',             // Priority 3: Semantic
  'input[data-testid*="search"]',     // Priority 4: Data attrs
  'input.search-input',               // Priority 5: Class
  'header input[type="text"]',        // Priority 6: Structural
]
```

### 4. Platform Implementations

#### Swiggy (`swiggy/`)
- `swiggy-config.ts`: Platform configuration and URL patterns
- `swiggy-selectors.ts`: Swiggy-specific selectors with fallbacks
- `swiggy-content.ts`: Main content script implementation
- `swiggy-page-detector.ts`: Page type detection logic

#### Zomato (`zomato/`)
- `zomato-config.ts`: Platform configuration and URL patterns
- `zomato-selectors.ts`: Zomato-specific selectors with fallbacks
- `zomato-content.ts`: Main content script implementation
- `zomato-page-detector.ts`: Page type detection logic

## Platform Interface

All platform implementations must implement `IPlatformContentScript`:

```typescript
interface IPlatformContentScript {
  readonly platform: Platform;

  // Initialization
  initialize(): Promise<void>;

  // Configuration
  getSelectors(): SelectorConfig;
  getConfig(): PlatformConfig;

  // Data extraction
  extractRestaurants(): Restaurant[];
  extractMenuItems(): MenuItem[];
  extractCartItems(): CartItem[];

  // Operations
  searchRestaurant(name: string): Promise<SearchResult>;
  searchDish(name: string): Promise<SearchResult>;
  addToCart(options: {...}): Promise<CartResult>;
  removeFromCart(name: string): Promise<CartResult>;
  getCartContents(): Promise<CartResult>;
  clearCart(): Promise<CartResult>;
  startCheckout(options?: {...}): Promise<CheckoutResult>;
  applyCoupon(code: string): Promise<boolean>;

  // Message handling
  handleMessage(message: ExtensionMessage): Promise<MessageResponse>;
}
```

## Code Reuse

**Shared Components (85%):**
- `DomParser`: Extracts structured data from DOM
- `ActionSimulator`: Simulates user interactions
- `ElementFinder`: Finds elements with fallback logic
- `SearchWorkflow`: Search functionality
- `CartWorkflow`: Cart operations
- `CheckoutWorkflow`: Checkout process

**Platform-Specific (15%):**
- Selector configurations
- URL patterns
- Platform detection logic
- Minor parsing differences (e.g., price format)

## Adding a New Platform

1. **Create platform directory:**
   ```
   platforms/
     newplatform/
       newplatform-config.ts
       newplatform-selectors.ts
       newplatform-content.ts
       newplatform-page-detector.ts
   ```

2. **Define selectors** (`newplatform-selectors.ts`):
   ```typescript
   export const NEWPLATFORM_SELECTORS: SelectorConfig = {
     searchInput: [
       'input[aria-label*="Search"]',
       // ... fallbacks
     ],
     // ... all required selectors
   };
   ```

3. **Create configuration** (`newplatform-config.ts`):
   ```typescript
   export const NEWPLATFORM_CONFIG: PlatformConfig = {
     platform: Platform.NEWPLATFORM,
     baseUrl: 'https://www.newplatform.com',
     selectors: NEWPLATFORM_SELECTORS,
     urlPatterns: { /* ... */ },
   };
   ```

4. **Implement content script** (`newplatform-content.ts`):
   ```typescript
   export class NewPlatformContentScript implements IPlatformContentScript {
     public readonly platform = Platform.NEWPLATFORM;
     // ... implement all interface methods
   }
   ```

5. **Update Platform Factory**:
   ```typescript
   case Platform.NEWPLATFORM:
     const { NewPlatformContentScript } = await import('./newplatform/newplatform-content');
     return new NewPlatformContentScript();
   ```

6. **Update Platform enum** in `types.ts`:
   ```typescript
   export enum Platform {
     SWIGGY = 'swiggy',
     ZOMATO = 'zomato',
     NEWPLATFORM = 'newplatform',
     UNKNOWN = 'unknown',
   }
   ```

## Testing

### Platform Detection Tests
```typescript
describe('PlatformDetector', () => {
  it('should detect platform from URL', () => {
    mockLocation('https://www.swiggy.com');
    expect(detector.detectPlatform().platform).toBe(Platform.SWIGGY);
  });
});
```

### Selector Fallback Tests
```typescript
describe('Selector Fallback', () => {
  it('should use ARIA selectors first', () => {
    document.body.innerHTML = '<input aria-label="Search" />';
    const element = findElement(SWIGGY_SELECTORS.searchInput);
    expect(element).not.toBeNull();
  });
});
```

### Platform Implementation Tests
```typescript
describe('SwiggyContentScript', () => {
  it('should implement IPlatformContentScript', () => {
    const script = new SwiggyContentScript();
    expect(script.platform).toBe(Platform.SWIGGY);
    expect(typeof script.initialize).toBe('function');
  });
});
```

## Best Practices

### Selector Design
1. **Always provide multiple fallbacks** (minimum 3-5 per selector)
2. **Order by stability**: ARIA → Semantic → Class-based → Structural
3. **Use partial matching** for flexibility: `[aria-label*="Search"]`
4. **Test across platform updates** to ensure selectors remain valid

### Error Handling
1. **Graceful degradation**: If one selector fails, try next
2. **Log failures** for debugging and monitoring
3. **Return null/empty** rather than throwing errors
4. **Validate platform confidence** before operations

### Performance
1. **Lazy load** platform-specific modules
2. **Cache** detected platform
3. **Minimize DOM queries** - use selector arrays efficiently
4. **Avoid blocking** the main thread

### Maintainability
1. **Keep shared code generic** - avoid platform-specific logic
2. **Document platform differences** in comments
3. **Version selector configs** for tracking changes
4. **Regular audits** to update selectors after platform UI changes

## Monitoring & Maintenance

### Selector Health Monitoring
Track selector success rates:
```typescript
const metrics = {
  selector: 'searchInput',
  priority: 1,  // ARIA
  success: true,
  timestamp: Date.now(),
};
```

### Platform Detection Analytics
Monitor detection confidence:
```typescript
const detection = {
  platform: 'swiggy',
  confidence: 1.0,
  method: 'url',  // url | meta | dom
};
```

### Regular Maintenance Tasks
- **Weekly**: Check selector health metrics
- **Monthly**: Audit platform UI changes
- **Quarterly**: Update selector configurations
- **Annually**: Review platform abstraction architecture

## Troubleshooting

### Platform Not Detected
1. Check URL patterns in config
2. Verify meta tag detection logic
3. Add platform-specific DOM signatures
4. Increase logging verbosity

### Selectors Not Working
1. Inspect target element in DevTools
2. Check selector priority order
3. Add new fallback selectors
4. Test with different page states (loading, error, etc.)

### Low Code Reuse
1. Identify platform-specific logic in shared components
2. Abstract differences into configuration
3. Create platform-agnostic interfaces
4. Refactor duplicated code into utilities

## Future Enhancements

1. **Dynamic selector learning**: ML-based selector generation
2. **Real-time selector validation**: Monitor selector health in production
3. **Platform plugin system**: Hot-load new platforms without rebuild
4. **Visual selector editor**: GUI for creating/testing selectors
5. **Cross-platform testing**: Automated UI tests across all platforms

## Resources

- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [ARIA Labels Best Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Platform Factory Pattern](https://refactoring.guru/design-patterns/factory-method)

## Contributing

When contributing platform support:
1. Follow the platform implementation checklist
2. Write comprehensive tests (>80% coverage)
3. Document platform-specific quirks
4. Update this README with any architectural changes
5. Submit selector configurations for review

---

**Last Updated:** 2026-02-19
**Version:** 1.0.0
**Maintainers:** FoodBot Team

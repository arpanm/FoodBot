# Content Scripts

Content scripts run in the context of Swiggy/Zomato web pages and provide DOM manipulation and browser automation capabilities.

## Architecture

```
content-scripts/
├── swiggy-content.ts      # Main content script entry point
├── dom-parser.ts          # DOM parsing and data extraction
├── action-simulator.ts    # Human-like interaction simulation
├── element-finder.ts      # Element location and waiting
└── workflows/             # High-level automation workflows
    ├── search-workflow.ts
    ├── cart-workflow.ts
    └── checkout-workflow.ts
```

## Components

### 1. SwiggyContentScript

Main entry point that loads when a Swiggy page opens. Handles message passing with the background script and coordinates all workflows.

**Key Features:**
- Message handling from background script
- DOM snapshot generation
- Workflow coordination
- Legacy compatibility with old message types

**Usage:**
```typescript
// Automatically initialized when script loads
const contentScript = new SwiggyContentScript();
await contentScript.initialize();
```

### 2. DomParser

Extracts structured data from the DOM.

**Key Features:**
- Build DOM snapshots with interactive elements
- Extract restaurants from listing pages
- Extract menu items from restaurant pages
- Extract cart items and order summaries
- Find elements by text, role, or selector

**Usage:**
```typescript
const parser = new DomParser();

// Get DOM snapshot
const snapshot = parser.buildDOMSnapshot();

// Extract data
const restaurants = parser.extractRestaurants();
const menuItems = parser.extractMenuItems();
const cartItems = parser.extractCartItems();
const orderSummary = parser.extractOrderSummary();

// Find elements
const element = parser.findElementByText('Add to Cart');
```

### 3. ActionSimulator

Simulates human-like browser interactions.

**Key Features:**
- Human-like clicks with delays
- Character-by-character typing with random delays
- Smooth scrolling
- Element hovering
- Wait utilities

**Usage:**
```typescript
const simulator = new ActionSimulator();

// Click element
await simulator.clickElement(button, {
  delay: 200,
  scrollIntoView: true,
});

// Type text
await simulator.typeIntoInput(input, 'Pizza', {
  clearFirst: true,
  pressEnter: true,
});

// Scroll
await simulator.scrollToElement(element);
await simulator.scrollToTop();
await simulator.scrollToBottom();

// Wait
await simulator.waitForPageIdle(2000);
await simulator.waitForElement('.menu-item', { timeout: 5000 });
```

### 4. ElementFinder

Locates specific UI elements on Swiggy/Zomato.

**Key Features:**
- Find common elements (search, cart, checkout)
- Wait for elements to appear
- Multiple selector strategies with fallbacks
- Retry logic for flaky elements

**Usage:**
```typescript
const finder = new ElementFinder();

// Find specific elements
const searchInput = await finder.findSearchInput();
const searchButton = await finder.findSearchButton();
const restaurantCards = await finder.findRestaurantCards();

// Find with options
const element = await finder.findByText('Checkout', {
  timeout: 5000,
  retries: 3,
  scrollIntoView: true,
});

// Wait for element
const element = await finder.waitForElement('.cart-button', {
  timeout: 10000,
});
```

### 5. SearchWorkflow

Handles restaurant and dish search operations.

**Key Features:**
- Search for restaurants
- Search for dishes
- Clear search
- Navigate to restaurant
- Apply filters

**Usage:**
```typescript
const workflow = new SearchWorkflow();

// Search restaurant
const result = await workflow.searchRestaurant('Pizza Hut');
console.log('Found restaurants:', result.restaurants);

// Search dish
const result = await workflow.searchDish('Margherita Pizza');

// Navigate to restaurant
await workflow.navigateToRestaurant(restaurant);

// Apply filters
await workflow.applyFilters({
  rating: 4,
  cuisine: 'Italian',
});
```

### 6. CartWorkflow

Handles adding items to cart and cart management.

**Key Features:**
- Add items to cart
- Add multiple items
- Remove items
- Update quantities
- Clear cart
- Get cart contents

**Usage:**
```typescript
const workflow = new CartWorkflow();

// Add to cart
const result = await workflow.addToCart({
  dishName: 'Margherita Pizza',
  quantity: 2,
  customizations: ['Extra Cheese', 'Thin Crust'],
});

// Add multiple items
await workflow.addMultipleToCart([
  { dishName: 'Pizza', quantity: 1 },
  { dishName: 'Coke', quantity: 2 },
]);

// Update quantity
await workflow.updateCartItemQuantity('Pizza', 3);

// Remove item
await workflow.removeFromCart('Pizza');

// Clear cart
await workflow.clearCart();

// Get cart contents
const { cartItems } = await workflow.getCartContents();
```

### 7. CheckoutWorkflow

Handles checkout process including address and payment.

**Key Features:**
- Navigate to checkout
- Set delivery address
- Select payment method
- Apply coupons
- Review order
- Place order (with safety checks)

**Usage:**
```typescript
const workflow = new CheckoutWorkflow();

// Start checkout
const result = await workflow.execute({
  address: '123 Main St, City',
  paymentMethod: 'cash',
  saveAddress: true,
});

console.log('Order summary:', result.orderSummary);

// Apply coupon
await workflow.applyCoupon('SAVE20');

// Add delivery instructions
await workflow.addDeliveryInstructions('Ring the doorbell');

// CAUTION: This places a real order!
const result = await workflow.placeOrder();
console.log('Order placed:', result.orderId);
```

## Message Types

Content script responds to these message types from the background script:

### New Workflow Messages

- `GET_DOM_SNAPSHOT` - Get current DOM snapshot
- `SEARCH_RESTAURANT` - Search for a restaurant
- `SEARCH_DISH` - Search for a dish
- `ADD_TO_CART` - Add item to cart
- `REMOVE_FROM_CART` - Remove item from cart
- `UPDATE_CART_QUANTITY` - Update item quantity
- `GET_CART_CONTENTS` - Get current cart contents
- `CLEAR_CART` - Clear the cart
- `START_CHECKOUT` - Start checkout process
- `APPLY_COUPON` - Apply coupon code

### Legacy Messages (Backward Compatible)

- `START_ORDER` - Start order automation
- `EXTRACT_MENU` - Extract menu items
- `ANALYZE_PAGE` - Analyze current page
- `EXECUTE_ACTION` - Execute a browser action

## Message Format

**Request:**
```typescript
{
  type: 'ADD_TO_CART',
  payload: {
    dishName: 'Pizza',
    quantity: 2,
    customizations: ['Extra Cheese']
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    cartItems: [...]
  },
  error?: 'Error message'
}
```

## DOM Selectors

Content scripts use flexible selectors that work across Swiggy updates:

```typescript
// Multiple selector strategies with fallbacks
const selectors = [
  '[data-testid="menu-item"]',  // Test ID (most stable)
  '.menu-item',                  // Class name
  '[class*="menu"][class*="item"]', // Partial class match
];
```

## Human-Like Behavior

All actions include human-like timing:

- **Typing**: 50-200ms between characters
- **Clicking**: 100-300ms before/after clicks
- **Scrolling**: Smooth animations with easing
- **Waiting**: Random delays to avoid detection

## Error Handling

All workflows return structured results:

```typescript
interface WorkflowResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Usage
const result = await workflow.execute();
if (!result.success) {
  console.error('Workflow failed:', result.error);
  return;
}

console.log('Success:', result.data);
```

## Retry Logic

Element finding includes automatic retries:

```typescript
const element = await finder.findElement(selectors, {
  timeout: 5000,
  retries: 3,
  scrollIntoView: true,
});
```

## Logging

All components include detailed logging:

```typescript
// Enable verbose logging
localStorage.setItem('foodbot-debug', 'true');

// Logs include:
// - Action being performed
// - Elements being interacted with
// - Success/failure status
// - Timing information
```

## Safety Features

### Order Placement Safety

The checkout workflow stops before placing the actual order by default. To place a real order, call `placeOrder()` explicitly:

```typescript
// Safe: Stops before placing order
await checkoutWorkflow.execute({ ... });

// DANGER: Places real order
await checkoutWorkflow.placeOrder();
```

### Element Visibility Checks

All interactions verify element visibility:

```typescript
// Checks:
// - Element exists
// - Element is visible (not hidden)
// - Element is not disabled
// - Element is in viewport
```

## Testing

Content scripts can be tested in isolation:

```typescript
import { DomParser } from './dom-parser';

describe('DomParser', () => {
  it('should extract restaurants', () => {
    const parser = new DomParser();
    const restaurants = parser.extractRestaurants();
    expect(restaurants).toBeInstanceOf(Array);
  });
});
```

## Development

### Adding New Workflows

1. Create workflow file in `workflows/`
2. Import required utilities (parser, simulator, finder)
3. Implement workflow methods
4. Export workflow class
5. Add to swiggy-content.ts message handlers

### Adding New Selectors

Add selectors to element-finder.ts with multiple fallbacks:

```typescript
public async findNewElement(): Promise<HTMLElement | null> {
  const selectors = [
    '[data-testid="new-element"]',
    '.new-element',
    '[class*="new"]',
  ];

  return await this.findElement(selectors, {
    timeout: 5000,
    retries: 3,
  });
}
```

## Performance

Content scripts are optimized for:

- **Minimal DOM queries**: Cache elements when possible
- **Efficient selectors**: Use specific selectors
- **Lazy loading**: Load workflows only when needed
- **Memory management**: Clean up event listeners

## Security

Content scripts follow security best practices:

- No eval() or Function()
- No inline scripts
- CSP compliant
- Sandboxed from page scripts
- Message validation

## Browser Compatibility

Content scripts work on:

- Chrome 88+
- Edge 88+
- Brave 1.20+
- Opera 74+

Not supported:
- Firefox (uses different extension APIs)
- Safari (different extension system)

## Troubleshooting

### Element Not Found

1. Check if selectors match current DOM
2. Increase timeout
3. Add more selector fallbacks
4. Verify page has loaded completely

### Click Not Working

1. Verify element is visible
2. Scroll element into view
3. Check if element is disabled
4. Add longer delay before click

### Typing Not Working

1. Ensure element is focused
2. Check if input is disabled
3. Verify input accepts text
4. Try pressing Enter after typing

## Future Improvements

- [ ] Add Zomato support
- [ ] Implement visual element selection
- [ ] Add screenshot capabilities
- [ ] Implement error recovery strategies
- [ ] Add performance monitoring
- [ ] Create workflow recorder
- [ ] Add A/B testing for selectors

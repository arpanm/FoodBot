/**
 * Test data fixtures for E2E tests
 */

export const TEST_RESTAURANTS = [
  {
    id: 'rest-1',
    name: 'Pizza Palace',
    cuisine: 'Italian',
    rating: 4.5,
    deliveryTime: '30-40 mins',
    platform: 'swiggy',
  },
  {
    id: 'rest-2',
    name: 'Burger King',
    cuisine: 'Fast Food',
    rating: 4.2,
    deliveryTime: '25-35 mins',
    platform: 'swiggy',
  },
  {
    id: 'rest-3',
    name: 'Sushi Spot',
    cuisine: 'Japanese',
    rating: 4.7,
    deliveryTime: '40-50 mins',
    platform: 'zomato',
  },
];

export const TEST_DISHES = [
  {
    id: 'dish-1',
    restaurantId: 'rest-1',
    name: 'Margherita Pizza',
    description: 'Classic cheese pizza',
    price: 12.99,
    category: 'Pizza',
    isVeg: true,
  },
  {
    id: 'dish-2',
    restaurantId: 'rest-1',
    name: 'Pepperoni Pizza',
    description: 'Spicy pepperoni pizza',
    price: 14.99,
    category: 'Pizza',
    isVeg: false,
  },
  {
    id: 'dish-3',
    restaurantId: 'rest-2',
    name: 'Whopper',
    description: 'Classic flame-grilled burger',
    price: 8.99,
    category: 'Burgers',
    isVeg: false,
  },
];

export const TEST_JOBS = {
  searchRestaurant: {
    action: 'search_restaurant',
    platform: 'swiggy',
    payload: {
      query: 'pizza',
      location: 'New York',
    },
  },
  addToCart: {
    action: 'add_to_cart',
    platform: 'swiggy',
    payload: {
      restaurantId: 'rest-1',
      dishId: 'dish-1',
      quantity: 2,
    },
  },
  checkout: {
    action: 'checkout',
    platform: 'swiggy',
    payload: {
      deliveryAddress: '123 Main St, New York, NY 10001',
      paymentMethod: 'card',
    },
  },
};

export const TEST_ORDERS = [
  {
    id: 'order-1',
    restaurantId: 'rest-1',
    items: [
      { dishId: 'dish-1', quantity: 2 },
      { dishId: 'dish-2', quantity: 1 },
    ],
    total: 40.97,
    status: 'pending',
    deliveryAddress: '123 Main St, New York, NY 10001',
  },
];

export const CHAT_MESSAGES = {
  orderPizza: 'I want to order pizza from Pizza Palace',
  searchSushi: 'Find me sushi restaurants nearby',
  addToCart: 'Add 2 Margherita pizzas to cart',
  checkout: 'Checkout my order and deliver to 123 Main St',
  trackOrder: 'Track my order',
};

export const SELECTORS = {
  // Auth
  emailInput: '[data-testid="email-input"]',
  passwordInput: '[data-testid="password-input"]',
  loginButton: '[data-testid="login-button"]',
  registerButton: '[data-testid="register-button"]',

  // Chat
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="send-button"]',
  chatMessage: '[data-testid="chat-message"]',

  // Job tracking
  jobId: '[data-testid="job-id"]',
  jobStatus: '[data-testid="job-status"]',
  progressTracker: '[data-testid="progress-tracker"]',

  // Orders
  orderList: '[data-testid="order-list"]',
  orderCard: '[data-testid="order-card"]',
  orderStatus: '[data-testid="order-status"]',

  // Restaurant search
  restaurantList: '[data-testid="restaurant-list"]',
  restaurantCard: '[data-testid="restaurant-card"]',
  restaurantName: '[data-testid="restaurant-name"]',

  // Cart
  cartIcon: '[data-testid="cart-icon"]',
  cartItem: '[data-testid="cart-item"]',
  cartTotal: '[data-testid="cart-total"]',
  checkoutButton: '[data-testid="checkout-button"]',

  // Extension
  extensionIcon: '[data-testid="extension-icon"]',
  extensionStatus: '[data-testid="extension-status"]',
  pollingToggle: '[data-testid="polling-toggle"]',
};

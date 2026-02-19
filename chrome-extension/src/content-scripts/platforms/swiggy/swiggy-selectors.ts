/**
 * Swiggy-specific selectors with multi-layered fallback strategy
 * Priority: ARIA > Placeholder/Semantic > Class-based > Structural
 */

import { SelectorConfig } from '../types';

export const SWIGGY_SELECTORS: SelectorConfig = {
  // Search functionality
  searchInput: [
    'input[aria-label*="Search"]', // Priority 1: ARIA
    'input[placeholder*="Search"]', // Priority 2: Placeholder
    'input[placeholder*="search"]',
    'input[type="search"]', // Priority 3: Semantic HTML
    'input[data-testid*="search"]', // Priority 4: Data attributes
    'input.search-input',
    'input#search',
    'input[name="search"]',
    'header input[type="text"]', // Priority 5: Structural
  ],

  searchButton: [
    'button[aria-label*="Search"]',
    'button[data-testid*="search"]',
    'button[type="submit"]',
    'button.search-button',
    'button:has(svg[class*="search"])',
    '[role="button"][aria-label*="Search"]',
  ],

  // Restaurant listing
  restaurantCard: [
    '[data-testid="restaurant-card"]', // Swiggy uses test IDs
    '[class*="RestaurantCard"]',
    '[class*="restaurant-card"]',
    'article[class*="restaurant"]',
    '.restaurant-card',
    '[role="article"][aria-label*="restaurant"]',
  ],

  restaurantName: [
    '[data-testid="restaurant-name"]',
    'h3[class*="restaurant"]',
    'h2[class*="restaurant"]',
    '[class*="RestaurantName"]',
    '.restaurant-name',
    'a[class*="restaurant"] h3',
  ],

  restaurantCuisine: [
    '[data-testid="restaurant-cuisine"]',
    '[class*="cuisine"]',
    '[class*="Cuisine"]',
    '.restaurant-cuisine',
    'p[class*="cuisine"]',
  ],

  restaurantRating: [
    '[data-testid="restaurant-rating"]',
    '[aria-label*="rating"]',
    '[class*="rating"]',
    '[class*="Rating"]',
    '.restaurant-rating',
    'span[class*="star"]',
  ],

  restaurantDeliveryTime: [
    '[data-testid="delivery-time"]',
    '[aria-label*="delivery"]',
    '[class*="delivery-time"]',
    '[class*="DeliveryTime"]',
    '.delivery-time',
    'span[class*="time"]',
  ],

  restaurantDistance: [
    '[data-testid="restaurant-distance"]',
    '[class*="distance"]',
    '[class*="Distance"]',
    '.restaurant-distance',
  ],

  restaurantPriceForTwo: [
    '[data-testid="price-for-two"]',
    '[aria-label*="price"]',
    '[class*="price"]',
    '[class*="Price"]',
    '.price-for-two',
  ],

  // Menu page
  menuItem: [
    '[data-testid="menu-item"]',
    '[data-testid="dish-card"]',
    '[class*="MenuItem"]',
    '[class*="menu-item"]',
    '.menu-item',
    '.dish-card',
    '.item-card',
    'article[class*="item"]',
  ],

  menuItemName: [
    '[data-testid="menu-item-name"]',
    'h3[class*="item"]',
    'h2[class*="item"]',
    '[class*="ItemName"]',
    '.item-name',
    '.dish-name',
  ],

  menuItemPrice: [
    '[data-testid="menu-item-price"]',
    '[aria-label*="price"]',
    '[class*="price"]',
    '[class*="Price"]',
    '.item-price',
    '.dish-price',
    'span[class*="rupee"]',
  ],

  menuItemDescription: [
    '[data-testid="menu-item-description"]',
    '[class*="description"]',
    '[class*="Description"]',
    '.item-description',
    '.dish-description',
    'p[class*="desc"]',
  ],

  menuItemRating: [
    '[data-testid="menu-item-rating"]',
    '[aria-label*="rating"]',
    '[class*="rating"]',
    '.item-rating',
    'span[class*="star"]',
  ],

  menuItemImage: [
    '[data-testid="menu-item-image"]',
    'img[class*="item"]',
    'img[class*="dish"]',
    '.item-image',
    '.dish-image',
  ],

  menuCategory: [
    '[data-testid="menu-category"]',
    '[role="heading"][aria-level="2"]',
    'h2[class*="category"]',
    'h3[class*="category"]',
    '[class*="CategoryName"]',
    '.menu-category',
  ],

  // Cart operations
  addToCartButton: [
    'button[data-testid*="add"]',
    'button[aria-label*="Add"]',
    'button[aria-label*="add to cart"]',
    'button:has-text("ADD")',
    'button:has-text("Add")',
    'button.add-button',
    'button[class*="add"]',
    '[role="button"][aria-label*="Add"]',
  ],

  removeFromCartButton: [
    'button[data-testid*="remove"]',
    'button[aria-label*="Remove"]',
    'button[aria-label*="Delete"]',
    'button:has-text("REMOVE")',
    'button:has-text("Remove")',
    'button.remove-button',
    'button[class*="remove"]',
  ],

  increaseQuantityButton: [
    'button[data-testid*="increase"]',
    'button[aria-label*="Increase"]',
    'button[aria-label*="Add more"]',
    'button:has-text("+")',
    'button.increase-quantity',
    'button[class*="increase"]',
    'button[class*="plus"]',
  ],

  decreaseQuantityButton: [
    'button[data-testid*="decrease"]',
    'button[aria-label*="Decrease"]',
    'button[aria-label*="Remove one"]',
    'button:has-text("-")',
    'button.decrease-quantity',
    'button[class*="decrease"]',
    'button[class*="minus"]',
  ],

  quantityInput: [
    'input[data-testid*="quantity"]',
    'input[aria-label*="Quantity"]',
    'input[type="number"]',
    'input.quantity-input',
    'input[class*="quantity"]',
  ],

  cartIcon: [
    'button[data-testid*="cart"]',
    'button[aria-label*="Cart"]',
    'a[href*="cart"]',
    '[role="button"][aria-label*="Cart"]',
    'button:has(svg[class*="cart"])',
    '.cart-icon',
    '.cart-button',
  ],

  cartItemCount: [
    '[data-testid="cart-count"]',
    '[aria-label*="items in cart"]',
    '[class*="cart-count"]',
    '[class*="CartCount"]',
    '.cart-count',
    'span[class*="badge"]',
  ],

  cartTotal: [
    '[data-testid="cart-total"]',
    '[aria-label*="Total"]',
    '[class*="total"]',
    '[class*="Total"]',
    '.cart-total',
    '.order-total',
  ],

  cartItems: [
    '[data-testid="cart-item"]',
    '[class*="CartItem"]',
    '[class*="cart-item"]',
    '.cart-item',
    'article[class*="cart"]',
  ],

  // Checkout page
  checkoutButton: [
    'button[data-testid*="checkout"]',
    'button[aria-label*="Checkout"]',
    'button:has-text("CHECKOUT")',
    'button:has-text("Checkout")',
    'button:has-text("PROCEED")',
    'button:has-text("Proceed")',
    'button.checkout-button',
    'button[class*="checkout"]',
  ],

  addressInput: [
    'input[data-testid*="address"]',
    'input[aria-label*="Address"]',
    'input[placeholder*="address"]',
    'input[placeholder*="Address"]',
    'input[name*="address"]',
    'input.address-input',
    'textarea[placeholder*="address"]',
  ],

  addressSuggestion: [
    '[data-testid="address-suggestion"]',
    '[role="option"]',
    '[class*="suggestion"]',
    '[class*="Suggestion"]',
    '.address-suggestion',
    'li[class*="address"]',
  ],

  addressSaveButton: [
    'button[data-testid*="save-address"]',
    'button[aria-label*="Save address"]',
    'button:has-text("SAVE")',
    'button:has-text("Save")',
    'button.save-address',
  ],

  paymentOptions: [
    '[data-testid*="payment"]',
    '[role="radio"]',
    '[class*="payment"]',
    '[class*="Payment"]',
    '.payment-option',
    'input[name="paymentMethod"]',
  ],

  paymentCard: [
    '[data-testid*="card"]',
    '[aria-label*="Credit card"]',
    '[aria-label*="Debit card"]',
    'input[value="card"]',
    '[class*="card-payment"]',
  ],

  paymentUPI: [
    '[data-testid*="upi"]',
    '[aria-label*="UPI"]',
    'input[value="upi"]',
    '[class*="upi-payment"]',
  ],

  paymentCash: [
    '[data-testid*="cash"]',
    '[aria-label*="Cash"]',
    'input[value="cash"]',
    '[class*="cash-payment"]',
  ],

  paymentWallet: [
    '[data-testid*="wallet"]',
    '[aria-label*="Wallet"]',
    'input[value="wallet"]',
    '[class*="wallet-payment"]',
  ],

  couponInput: [
    'input[data-testid*="coupon"]',
    'input[aria-label*="Coupon"]',
    'input[placeholder*="coupon"]',
    'input[placeholder*="Coupon"]',
    'input[name*="coupon"]',
    'input.coupon-input',
  ],

  applyCouponButton: [
    'button[data-testid*="apply-coupon"]',
    'button[aria-label*="Apply coupon"]',
    'button:has-text("APPLY")',
    'button:has-text("Apply")',
    'button.apply-coupon',
  ],

  placeOrderButton: [
    'button[data-testid*="place-order"]',
    'button[aria-label*="Place order"]',
    'button:has-text("PLACE ORDER")',
    'button:has-text("Place Order")',
    'button:has-text("CONFIRM")',
    'button:has-text("Confirm")',
    'button.place-order',
    'button[class*="place-order"]',
  ],

  // Order confirmation
  orderIdElement: [
    '[data-testid="order-id"]',
    '[aria-label*="Order ID"]',
    '[class*="order-id"]',
    '[class*="OrderId"]',
    '.order-id',
    'span[class*="order-number"]',
  ],

  orderStatus: [
    '[data-testid="order-status"]',
    '[aria-label*="Order status"]',
    '[class*="order-status"]',
    '[class*="OrderStatus"]',
    '.order-status',
  ],

  orderTotal: [
    '[data-testid="order-total"]',
    '[aria-label*="Order total"]',
    '[class*="order-total"]',
    '[class*="OrderTotal"]',
    '.order-total',
  ],

  // Common elements
  loader: [
    '[data-testid="loader"]',
    '[role="progressbar"]',
    '[aria-busy="true"]',
    '[class*="loader"]',
    '[class*="Loader"]',
    '[class*="spinner"]',
    '[class*="Spinner"]',
    '.loading',
  ],

  errorMessage: [
    '[data-testid="error"]',
    '[role="alert"]',
    '[aria-live="assertive"]',
    '[class*="error"]',
    '[class*="Error"]',
    '.error-message',
  ],

  modalOverlay: [
    '[data-testid="modal"]',
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[class*="modal"]',
    '[class*="Modal"]',
    '[class*="overlay"]',
    '[class*="Overlay"]',
    '.modal',
  ],

  closeButton: [
    'button[data-testid="close"]',
    'button[aria-label*="Close"]',
    'button[aria-label*="close"]',
    'button:has-text("×")',
    'button:has-text("✕")',
    'button.close-button',
    'button[class*="close"]',
  ],
};

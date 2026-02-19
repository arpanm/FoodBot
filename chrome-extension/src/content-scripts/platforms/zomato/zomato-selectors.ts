/**
 * Zomato-specific selectors with multi-layered fallback strategy
 * Priority: ARIA > Placeholder/Semantic > Class-based > Structural
 */

import { SelectorConfig } from '../types';

export const ZOMATO_SELECTORS: SelectorConfig = {
  // Search functionality
  searchInput: [
    'input[aria-label*="Search"]', // Priority 1: ARIA
    'input[placeholder*="Search"]', // Priority 2: Placeholder
    'input[placeholder*="search"]',
    'input[type="search"]', // Priority 3: Semantic HTML
    'input[name="search_keyword"]', // Zomato-specific
    'input.sc-search-input', // Zomato class pattern
    'input[class*="search"]',
    'header input[type="text"]', // Priority 4: Structural
  ],

  searchButton: [
    'button[aria-label*="Search"]',
    'button[type="submit"]',
    'button.sc-search-button',
    'button[class*="search"]',
    'button:has(svg[class*="search"])',
    '[role="button"][aria-label*="Search"]',
  ],

  // Restaurant listing
  restaurantCard: [
    '[data-result-type="ResCard_Default"]', // Zomato-specific
    'article[class*="sc-restaurant"]',
    '[class*="restaurant-card"]',
    '.restaurant-card',
    'div[class*="sc-"][class*="card"]',
    'article[role="article"]',
  ],

  restaurantName: [
    'h4[class*="sc-"][class*="name"]', // Zomato pattern
    'a[class*="restaurant"] h4',
    'h3[class*="restaurant"]',
    'h2[class*="restaurant"]',
    '[class*="res-name"]',
    '.restaurant-name',
  ],

  restaurantCuisine: [
    'p[class*="sc-"][class*="cuisine"]', // Zomato pattern
    '[class*="cuisine"]',
    '.restaurant-cuisine',
    'span[class*="category"]',
    'p[class*="categories"]',
  ],

  restaurantRating: [
    '[aria-label*="rating"]',
    'div[class*="sc-"][class*="rating"]',
    '[class*="rating"]',
    '.restaurant-rating',
    'span[class*="star"]',
    'div[class*="vote"]',
  ],

  restaurantDeliveryTime: [
    '[aria-label*="delivery"]',
    'p[class*="sc-"][class*="time"]',
    '[class*="delivery-time"]',
    '[class*="time"]',
    '.delivery-time',
    'span[class*="eta"]',
  ],

  restaurantDistance: [
    '[class*="distance"]',
    'span[class*="km"]',
    '.restaurant-distance',
  ],

  restaurantPriceForTwo: [
    '[aria-label*="price"]',
    'p[class*="sc-"][class*="price"]',
    '[class*="price"]',
    '.price-for-two',
    'span[class*="cost"]',
  ],

  // Menu page
  menuItem: [
    'div[class*="sc-"][class*="item"]', // Zomato pattern
    '[class*="menu-item"]',
    '.menu-item',
    '.dish-card',
    'article[class*="item"]',
    'div[class*="food-item"]',
  ],

  menuItemName: [
    'h4[class*="sc-"][class*="name"]',
    'h3[class*="item"]',
    'h2[class*="item"]',
    '[class*="item-name"]',
    '.item-name',
    '.dish-name',
  ],

  menuItemPrice: [
    '[aria-label*="price"]',
    'span[class*="sc-"][class*="price"]',
    '[class*="price"]',
    '.item-price',
    '.dish-price',
    'span[class*="rupee"]',
    'span[class*="cost"]',
  ],

  menuItemDescription: [
    'p[class*="sc-"][class*="desc"]',
    '[class*="description"]',
    '.item-description',
    '.dish-description',
    'p[class*="item-desc"]',
  ],

  menuItemRating: [
    '[aria-label*="rating"]',
    'div[class*="sc-"][class*="rating"]',
    '[class*="rating"]',
    '.item-rating',
    'span[class*="star"]',
  ],

  menuItemImage: [
    'img[class*="sc-"][class*="item"]',
    'img[class*="item"]',
    'img[class*="dish"]',
    '.item-image',
    '.dish-image',
  ],

  menuCategory: [
    '[role="heading"][aria-level="2"]',
    'h2[class*="sc-"][class*="category"]',
    'h2[class*="category"]',
    'h3[class*="category"]',
    '[class*="category-name"]',
    '.menu-category',
  ],

  // Cart operations
  addToCartButton: [
    'button[aria-label*="Add"]',
    'button[aria-label*="add to cart"]',
    'div[class*="sc-"][class*="add"] button', // Zomato nested pattern
    'button:has-text("Add")',
    'button:has-text("ADD")',
    'button.add-button',
    'button[class*="add-item"]',
    '[role="button"][aria-label*="Add"]',
  ],

  removeFromCartButton: [
    'button[aria-label*="Remove"]',
    'button[aria-label*="Delete"]',
    'button:has-text("Remove")',
    'button:has-text("REMOVE")',
    'button.remove-button',
    'button[class*="remove"]',
  ],

  increaseQuantityButton: [
    'button[aria-label*="Increase"]',
    'button[aria-label*="Add more"]',
    'button:has-text("+")',
    'button.increase-quantity',
    'button[class*="increase"]',
    'button[class*="plus"]',
  ],

  decreaseQuantityButton: [
    'button[aria-label*="Decrease"]',
    'button[aria-label*="Remove one"]',
    'button:has-text("-")',
    'button.decrease-quantity',
    'button[class*="decrease"]',
    'button[class*="minus"]',
  ],

  quantityInput: [
    'input[aria-label*="Quantity"]',
    'input[type="number"]',
    'input.quantity-input',
    'input[class*="quantity"]',
  ],

  cartIcon: [
    'button[aria-label*="Cart"]',
    'a[href*="cart"]',
    'button[class*="sc-"][class*="cart"]',
    '[role="button"][aria-label*="Cart"]',
    'button:has(svg[class*="cart"])',
    '.cart-icon',
    '.cart-button',
  ],

  cartItemCount: [
    '[aria-label*="items in cart"]',
    'span[class*="sc-"][class*="count"]',
    '[class*="cart-count"]',
    '.cart-count',
    'span[class*="badge"]',
  ],

  cartTotal: [
    '[aria-label*="Total"]',
    'div[class*="sc-"][class*="total"]',
    '[class*="total"]',
    '.cart-total',
    '.order-total',
    'span[class*="payable"]',
  ],

  cartItems: [
    'div[class*="sc-"][class*="cart-item"]',
    '[class*="cart-item"]',
    '.cart-item',
    'article[class*="cart"]',
  ],

  // Checkout page
  checkoutButton: [
    'button[aria-label*="Checkout"]',
    'button:has-text("Checkout")',
    'button:has-text("CHECKOUT")',
    'button:has-text("Proceed")',
    'button:has-text("PROCEED")',
    'button.checkout-button',
    'button[class*="checkout"]',
  ],

  addressInput: [
    'input[aria-label*="Address"]',
    'input[placeholder*="address"]',
    'input[placeholder*="Address"]',
    'input[name*="address"]',
    'input.address-input',
    'textarea[placeholder*="address"]',
  ],

  addressSuggestion: [
    '[role="option"]',
    'li[class*="sc-"][class*="suggestion"]',
    '[class*="suggestion"]',
    '.address-suggestion',
    'li[class*="address"]',
  ],

  addressSaveButton: [
    'button[aria-label*="Save address"]',
    'button:has-text("Save")',
    'button:has-text("SAVE")',
    'button.save-address',
  ],

  paymentOptions: [
    '[role="radio"]',
    'div[class*="sc-"][class*="payment"]',
    '[class*="payment"]',
    '.payment-option',
    'input[name="paymentMethod"]',
  ],

  paymentCard: [
    '[aria-label*="Credit card"]',
    '[aria-label*="Debit card"]',
    'input[value="card"]',
    '[class*="card-payment"]',
  ],

  paymentUPI: [
    '[aria-label*="UPI"]',
    'input[value="upi"]',
    '[class*="upi-payment"]',
  ],

  paymentCash: [
    '[aria-label*="Cash"]',
    'input[value="cash"]',
    '[class*="cash-payment"]',
  ],

  paymentWallet: [
    '[aria-label*="Wallet"]',
    'input[value="wallet"]',
    '[class*="wallet-payment"]',
  ],

  couponInput: [
    'input[aria-label*="Coupon"]',
    'input[placeholder*="coupon"]',
    'input[placeholder*="Coupon"]',
    'input[name*="coupon"]',
    'input.coupon-input',
  ],

  applyCouponButton: [
    'button[aria-label*="Apply coupon"]',
    'button:has-text("Apply")',
    'button:has-text("APPLY")',
    'button.apply-coupon',
  ],

  placeOrderButton: [
    'button[aria-label*="Place order"]',
    'button:has-text("Place Order")',
    'button:has-text("PLACE ORDER")',
    'button:has-text("Confirm")',
    'button:has-text("CONFIRM")',
    'button.place-order',
    'button[class*="place-order"]',
  ],

  // Order confirmation
  orderIdElement: [
    '[aria-label*="Order ID"]',
    'span[class*="sc-"][class*="order-id"]',
    '[class*="order-id"]',
    '.order-id',
    'span[class*="order-number"]',
  ],

  orderStatus: [
    '[aria-label*="Order status"]',
    'div[class*="sc-"][class*="status"]',
    '[class*="order-status"]',
    '.order-status',
  ],

  orderTotal: [
    '[aria-label*="Order total"]',
    'div[class*="sc-"][class*="total"]',
    '[class*="order-total"]',
    '.order-total',
  ],

  // Common elements
  loader: [
    '[role="progressbar"]',
    '[aria-busy="true"]',
    'div[class*="sc-"][class*="loader"]',
    '[class*="loader"]',
    '[class*="spinner"]',
    '.loading',
  ],

  errorMessage: [
    '[role="alert"]',
    '[aria-live="assertive"]',
    'div[class*="sc-"][class*="error"]',
    '[class*="error"]',
    '.error-message',
  ],

  modalOverlay: [
    '[role="dialog"]',
    '[aria-modal="true"]',
    'div[class*="sc-"][class*="modal"]',
    '[class*="modal"]',
    '[class*="overlay"]',
    '.modal',
  ],

  closeButton: [
    'button[aria-label*="Close"]',
    'button[aria-label*="close"]',
    'button:has-text("×")',
    'button:has-text("✕")',
    'button.close-button',
    'button[class*="close"]',
  ],
};

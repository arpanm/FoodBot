# FoodBot User Guide

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Features Overview](#features-overview)
- [User Workflows](#user-workflows)
  - [Customer Workflows](#customer-workflows)
  - [Restaurant Owner Workflows](#restaurant-owner-workflows)
  - [Admin Workflows](#admin-workflows)
- [Chat Interface](#chat-interface)
- [Screen Descriptions](#screen-descriptions)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Introduction

FoodBot is an AI-powered food ordering platform that lets you discover restaurants, browse menus, place orders, and track deliveries -- all through a conversational chat interface. Instead of browsing traditional menus and clicking through forms, you can simply tell FoodBot what you are looking for in natural language.

**Example interactions**:
- "Find me Italian restaurants nearby"
- "Show me vegetarian dishes under $15"
- "I want to order pizza for delivery"
- "What is the status of my last order?"

FoodBot supports three types of users:

| User Type | Description |
|-----------|-------------|
| **Customer** | Browse restaurants, order food, track deliveries, leave feedback |
| **Restaurant Owner** | Manage restaurant profile, menus, and incoming orders |
| **Admin** | Manage users, approve restaurants, view platform statistics |

---

## Getting Started

### Creating an Account

1. Navigate to the FoodBot application
2. Click "Register" or "Sign Up"
3. Fill in your details:
   - **Email**: Your email address (used for login and notifications)
   - **Password**: At least 4 characters
   - **Name**: Your display name
   - **Phone Number**: In international format (e.g., +11234567890)
4. Click "Register"
5. Check your email for a verification link
6. Click the verification link to activate your account

### Logging In

1. Enter your email and password
2. Click "Login"
3. You will receive an access token that keeps you logged in for 15 minutes
4. The app automatically refreshes your session -- no need to log in again frequently

### Managing Your Profile

After logging in, you can:

- **View your profile**: See your name, email, phone number, and role
- **Update your profile**: Change your name, email, or phone number
- **Manage addresses**: Add, edit, or remove delivery addresses
- **Delete your account**: Permanently delete your account and data

---

## Features Overview

### For Customers

```
+-------------------------------------------------------------------+
|                         CUSTOMER FEATURES                          |
+-------------------------------------------------------------------+
|                                                                    |
|  [Chat Interface]     Talk to FoodBot in natural language          |
|  [Restaurant Search]  Find restaurants by cuisine, location, etc.  |
|  [Menu Browsing]      Browse dishes with dietary filters           |
|  [Cart Management]    Add, update, remove items from cart          |
|  [Order Placement]    Place orders with delivery details           |
|  [Payment]            Pay via card, UPI, or wallet                 |
|  [Order Tracking]     Track order status in real-time              |
|  [Feedback]           Rate food, delivery, and packaging           |
|                                                                    |
+-------------------------------------------------------------------+
```

### For Restaurant Owners

```
+-------------------------------------------------------------------+
|                     RESTAURANT OWNER FEATURES                      |
+-------------------------------------------------------------------+
|                                                                    |
|  [Restaurant Profile] Create and manage your restaurant            |
|  [Menu Management]    Add, update, delete menu items               |
|  [Availability]       Toggle dish availability on/off              |
|  [Order Management]   View and update order statuses               |
|                                                                    |
+-------------------------------------------------------------------+
```

### For Admins

```
+-------------------------------------------------------------------+
|                          ADMIN FEATURES                            |
+-------------------------------------------------------------------+
|                                                                    |
|  [User Management]       View, suspend, reactivate users           |
|  [Restaurant Approval]   Approve or reject new restaurants         |
|  [Dashboard]             Platform statistics and metrics           |
|                                                                    |
+-------------------------------------------------------------------+
```

---

## User Workflows

### Customer Workflows

#### Workflow 1: Discovering Restaurants

```
Step 1: Open the chat interface
Step 2: Type your query
        Examples:
        - "Show me restaurants near me"
        - "Italian restaurants open now"
        - "Best rated pizza places"

Step 3: FoodBot processes your request (you'll see a loading indicator)

Step 4: View results
        - Restaurant cards showing name, cuisine, rating, price range
        - Filter options to narrow down results

Step 5: Click on a restaurant to see details
        - Full description, address, operating hours
        - Menu with categories
```

#### Workflow 2: Browsing a Menu

```
Step 1: Select a restaurant from search results

Step 2: View the restaurant's menu
        - Dishes organized by category
        - Each dish shows: name, description, price, dietary info

Step 3: Use filters to find specific items
        - Vegetarian / Vegan options
        - Price range
        - Category (Appetizers, Main Course, Desserts, etc.)

Step 4: Click on a dish for detailed information
        - Full description
        - Nutritional information
        - Preparation time
        - Customization options
```

#### Workflow 3: Placing an Order

```
Step 1: Add items to your cart
        - Click "Add to Cart" on any dish
        - Specify quantity
        - Add special instructions (e.g., "extra cheese", "no onions")

Step 2: Review your cart
        - View all items with quantities and prices
        - Update quantities or remove items
        - See total price

Step 3: Proceed to checkout
        - Confirm delivery address
        - Select payment method (card, UPI, wallet)
        - Add any special delivery instructions

Step 4: Place the order
        - FoodBot validates your cart
        - Checks item availability
        - Processes payment
        - Confirms the order

Step 5: Receive confirmation
        - Order ID for tracking
        - Estimated delivery time
        - Order summary
```

#### Workflow 4: Tracking an Order

```
Step 1: View your order list
        - See all current and past orders
        - Filter by status (pending, preparing, delivered, etc.)

Step 2: Select an order to track

Step 3: View real-time tracking
        +----+     +----------+     +---------------+     +-----------+
        |Order|     |Preparing |     |Out for        |     |Delivered  |
        |Placed| --> |          | --> |Delivery       | --> |           |
        +----+     +----------+     +---------------+     +-----------+
          ^
          |
        Current status highlighted

Step 4: Estimated delivery time updates as the order progresses
```

#### Workflow 5: Leaving Feedback

```
Step 1: After an order is delivered, go to your order history

Step 2: Select the completed order

Step 3: Submit feedback
        - Overall rating (1-5 stars)
        - Food quality rating (1-5)
        - Delivery speed rating (1-5)
        - Packaging rating (1-5)
        - Written comment (optional)

Step 4: Your feedback helps improve restaurant quality
```

#### Workflow 6: Managing Your Cart

```
View Cart:
  - See all items with quantities and prices
  - Total calculation displayed at bottom

Add Item:
  - Browse restaurant menu
  - Click "Add to Cart"
  - Specify quantity and special instructions

Update Item:
  - Click on a cart item
  - Change quantity or special instructions
  - Save changes

Remove Item:
  - Swipe or click "Remove" on a cart item
  - Item is removed immediately

Clear Cart:
  - Click "Clear All"
  - All items are removed
```

### Restaurant Owner Workflows

#### Workflow 1: Setting Up Your Restaurant

```
Step 1: Register as a restaurant owner (select "restaurant_owner" role)

Step 2: Create your restaurant profile
        - Restaurant name and description
        - Cuisine types (Italian, Chinese, Indian, etc.)
        - Address and location coordinates
        - Price range
        - Operating hours

Step 3: Wait for admin approval
        - Your restaurant will be in "pending" status
        - Admin will review and approve/reject

Step 4: Once approved, your restaurant appears in search results
```

#### Workflow 2: Managing Your Menu

```
Add a Dish:
  Step 1: Navigate to your restaurant's menu management
  Step 2: Click "Add Dish"
  Step 3: Fill in details:
          - Name, description, price
          - Category (Appetizer, Main Course, Dessert, etc.)
          - Dietary flags (vegetarian, vegan)
          - Preparation time
          - Nutritional information
  Step 4: Save the dish

Update a Dish:
  Step 1: Find the dish in your menu
  Step 2: Click "Edit"
  Step 3: Update details
  Step 4: Save changes

Toggle Availability:
  Step 1: Find the dish
  Step 2: Click the availability toggle
  Step 3: Dish is immediately marked available/unavailable

Delete a Dish:
  Step 1: Find the dish
  Step 2: Click "Delete"
  Step 3: Confirm deletion
```

#### Workflow 3: Managing Orders

```
Step 1: View incoming orders

Step 2: For each order, update the status:
        pending -> confirmed -> preparing -> ready -> delivered

Step 3: Status updates are visible to the customer in real-time
```

### Admin Workflows

#### Workflow 1: Approving Restaurants

```
Step 1: Navigate to Admin > Pending Restaurants

Step 2: Review restaurant details:
        - Restaurant name and description
        - Owner information
        - Location and cuisine

Step 3: Approve or reject:
        - Approve: Add optional approval notes
        - Reject: Provide rejection reason

Step 4: Restaurant owner is notified of the decision
```

#### Workflow 2: Managing Users

```
View Users:
  - List all users with role and status filters
  - Search by name or email

Suspend User:
  Step 1: Select the user
  Step 2: Click "Suspend"
  Step 3: Provide reason and duration (days)
  Step 4: User is prevented from accessing the platform

Reactivate User:
  Step 1: Select the suspended user
  Step 2: Click "Reactivate"
  Step 3: User can access the platform again
```

#### Workflow 3: Dashboard

```
View platform statistics:
  - Total users, restaurants, orders
  - Pending restaurant approvals
  - Active users
  - Revenue metrics (today, this week, this month)
```

---

## Chat Interface

The chat interface is the primary way customers interact with FoodBot.

### Chat Screen Layout

```
+--------------------------------------------------+
|                   FoodBot Chat                     |
+--------------------------------------------------+
|                                                    |
|  [Bot] Welcome! What can I help you find today?   |
|                                                    |
|  [You] Find me Italian restaurants nearby          |
|                                                    |
|  [Bot] Here are some recommendations for you.     |
|                                                    |
|  +-------------------------------------------+    |
|  | Restaurant Card: Pizza Palace              |    |
|  | Rating: 4.5  |  Cuisine: Italian, Pizza   |    |
|  | Price: $$     |  [View Menu]               |    |
|  +-------------------------------------------+    |
|                                                    |
|  +-------------------------------------------+    |
|  | Restaurant Card: Trattoria Roma            |    |
|  | Rating: 4.3  |  Cuisine: Italian           |    |
|  | Price: $$$    |  [View Menu]               |    |
|  +-------------------------------------------+    |
|                                                    |
+--------------------------------------------------+
|  [Type your message...              ] [Send]      |
+--------------------------------------------------+
```

### Chat Message Types

| Type | Description |
|------|-------------|
| **Text Message** | Plain text conversation with FoodBot |
| **Restaurant Cards** | Visual cards showing restaurant details |
| **Dish Cards** | Visual cards showing dish details with "Add to Cart" |
| **CTA Buttons** | Action buttons (View Menu, Add to Cart, Track Order) |
| **Dynamic Forms** | Input forms for delivery address, payment, etc. |
| **Loading Indicator** | Shown while FoodBot processes your request |
| **Error Message** | Displayed when something goes wrong, with retry option |

### Tips for Better Results

- Be specific about your preferences: "Vegetarian Thai food under $20"
- Include location when searching: "Pizza places near downtown"
- Use natural language: "I'm in the mood for sushi"
- Ask follow-up questions: "What about their dessert menu?"

---

## Screen Descriptions

### Home / Chat Screen

The main screen showing the conversational interface. Users type messages and receive AI-powered responses with restaurant recommendations, dish suggestions, and action buttons.

### Restaurant List Screen

Displays search results as a scrollable list of restaurant cards. Each card shows:
- Restaurant name and image
- Cuisine type badges
- Star rating
- Price range indicator
- Distance (when location is available)
- Open/Closed status

### Restaurant Detail Screen

Full restaurant profile with:
- Cover image and name
- Description and cuisine types
- Rating and review count
- Address and operating hours
- Menu organized by categories
- Filter options for dietary preferences

### Dish Detail Screen

Detailed dish view with:
- Dish image
- Name, description, price
- Dietary labels (vegetarian, vegan, gluten-free)
- Nutritional information
- Preparation time
- Customization options
- "Add to Cart" button with quantity selector

### Cart Screen

Shopping cart summary showing:
- List of items with quantities, prices, and special instructions
- Subtotal and total calculations
- "Update" and "Remove" buttons per item
- "Clear Cart" button
- "Proceed to Checkout" button

### Order Tracking Screen

Real-time order status with:
- Visual progress stepper (Order Placed -> Preparing -> Out for Delivery -> Delivered)
- Current status highlighted
- Estimated delivery time
- Order details (items, total, delivery address)
- Option to cancel (if order hasn't been confirmed)

### Feedback Screen

Post-delivery feedback form:
- Star rating selector (1-5)
- Category ratings (food quality, delivery speed, packaging)
- Text comment area
- Submit button

---

## Troubleshooting

### Cannot Log In

| Symptom | Solution |
|---------|----------|
| "Invalid credentials" | Check your email and password. Passwords are case-sensitive. |
| "Too many attempts" | Wait 15 minutes before trying again. Rate limit resets automatically. |
| Session expired | Your access token has expired. The app should auto-refresh, but try logging in again. |

### Search Returns No Results

| Symptom | Solution |
|---------|----------|
| Empty results | Try broader search terms. Remove filters and search again. |
| "No restaurants found" | Check if your location is set correctly. Try a different area. |

### Order Issues

| Symptom | Solution |
|---------|----------|
| Order failed | Check your payment method. Ensure sufficient funds. |
| Cannot cancel order | Orders can only be cancelled before the restaurant confirms them. |
| Tracking not updating | Refresh the page. Status updates may take a few moments. |

### Payment Issues

| Symptom | Solution |
|---------|----------|
| Payment declined | Verify card details. Try a different payment method. |
| Double charge | The system includes idempotency protection. Check your statement after 24 hours. |
| 3D Secure prompt | Complete the authentication in the popup window. |

### Account Issues

| Symptom | Solution |
|---------|----------|
| Email not verified | Check your inbox and spam folder for the verification email. |
| Cannot change role | Contact an admin to change your user role. |
| Account suspended | Contact support with your account email. |

---

## FAQ

**Q: What payment methods are supported?**
A: FoodBot supports credit/debit cards, UPI, and digital wallets.

**Q: Can I order from multiple restaurants at once?**
A: Currently, each order is placed with a single restaurant. You can place multiple separate orders.

**Q: How is my location used?**
A: Location is used to find nearby restaurants and calculate delivery estimates. It is not stored permanently unless you save a delivery address.

**Q: Can I modify an order after placing it?**
A: Once an order is placed, it cannot be modified. You can cancel and reorder if the restaurant has not yet confirmed.

**Q: How do ratings work?**
A: You can rate an order after delivery. Ratings are on a 1-5 scale and include overall rating, food quality, delivery speed, and packaging.

**Q: What happens if a dish is unavailable?**
A: If a dish becomes unavailable after you add it to your cart, you will be notified when placing the order. The item will need to be removed or replaced.

**Q: How do I become a restaurant owner?**
A: Register with the "restaurant_owner" role, create your restaurant profile, and wait for admin approval.

**Q: Is my data secure?**
A: Yes. Passwords are hashed with bcrypt, authentication uses JWT tokens, and all sessions are managed through Redis with automatic expiration.

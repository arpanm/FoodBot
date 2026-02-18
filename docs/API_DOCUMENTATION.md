# FoodBot API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth-endpoints)
  - [Chat](#chat-endpoints)
  - [Restaurants](#restaurant-endpoints)
  - [Dishes](#dish-endpoints)
  - [Cart](#cart-endpoints)
  - [Orders](#order-endpoints)
  - [Payments](#payment-endpoints)
  - [Feedback](#feedback-endpoints)
  - [Users](#user-endpoints)
  - [Admin](#admin-endpoints)

---

## Overview

The FoodBot Gateway API is a RESTful JSON API built with NestJS. All request and response bodies use JSON format. Authentication is handled via JWT Bearer tokens.

**API Version**: 1.0.0
**Content Type**: `application/json`

---

## Base URL

```
Development: http://localhost:3000
```

---

## Authentication

### JWT Bearer Token

Most endpoints require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Public Endpoints

The following endpoints do not require authentication:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `GET /restaurants/search`
- `GET /restaurants/:id/menu`
- `GET /dishes/search`
- `GET /dishes/:id`
- `POST /payments/webhook`

### Token Lifecycle

1. **Register/Login** returns `accessToken` (15min) and `refreshToken` (7 days)
2. Use `accessToken` for API requests
3. When `accessToken` expires, use `POST /auth/refresh` with `refreshToken` to get new tokens
4. On logout, the `accessToken` is blacklisted in Redis

### User Roles

| Role | Description |
|------|-------------|
| `customer` | Default role. Can browse, order, and leave feedback |
| `restaurant_owner` | Can manage restaurants and dishes |
| `admin` | Full access to admin endpoints, user management, restaurant approval |

---

## Error Responses

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Description of the error",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `410` | Gone (expired resource) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |

### Validation Errors

When request validation fails, the API returns a `400` status with combined validation messages:

```json
{
  "statusCode": 400,
  "message": "email should not be empty, password must be at least 4 characters",
  "error": "Bad Request"
}
```

---

## API Endpoints

### Auth Endpoints

#### POST /auth/register

Register a new user account.

**Authentication**: None (public)

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phoneNumber": "+11234567890",
  "role": "customer"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Must be valid email format |
| `password` | string | Yes | Minimum 4 characters |
| `name` | string | Yes | Minimum 2 characters |
| `phoneNumber` | string | Yes | International format (min 7 digits) |
| `role` | string | No | Defaults to `"customer"` |

**Response** (`201 Created`):

```json
{
  "user": {
    "id": "user_1708123456_abc1234",
    "email": "user@example.com",
    "name": "John Doe",
    "phoneNumber": "+11234567890",
    "role": "customer",
    "isEmailVerified": false,
    "isActive": true,
    "isSuspended": false,
    "preferences": {},
    "addresses": [],
    "createdAt": "2026-02-17T10:00:00.000Z",
    "updatedAt": "2026-02-17T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses**:
- `409 Conflict`: `"User with this email already exists"`

---

#### POST /auth/login

Authenticate with email and password.

**Authentication**: None (public)

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (`200 OK`):

```json
{
  "user": {
    "id": "user_1708123456_abc1234",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses**:
- `401 Unauthorized`: `"Invalid credentials"`
- `429 Too Many Requests`: `"Too many attempts. Please try again later."` (after 5 failed attempts)

---

#### POST /auth/logout

Invalidate the current access token.

**Authentication**: Required (Bearer token)

**Response** (`200 OK`):

```json
{
  "message": "Logged out successfully"
}
```

---

#### POST /auth/refresh

Exchange a refresh token for new access and refresh tokens.

**Authentication**: None (public)

**Request Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (`200 OK`):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses**:
- `401 Unauthorized`: `"Invalid refresh token"` or `"Refresh token expired or invalid"`

---

#### POST /auth/forgot-password

Request a password reset email.

**Authentication**: None (public)

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Response** (`200 OK`):

```json
{
  "message": "Password reset email sent"
}
```

**Error Responses**:
- `404 Not Found`: `"User not found"`
- `429 Too Many Requests`: `"Too many requests. Please try again later."`

---

#### POST /auth/reset-password

Reset password using a reset token.

**Authentication**: None (public)

**Request Body**:

```json
{
  "token": "reset_1708123456_abc1234",
  "newPassword": "newSecurePassword123"
}
```

**Response** (`200 OK`):

```json
{
  "message": "Password reset successful"
}
```

**Error Responses**:
- `401 Unauthorized`: `"Invalid or expired token"`

---

#### POST /auth/verify-email

Verify email address using a verification token.

**Authentication**: None (public)

**Request Body**:

```json
{
  "token": "verify_1708123456_abc1234"
}
```

**Response** (`200 OK`):

```json
{
  "message": "Email verified successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: `"Invalid verification token"`
- `409 Conflict`: `"Email already verified"`

---

#### GET /auth/me

Get the currently authenticated user's profile.

**Authentication**: Required (Bearer token)

**Response** (`200 OK`):

```json
{
  "id": "user_1708123456_abc1234",
  "email": "user@example.com",
  "name": "John Doe",
  "phoneNumber": "+11234567890",
  "role": "customer",
  "isEmailVerified": true,
  "isActive": true,
  "isSuspended": false,
  "preferences": {},
  "addresses": []
}
```

---

### Chat Endpoints

#### POST /chat

Submit a chat message to the AI assistant. Creates an asynchronous processing job.

**Authentication**: Required (Bearer token)

**Request Body**:

```json
{
  "userId": "user_1708123456_abc1234",
  "message": "Find me Italian restaurants near downtown",
  "sessionId": "session_abc123",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "preferences": {
    "cuisine": "Italian",
    "priceRange": "moderate"
  }
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `userId` | string | Yes | Must match authenticated user |
| `message` | string | Yes | 1-2000 characters |
| `sessionId` | string | No | Session identifier for context |
| `location` | object | No | `{ latitude, longitude }` |
| `preferences` | object | No | User preferences |

**Response** (`201 Created`):

```json
{
  "jobId": "job_1708123456abc1234",
  "status": "QUEUED",
  "message": "Job queued successfully",
  "sessionId": "session_abc123"
}
```

**Error Responses**:
- `403 Forbidden`: `"Forbidden resource"` (userId mismatch)

---

#### GET /jobs/:jobId/status

Check the status of a chat processing job.

**Authentication**: Required (Bearer token)

**Response** (`200 OK`):

Job queued or in progress:

```json
{
  "jobId": "job_1708123456abc1234",
  "status": "IN_PROGRESS",
  "sessionId": "session_abc123",
  "timestamp": "2026-02-17T10:00:00.000Z",
  "progress": {
    "currentStep": "Processing query",
    "totalSteps": 3,
    "currentStepNumber": 1
  }
}
```

Job completed:

```json
{
  "jobId": "job_1708123456abc1234",
  "status": "COMPLETED",
  "sessionId": "session_abc123",
  "timestamp": "2026-02-17T10:00:00.000Z",
  "result": {
    "response": "Here are some recommendations for you.",
    "restaurants": [
      {
        "id": "restaurant-123",
        "name": "Test Restaurant",
        "rating": 4.5,
        "cuisineTypes": ["Italian"]
      }
    ],
    "dishes": []
  }
}
```

**Error Responses**:
- `400 Bad Request`: `"Invalid job ID format"`
- `403 Forbidden`: `"Forbidden resource"`
- `404 Not Found`: `"Job not found"`
- `410 Gone`: `"Job has expired"`

---

### Restaurant Endpoints

#### GET /restaurants/search

Search for restaurants with filters.

**Authentication**: None (public)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search text |
| `latitude` | number | User latitude for geo search |
| `longitude` | number | User longitude for geo search |
| `radius` | number | Search radius in meters |
| `cuisineTypes` | string[] | Filter by cuisine types |
| `priceRange` | string[] | Filter by price range |
| `minRating` | number | Minimum rating filter |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |

**Example Request**:

```
GET /restaurants/search?query=pizza&latitude=40.7128&longitude=-74.006&radius=5000&minRating=4
```

**Response** (`200 OK`):

```json
{
  "results": [
    {
      "id": "restaurant-123",
      "name": "Pizza Palace",
      "cuisineTypes": ["Italian", "Pizza"],
      "rating": 4.5,
      "priceRange": "$$",
      "location": { "latitude": 40.714, "longitude": -74.005 },
      "isOpen": true
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

---

#### GET /restaurants/:id

Get restaurant details by ID.

**Authentication**: Required (Bearer token)

**Response** (`200 OK`):

```json
{
  "id": "restaurant-123",
  "name": "Pizza Palace",
  "description": "Authentic Italian pizza",
  "cuisineTypes": ["Italian", "Pizza"],
  "rating": 4.5,
  "priceRange": "$$",
  "address": "123 Main St, New York, NY",
  "location": { "latitude": 40.714, "longitude": -74.005 },
  "operatingHours": { "open": "11:00", "close": "22:00" },
  "isOpen": true,
  "ownerId": "owner-123"
}
```

---

#### GET /restaurants/:id/menu

Get the menu for a restaurant.

**Authentication**: None (public)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `isVegetarian` | boolean | Filter vegetarian items |

**Response** (`200 OK`):

```json
{
  "restaurantId": "restaurant-123",
  "items": [
    {
      "id": "dish-456",
      "name": "Margherita Pizza",
      "category": "Pizza",
      "price": 12.99,
      "isVegetarian": true,
      "isAvailable": true
    }
  ]
}
```

---

#### POST /restaurants

Create a new restaurant.

**Authentication**: Required (restaurant_owner or admin)

**Request Body**:

```json
{
  "name": "Pizza Palace",
  "description": "Authentic Italian pizza",
  "cuisineTypes": ["Italian", "Pizza"],
  "address": "123 Main St, New York, NY",
  "latitude": 40.714,
  "longitude": -74.005,
  "priceRange": "$$",
  "operatingHours": { "open": "11:00", "close": "22:00" }
}
```

---

#### PUT /restaurants/:id

Update a restaurant.

**Authentication**: Required (restaurant_owner or admin)

---

#### DELETE /restaurants/:id

Delete a restaurant.

**Authentication**: Required (admin only)

---

### Dish Endpoints

#### GET /dishes/search

Search for dishes with filters.

**Authentication**: None (public)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search text |
| `restaurantId` | string | Filter by restaurant |
| `category` | string | Filter by category |
| `isVegetarian` | boolean | Vegetarian filter |
| `isVegan` | boolean | Vegan filter |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

#### GET /dishes/:id

Get dish details by ID.

**Authentication**: None (public)

---

#### POST /dishes

Create a new dish.

**Authentication**: Required (restaurant_owner or admin)

**Request Body**:

```json
{
  "name": "Margherita Pizza",
  "description": "Classic pizza with tomato and mozzarella",
  "price": 12.99,
  "category": "Pizza",
  "restaurantId": "restaurant-123",
  "isVegetarian": true,
  "isVegan": false,
  "isAvailable": true,
  "preparationTime": 20,
  "nutritionalInfo": {
    "calories": 800,
    "protein": 30,
    "carbs": 100,
    "fat": 25
  }
}
```

---

#### PUT /dishes/:id

Update a dish.

**Authentication**: Required (restaurant_owner or admin)

---

#### DELETE /dishes/:id

Delete a dish.

**Authentication**: Required (restaurant_owner or admin)

---

#### PATCH /dishes/:id/availability

Toggle dish availability.

**Authentication**: Required (restaurant_owner or admin)

**Request Body**:

```json
{
  "isAvailable": false
}
```

---

### Cart Endpoints

#### GET /cart

Get the current user's cart.

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "userId": "user-123",
  "items": [
    {
      "id": "cart-item-1",
      "dishId": "dish-456",
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 12.99,
      "specialInstructions": "Extra cheese"
    }
  ],
  "total": 25.98,
  "itemCount": 2
}
```

---

#### POST /cart/items

Add an item to the cart.

**Authentication**: Required

**Request Body**:

```json
{
  "dishId": "dish-456",
  "quantity": 2,
  "specialInstructions": "Extra cheese"
}
```

---

#### PUT /cart/items/:id

Update a cart item.

**Authentication**: Required

**Request Body**:

```json
{
  "quantity": 3,
  "specialInstructions": "No onions"
}
```

---

#### DELETE /cart/items/:id

Remove an item from the cart.

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "message": "Item removed from cart"
}
```

---

#### DELETE /cart

Clear the entire cart.

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "message": "Cart cleared successfully"
}
```

---

### Order Endpoints

#### POST /orders

Place a new order.

**Authentication**: Required

**Request Body**:

```json
{
  "restaurantId": "restaurant-123",
  "items": [
    {
      "dishId": "dish-456",
      "quantity": 2,
      "price": 12.99
    }
  ],
  "deliveryAddress": "456 Elm St, New York, NY 10001",
  "paymentMethod": "card",
  "specialInstructions": "Ring doorbell"
}
```

---

#### GET /orders

List all orders for the authenticated user.

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by order status |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

#### GET /orders/:id

Get details of a specific order.

**Authentication**: Required (must be order owner)

---

#### GET /orders/:id/tracking

Get real-time tracking information for an order.

**Authentication**: Required (must be order owner)

**Response** (`200 OK`):

```json
{
  "orderId": "order-123",
  "status": "preparing",
  "estimatedDelivery": "2026-02-17T11:30:00.000Z",
  "steps": [
    { "step": "Order Placed", "status": "completed", "timestamp": "..." },
    { "step": "Preparing", "status": "current", "timestamp": "..." },
    { "step": "Out for Delivery", "status": "pending" },
    { "step": "Delivered", "status": "pending" }
  ]
}
```

---

#### POST /orders/:id/cancel

Cancel an order.

**Authentication**: Required (must be order owner)

**Request Body**:

```json
{
  "reason": "Changed my mind"
}
```

---

#### PUT /orders/:id/status

Update order status (restaurant owners and admins).

**Authentication**: Required (restaurant_owner or admin)

**Request Body**:

```json
{
  "status": "preparing"
}
```

Valid statuses: `pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`

---

### Payment Endpoints

#### POST /payments/initiate

Initiate a payment for an order.

**Authentication**: Required

**Request Body**:

```json
{
  "orderId": "order-123",
  "amount": 25.98,
  "paymentMethod": "card",
  "cardDetails": {
    "last4": "4242",
    "brand": "visa",
    "expiryMonth": 12,
    "expiryYear": 2027
  }
}
```

**Response** (`201 Created`):

```json
{
  "paymentId": "payment-456",
  "status": "pending",
  "amount": 25.98,
  "currency": "USD"
}
```

---

#### POST /payments/confirm

Confirm a pending payment.

**Authentication**: Required

**Request Body**:

```json
{
  "paymentId": "payment-456",
  "confirmationToken": "tok_confirm_abc123"
}
```

---

#### GET /payments/:id/status

Get payment status.

**Authentication**: Required (must be payment owner)

**Response** (`200 OK`):

```json
{
  "paymentId": "payment-456",
  "status": "success",
  "amount": 25.98,
  "method": "card",
  "transactionId": "txn_789",
  "createdAt": "2026-02-17T10:00:00.000Z"
}
```

---

#### POST /payments/webhook

Handle payment gateway webhooks.

**Authentication**: None (public, verified via signature)

**Headers**:
- `x-webhook-signature`: Webhook signature for verification

**Request Body**:

```json
{
  "event": "payment.completed",
  "paymentId": "payment-456",
  "amount": 25.98,
  "status": "success"
}
```

---

### Feedback Endpoints

#### POST /feedback

Submit feedback for an order.

**Authentication**: Required

**Request Body**:

```json
{
  "orderId": "order-123",
  "rating": 5,
  "comment": "Excellent food and fast delivery!",
  "foodQuality": 5,
  "deliverySpeed": 4,
  "packaging": 5
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `orderId` | string | Yes | Must be a valid order ID |
| `rating` | number | Yes | 1-5 |
| `comment` | string | No | Text feedback |
| `foodQuality` | number | No | 1-5 |
| `deliverySpeed` | number | No | 1-5 |
| `packaging` | number | No | 1-5 |

---

#### GET /feedback/:orderId

Get feedback for a specific order.

**Authentication**: Required (must be feedback owner)

---

### User Endpoints

#### GET /users/me

Get the authenticated user's profile.

**Authentication**: Required

---

#### PUT /users/me

Update the authenticated user's profile.

**Authentication**: Required

**Request Body**:

```json
{
  "name": "Jane Doe",
  "phoneNumber": "+10987654321",
  "email": "jane@example.com"
}
```

Note: The `role` field cannot be changed via this endpoint.

---

#### DELETE /users/me

Delete the authenticated user's account.

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "message": "Account deleted successfully"
}
```

---

#### GET /users/me/addresses

List all saved addresses.

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "addresses": [
    {
      "id": "addr_123",
      "label": "Home",
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94105",
      "country": "US",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "isDefault": true
    }
  ]
}
```

---

#### POST /users/me/addresses

Add a new address.

**Authentication**: Required

**Request Body**:

```json
{
  "label": "Home",
  "street": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "country": "US",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "isDefault": true
}
```

---

#### PUT /users/me/addresses/:id

Update an existing address.

**Authentication**: Required

---

#### DELETE /users/me/addresses/:id

Delete an address.

**Authentication**: Required

**Error Responses**:
- `400 Bad Request`: `"Cannot delete default address. Set another address as default first"`

---

### Admin Endpoints

All admin endpoints require the `admin` role.

#### GET /admin/users

List all users with optional filters.

**Authentication**: Required (admin)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role |
| `search` | string | Search by name or email |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

#### GET /admin/restaurants/pending

List restaurants pending approval.

**Authentication**: Required (admin)

---

#### PUT /admin/restaurants/:id/approve

Approve a pending restaurant.

**Authentication**: Required (admin)

**Request Body**:

```json
{
  "approvalNotes": "All documentation verified"
}
```

---

#### PUT /admin/restaurants/:id/reject

Reject a pending restaurant.

**Authentication**: Required (admin)

**Request Body**:

```json
{
  "rejectionReason": "Missing food safety certificate"
}
```

---

#### GET /admin/dashboard/stats

Get dashboard statistics.

**Authentication**: Required (admin)

**Response** (`200 OK`):

```json
{
  "totalUsers": 1250,
  "totalRestaurants": 85,
  "totalOrders": 15000,
  "pendingRestaurants": 12,
  "activeUsers": 800,
  "revenue": {
    "today": 5000,
    "thisWeek": 35000,
    "thisMonth": 150000
  }
}
```

---

#### PUT /admin/users/:id/suspend

Suspend a user account.

**Authentication**: Required (admin)

**Request Body**:

```json
{
  "reason": "Violation of terms of service",
  "duration": 7
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reason` | string | Reason for suspension |
| `duration` | number | Duration in days (default: 7) |

---

#### PUT /admin/users/:id/reactivate

Reactivate a suspended user account.

**Authentication**: Required (admin)

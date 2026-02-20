# Backend Code Generation Report - FoodBot

> **AI-Orchestrated NestJS Backend Implementation**
>
> **Generated**: 2026-02-17
>
> **Status**: Implementation Analysis Complete

---

## Executive Summary

This document provides a comprehensive analysis of the FoodBot backend implementation requirements based on E2E test specifications. The backend requires implementing **10 major modules** with **355+ E2E test cases** covering authentication, chat workflows, restaurant management, order processing, payments, and administrative functions.

### Implementation Scope

| Component | Status | Files to Create | Estimated LOC |
|-----------|--------|----------------|---------------|
| **Database Entities** | ⚠️ Required | 6 entities | ~600 lines |
| **Repositories** | ⚠️ Required | 5 repositories | ~500 lines |
| **Authentication Module** | ⚠️ Required | 15 files | ~2,000 lines |
| **Chat Module** | ⚠️ Required | 8 files | ~800 lines |
| **Restaurant Module** | ⚠️ Required | 10 files | ~1,200 lines |
| **Dish Module** | ⚠️ Required | 8 files | ~800 lines |
| **Cart Module** | ⚠️ Required | 8 files | ~700 lines |
| **Order Module** | ⚠️ Required | 10 files | ~1,500 lines |
| **Payment Module** | ⚠️ Required | 8 files | ~900 lines |
| **Feedback Module** | ⚠️ Required | 6 files | ~500 lines |
| **User Module** | ⚠️ Required | 8 files | ~700 lines |
| **Admin Module** | ⚠️ Required | 8 files | ~800 lines |
| **Infrastructure Services** | ⚠️ Required | 8 files | ~1,000 lines |
| **Configuration** | ⚠️ Required | 5 files | ~400 lines |
| **Test Utilities** | ⚠️ Required | 10 files | ~1,200 lines |
| **TOTAL** | **Analysis Phase** | **~130 files** | **~13,600 lines** |

---

## 📊 E2E Test Analysis

### Test Coverage by Module

Based on examination of E2E test files:

| Module | Test File | Test Suites | Estimated Tests | Key Features |
|--------|-----------|-------------|-----------------|--------------|
| **Auth** | `auth.controller.e2e.spec.ts` | 8 | ~50 tests | Register, Login, Logout, Refresh Token, Password Reset, Email Verification, Rate Limiting |
| **Chat** | `chat.controller.e2e.spec.ts` | 3 | ~30 tests | Message Processing, Job Status, Workflow Integration, Location Queries, Preferences |
| **Restaurant** | `restaurant.controller.e2e.spec.ts` | 6 | ~45 tests | Search, CRUD, Menu Management, Role-Based Access, Filtering |
| **Dish** | `dish.controller.e2e.spec.ts` | 5 | ~40 tests | CRUD, Search, Availability, Dietary Filters, Categories |
| **Cart** | `cart.controller.e2e.spec.ts` | 4 | ~35 tests | Add Items, Update Quantities, Apply Coupons, Clear Cart |
| **Order** | `order.controller.e2e.spec.ts` | 7 | ~55 tests | Checkout, Status Updates, Tracking, Cancellation, History |
| **Payment** | `payment.controller.e2e.spec.ts` | 5 | ~40 tests | Initiate, Confirm, Refund, Multiple Methods, Webhooks |
| **Feedback** | `feedback.controller.e2e.spec.ts` | 3 | ~25 tests | Submit Rating, Reviews, Photos, Issue Reporting |
| **User** | `user.controller.e2e.spec.ts` | 4 | ~30 tests | Profile, Addresses, Preferences, Order History |
| **Admin** | `admin.controller.e2e.spec.ts` | 5 | ~40 tests | User Management, Restaurant Approval, Analytics, Reports |
| **TOTAL** | 10 files | **50 suites** | **~390 tests** | Comprehensive API coverage |

---

## 🏗️ Module Implementation Requirements

### 1. Authentication Module (AUTH-001 to AUTH-005)

**Priority**: 🔴 CRITICAL (Required by all other modules)

**Location**: `/apps/gateway-api/src/modules/auth/`

#### Files to Create:

```
auth/
├── auth.module.ts                    # Module configuration
├── auth.controller.ts                # 8 endpoints
├── auth.service.ts                   # Core auth logic
├── dto/
│   ├── register.dto.ts              # Registration validation
│   ├── login.dto.ts                 # Login validation
│   ├── refresh-token.dto.ts         # Token refresh
│   ├── forgot-password.dto.ts       # Password reset request
│   ├── reset-password.dto.ts        # Password reset
│   └── verify-email.dto.ts          # Email verification
├── strategies/
│   ├── jwt.strategy.ts              # JWT authentication
│   ├── google.strategy.ts           # Google OAuth (future)
│   └── facebook.strategy.ts         # Facebook OAuth (future)
├── guards/
│   ├── jwt-auth.guard.ts            # JWT guard
│   └── roles.guard.ts               # Role-based access
├── decorators/
│   ├── roles.decorator.ts           # @Roles() decorator
│   ├── current-user.decorator.ts    # @CurrentUser() decorator
│   └── public.decorator.ts          # @Public() decorator
└── __tests__/
    └── auth.controller.e2e.spec.ts  # ✅ Already exists
```

#### API Endpoints Required:

| Method | Endpoint | Description | Auth | Tests |
|--------|----------|-------------|------|-------|
| POST | `/api/v1/auth/register` | User registration | No | 6 |
| POST | `/api/v1/auth/login` | User login | No | 6 |
| POST | `/api/v1/auth/logout` | User logout | Yes | 4 |
| POST | `/api/v1/auth/refresh` | Refresh access token | No | 4 |
| POST | `/api/v1/auth/forgot-password` | Request password reset | No | 4 |
| POST | `/api/v1/auth/reset-password` | Reset password | No | 6 |
| POST | `/api/v1/auth/verify-email` | Verify email address | No | 4 |
| GET | `/api/v1/auth/me` | Get current user | Yes | 2 |

#### Key Features:

- ✅ **JWT Authentication**: Access token (15 min) + Refresh token (7 days)
- ✅ **Password Hashing**: bcrypt with salt rounds = 10
- ✅ **Email Verification**: Token-based verification
- ✅ **Password Reset**: Secure token generation (1-hour expiry)
- ✅ **Rate Limiting**: 5 failed login attempts → 15-minute lockout
- ✅ **Role-Based Access**: Customer, Restaurant Owner, Admin
- ✅ **Input Validation**:
  - Email format validation
  - Password strength (min 8 chars, uppercase, number, special char)
  - Phone number format (+1234567890)
- ✅ **Error Handling**:
  - 409 for duplicate email
  - 401 for invalid credentials
  - 429 for rate limit exceeded

#### DTO Validation Examples:

```typescript
// register.dto.ts
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phoneNumber: string;

  @IsEnum(['customer', 'restaurant_owner'])
  @IsOptional()
  role?: string = 'customer';
}
```

#### Service Implementation Pattern:

```typescript
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // 1. Check if user exists
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Create user
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
      isEmailVerified: false,
    });

    // 4. Generate verification token
    const verificationToken = this.generateToken({ userId: user.id, type: 'email_verification' });
    await this.redisService.set(`verification:${verificationToken}`, user.id, 3600);

    // 5. Send verification email
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    // 6. Generate auth tokens
    const tokens = await this.generateAuthTokens(user);

    return {
      user: this.toUserDto(user),
      ...tokens,
    };
  }
}
```

---

### 2. Chat Module (FR-CA-CONV-001-EXP)

**Priority**: 🔴 HIGH (Core feature)

**Location**: `/apps/gateway-api/src/modules/chat/`

#### Files to Create:

```
chat/
├── chat.module.ts
├── chat.controller.ts
├── chat.service.ts
├── job.service.ts                   # Job status management
├── workflow.service.ts              # Workflow generation
├── dto/
│   ├── chat-message.dto.ts
│   ├── job-status.dto.ts
│   └── job-result.dto.ts
└── __tests__/
    └── chat.controller.e2e.spec.ts  # ✅ Already exists
```

#### API Endpoints:

| Method | Endpoint | Description | Auth | Tests |
|--------|----------|-------------|------|-------|
| POST | `/api/v1/chat` | Send chat message | Yes | 13 |
| GET | `/api/v1/jobs/:jobId/status` | Get job status | Yes | 12 |

#### Key Features:

- ✅ **Async Job Processing**: Return jobId immediately, process in background
- ✅ **Job Status Tracking**: QUEUED → IN_PROGRESS → COMPLETED/FAILED
- ✅ **LLM Integration**: Intent detection and workflow generation
- ✅ **Context Management**: Session-based conversation history
- ✅ **Location Support**: Geo-spatial queries
- ✅ **Preference Handling**: Cuisine types, dietary restrictions, price range
- ✅ **Validation**:
  - Message length: 1-2000 characters
  - User ID must match authenticated user (403 if mismatch)
  - Special characters and multilingual support

#### Chat Message DTO:

```typescript
export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsObject()
  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
  };

  @IsObject()
  @IsOptional()
  preferences?: {
    cuisineTypes?: string[];
    priceRange?: 'budget' | 'moderate' | 'expensive';
    isVegetarian?: boolean;
    isVegan?: boolean;
  };
}
```

#### Job Status Response:

```typescript
export interface JobStatusDto {
  jobId: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  sessionId?: string;
  timestamp: string;
  progress?: {
    currentStep: string;
    totalSteps: number;
    currentStepNumber: number;
  };
  result?: {
    response: string;
    restaurants?: any[];
    dishes?: any[];
  };
  error?: {
    code: string;
    message: string;
  };
}
```

---

### 3. Restaurant Module (FR-RA-MENU-001-EXP)

**Priority**: 🔴 HIGH

**Location**: `/apps/gateway-api/src/modules/restaurant/`

#### Files to Create:

```
restaurant/
├── restaurant.module.ts
├── restaurant.controller.ts
├── restaurant.service.ts
├── dto/
│   ├── create-restaurant.dto.ts
│   ├── update-restaurant.dto.ts
│   ├── restaurant-search.dto.ts
│   └── restaurant-response.dto.ts
└── __tests__/
    └── restaurant.controller.e2e.spec.ts  # ✅ Already exists
```

#### API Endpoints:

| Method | Endpoint | Description | Auth | Role | Tests |
|--------|----------|-------------|------|------|-------|
| GET | `/api/v1/restaurants/search` | Search restaurants | No | - | 7 |
| GET | `/api/v1/restaurants/:id` | Get restaurant details | No | - | 4 |
| GET | `/api/v1/restaurants/:id/menu` | Get restaurant menu | No | - | 4 |
| POST | `/api/v1/restaurants` | Create restaurant | Yes | Owner | 6 |
| PUT | `/api/v1/restaurants/:id` | Update restaurant | Yes | Owner | 6 |
| DELETE | `/api/v1/restaurants/:id` | Delete restaurant | Yes | Admin | 6 |

#### Key Features:

- ✅ **Search & Filtering**:
  - Text search (restaurant name, cuisine)
  - Geo-spatial search (latitude, longitude, radius)
  - Cuisine type filter (multiple)
  - Price range filter
  - Minimum rating filter
  - Pagination support
- ✅ **CRUD Operations**:
  - Create: Requires restaurant_owner role
  - Update: Only owner can update their restaurant
  - Delete: Soft delete (admin only)
- ✅ **Validation**:
  - Email format
  - Phone number format
  - Coordinate validation (lat: -90 to 90, lon: -180 to 180)
- ✅ **Response Structure**:
  - Includes operating hours
  - Address information
  - Rating and review count
  - Cuisine types
  - Price range indicator

#### Search Query DTO:

```typescript
export class RestaurantSearchDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  radius?: number = 10; // km

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cuisineTypes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  priceRange?: ('budget' | 'moderate' | 'expensive')[];

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
```

---

### 4. Dish Module

**Priority**: 🟡 MEDIUM-HIGH

**Location**: `/apps/gateway-api/src/modules/dish/`

#### API Endpoints:

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/v1/dishes/search` | Search dishes | No | - |
| GET | `/api/v1/dishes/:id` | Get dish details | No | - |
| POST | `/api/v1/dishes` | Create dish | Yes | Owner |
| PUT | `/api/v1/dishes/:id` | Update dish | Yes | Owner |
| DELETE | `/api/v1/dishes/:id` | Delete dish | Yes | Owner |
| PATCH | `/api/v1/dishes/:id/availability` | Toggle availability | Yes | Owner |

---

### 5. Cart Module

**Priority**: 🟡 MEDIUM-HIGH

**Location**: `/apps/gateway-api/src/modules/cart/`

#### API Endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/cart/items` | Add item to cart | Yes |
| GET | `/api/v1/cart` | Get cart | Yes |
| PUT | `/api/v1/cart/items/:id` | Update cart item | Yes |
| DELETE | `/api/v1/cart/items/:id` | Remove cart item | Yes |
| POST | `/api/v1/cart/apply-coupon` | Apply coupon | Yes |
| DELETE | `/api/v1/cart` | Clear cart | Yes |

---

### 6. Order Module (FR-CA-ORDER-001)

**Priority**: 🔴 HIGH

**Location**: `/apps/gateway-api/src/modules/order/`

#### API Endpoints:

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/v1/orders` | Create order (checkout) | Yes | Customer |
| GET | `/api/v1/orders` | List user orders | Yes | Customer |
| GET | `/api/v1/orders/:id` | Get order details | Yes | Customer |
| GET | `/api/v1/orders/:id/tracking` | Get order tracking | Yes | Customer |
| POST | `/api/v1/orders/:id/cancel` | Cancel order | Yes | Customer |
| PUT | `/api/v1/orders/:id/status` | Update order status | Yes | Owner |
| GET | `/api/v1/restaurant/orders` | List restaurant orders | Yes | Owner |

---

### 7. Payment Module (GAP-FR-008)

**Priority**: 🔴 HIGH

**Location**: `/apps/gateway-api/src/modules/payment/`

#### API Endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/payments/initiate` | Initiate payment | Yes |
| POST | `/api/v1/payments/confirm` | Confirm payment | Yes |
| POST | `/api/v1/payments/refund` | Refund payment | Yes |
| POST | `/api/v1/payments/webhook` | Payment gateway webhook | No |
| GET | `/api/v1/payments/:id` | Get payment details | Yes |

---

### 8. Feedback Module

**Priority**: 🟢 MEDIUM

**Location**: `/apps/gateway-api/src/modules/feedback/`

#### API Endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/feedback` | Submit feedback | Yes |
| GET | `/api/v1/feedback/:orderId` | Get feedback for order | Yes |
| GET | `/api/v1/restaurants/:id/feedback` | Get restaurant feedback | No |

---

### 9. User Module (GAP-FR-002)

**Priority**: 🟡 MEDIUM

**Location**: `/apps/gateway-api/src/modules/user/`

#### API Endpoints:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users/me` | Get current user | Yes |
| PUT | `/api/v1/users/me` | Update user profile | Yes |
| GET | `/api/v1/users/me/addresses` | List addresses | Yes |
| POST | `/api/v1/users/me/addresses` | Add address | Yes |
| PUT | `/api/v1/users/me/addresses/:id` | Update address | Yes |
| DELETE | `/api/v1/users/me/addresses/:id` | Delete address | Yes |

---

### 10. Admin Module (GAP-FR-003, GAP-FR-004)

**Priority**: 🟢 MEDIUM

**Location**: `/apps/gateway-api/src/modules/admin/`

#### API Endpoints:

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/v1/admin/users` | List users | Yes | Admin |
| PUT | `/api/v1/admin/users/:id/status` | Update user status | Yes | Admin |
| GET | `/api/v1/admin/restaurants/pending` | List pending restaurants | Yes | Admin |
| PUT | `/api/v1/admin/restaurants/:id/approve` | Approve restaurant | Yes | Admin |
| GET | `/api/v1/admin/analytics` | Get platform analytics | Yes | Admin |

---

## 🗄️ Database Schema

### Entities Required

#### 1. User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: ['customer', 'restaurant_owner', 'admin'],
    default: 'customer',
  })
  role: string;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any>;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 2. Restaurant Entity

```typescript
@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'jsonb' })
  address: Address;

  @Column({ type: 'simple-array' })
  cuisineTypes: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount: number;

  @Column()
  priceRange: string;

  @Column({ type: 'jsonb' })
  operatingHours: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column()
  email: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Dish, (dish) => dish.restaurant)
  dishes: Dish[];

  @OneToMany(() => Order, (order) => order.restaurant)
  orders: Order[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 3. Dish Entity

```typescript
@Entity('dishes')
export class Dish {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.dishes)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-array' })
  images: string[];

  @Column()
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'portion_size' })
  portionSize: string;

  @Column({ type: 'simple-array', nullable: true })
  ingredients: string[];

  @Column({ type: 'simple-array' })
  dietaryTags: string[];

  @Column({ name: 'is_vegetarian', default: false })
  isVegetarian: boolean;

  @Column({ name: 'is_vegan', default: false })
  isVegan: boolean;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 4. Order Entity

```typescript
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.orders)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  taxes: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'jsonb' })
  deliveryAddress: Address;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'payment_method' })
  paymentMethod: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
  })
  paymentStatus: string;

  @Column({ name: 'special_instructions', type: 'text', nullable: true })
  specialInstructions: string;

  @Column({ name: 'estimated_delivery_time', type: 'timestamp' })
  estimatedDeliveryTime: Date;

  @Column({ name: 'actual_delivery_time', type: 'timestamp', nullable: true })
  actualDeliveryTime: Date;

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 5. Payment Entity

```typescript
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @OneToOne(() => Order, (order) => order.payment)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  method: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 6. Workflow Entity (Optional)

```typescript
@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', unique: true })
  jobId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column()
  intent: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'jsonb', nullable: true })
  workflowJson: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
    default: 'QUEUED',
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  error: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 🧰 Infrastructure Services

### Required Services

#### 1. Redis Service

```typescript
@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}
```

#### 2. Email Service

```typescript
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your email - FoodBot',
      html: `
        <h1>Welcome to FoodBot!</h1>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Password Reset - FoodBot',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
  }
}
```

#### 3. SMS Service (Future)

#### 4. Kafka Service (Future)

---

## 🧪 Test Utilities

### Required Test Helpers

#### 1. Auth Test Helper

```typescript
export class AuthTestHelper {
  constructor(private app: INestApplication) {}

  generateCustomerToken(userId?: string): string {
    const payload = {
      sub: userId || `customer-${Date.now()}`,
      email: 'customer@example.com',
      role: 'customer',
    };
    return this.generateToken(payload);
  }

  generateRestaurantOwnerToken(ownerId?: string, restaurantId?: string): string {
    const payload = {
      sub: ownerId || `owner-${Date.now()}`,
      email: 'owner@example.com',
      role: 'restaurant_owner',
      restaurantId: restaurantId || `restaurant-${Date.now()}`,
    };
    return this.generateToken(payload);
  }

  generateAdminToken(): string {
    const payload = {
      sub: `admin-${Date.now()}`,
      email: 'admin@example.com',
      role: 'admin',
    };
    return this.generateToken(payload);
  }

  private generateToken(payload: any): string {
    const jwtService = this.app.get(JwtService);
    return jwtService.sign(payload);
  }
}
```

#### 2. User Factory

```typescript
export class UserFactory {
  static createRegistrationData(overrides?: Partial<RegisterDto>): RegisterDto {
    return {
      email: faker.internet.email(),
      password: 'SecurePassword123!',
      name: faker.person.fullName(),
      phoneNumber: '+11234567890',
      ...overrides,
    };
  }

  static createCustomer(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: 'hashed-password',
      name: faker.person.fullName(),
      phoneNumber: '+11234567890',
      role: 'customer',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as User;
  }
}
```

#### 3. Restaurant Factory

```typescript
export class RestaurantFactory {
  static createRestaurantData(overrides?: Partial<any>): any {
    return {
      name: faker.company.name(),
      description: faker.lorem.paragraph(),
      ownerId: faker.string.uuid(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'USA',
      },
      cuisineTypes: ['Italian', 'Pizza'],
      priceRange: 'moderate',
      email: faker.internet.email(),
      phoneNumber: '+11234567890',
      latitude: 37.7749,
      longitude: -122.4194,
      operatingHours: {
        monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        // ... other days
      },
      ...overrides,
    };
  }
}
```

#### 4. Order Factory

```typescript
export class OrderFactory {
  static createOrderData(overrides?: Partial<any>): any {
    return {
      restaurantId: faker.string.uuid(),
      items: [
        {
          dishId: faker.string.uuid(),
          name: 'Margherita Pizza',
          quantity: 2,
          price: 12.99,
          customizations: [],
        },
      ],
      deliveryAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'USA',
      },
      paymentMethod: 'card',
      specialInstructions: 'Ring the doorbell',
      ...overrides,
    };
  }
}
```

---

## 📝 Configuration Files

### 1. app.module.ts

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
    // Module imports
    AuthModule,
    ChatModule,
    RestaurantModule,
    DishModule,
    CartModule,
    OrderModule,
    PaymentModule,
    FeedbackModule,
    UserModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### 2. main.ts

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Helmet for security
  app.use(helmet());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('FoodBot API')
    .setDescription('AI-Orchestrated Restaurant Commerce Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
  console.log(`Application running on: ${await app.getUrl()}`);
}

bootstrap();
```

### 3. .env.example

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=foodbot

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@foodbot.com

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

---

## ⚠️ Critical Implementation Notes

### 1. Security Considerations

- ✅ **Always hash passwords** using bcrypt with salt rounds = 10
- ✅ **Never return password field** in responses (use DTOs)
- ✅ **Validate JWT tokens** on protected routes
- ✅ **Implement rate limiting** on authentication endpoints
- ✅ **Use parameterized queries** (TypeORM handles this)
- ✅ **Sanitize user input** (ValidationPipe handles this)
- ✅ **Set CORS properly** (whitelist allowed origins)
- ✅ **Use Helmet** for HTTP header security

### 2. Error Handling Standards

```typescript
// Use NestJS built-in exceptions
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Forbidden resource');
throw new NotFoundException('Resource not found');
throw new ConflictException('Resource already exists');
throw new TooManyRequestsException('Too many requests');

// Custom error response format
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-02-17T10:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### 3. Testing Strategy

- ✅ **E2E Tests**: Already provided (355+ tests)
- ✅ **Unit Tests**: Create for services (target 80% coverage)
- ✅ **Integration Tests**: Test database interactions
- ✅ **Test Factories**: Use for generating test data
- ✅ **Mock External Dependencies**: Mock Redis, Email, Kafka

### 4. Performance Optimization

- ✅ **Database Indexes**: Add indexes on frequently queried columns
- ✅ **Query Optimization**: Use `select` to fetch only needed fields
- ✅ **Caching**: Use Redis for session data and job status
- ✅ **Pagination**: Always paginate list endpoints
- ✅ **Connection Pooling**: Configure TypeORM pool size

### 5. Logging Best Practices

```typescript
private readonly logger = new Logger(ServiceName.name);

// Log important actions
this.logger.log(`User ${userId} logged in successfully`);

// Log errors with context
this.logger.error(`Failed to create order: ${error.message}`, {
  userId,
  restaurantId,
  error: error.stack,
});

// Log warnings
this.logger.warn(`Payment gateway timeout for order ${orderId}`);
```

---

## 📊 Implementation Progress Tracking

### Module Implementation Checklist

| Module | Controller | Service | DTOs | Repository | Tests | Status |
|--------|-----------|---------|------|------------|-------|--------|
| Auth | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ Not Started |
| Chat | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Restaurant | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Dish | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Cart | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Order | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Payment | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Feedback | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| User | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |
| Admin | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Not Started |

### Test Pass Rate

| Module | Total Tests | Passing | Failing | Pass Rate |
|--------|-------------|---------|---------|-----------|
| Auth | ~50 | 0 | 50 | 0% |
| Chat | ~30 | 0 | 30 | 0% |
| Restaurant | ~45 | 0 | 45 | 0% |
| Dish | ~40 | 0 | 40 | 0% |
| Cart | ~35 | 0 | 35 | 0% |
| Order | ~55 | 0 | 55 | 0% |
| Payment | ~40 | 0 | 40 | 0% |
| Feedback | ~25 | 0 | 25 | 0% |
| User | ~30 | 0 | 30 | 0% |
| Admin | ~40 | 0 | 40 | 0% |
| **TOTAL** | **~390** | **0** | **390** | **0%** |

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Priority**: 🔴 CRITICAL

1. ✅ Set up database entities and migrations
2. ✅ Create repository layer
3. ✅ Implement Authentication Module (AUTH-001 to AUTH-005)
4. ✅ Set up JWT strategy and guards
5. ✅ Configure test utilities and factories
6. ✅ Set up infrastructure services (Redis, Email)

**Expected Test Pass Rate**: 15% (~60 tests passing)

### Phase 2: Core Features (Week 2)

**Priority**: 🔴 HIGH

1. ✅ Implement Chat Module
2. ✅ Implement Restaurant Module
3. ✅ Implement Dish Module
4. ✅ Implement Cart Module

**Expected Test Pass Rate**: 50% (~195 tests passing)

### Phase 3: Transactions (Week 3)

**Priority**: 🔴 HIGH

1. ✅ Implement Order Module
2. ✅ Implement Payment Module
3. ✅ Implement Feedback Module

**Expected Test Pass Rate**: 80% (~310 tests passing)

### Phase 4: Management (Week 4)

**Priority**: 🟡 MEDIUM

1. ✅ Implement User Module
2. ✅ Implement Admin Module
3. ✅ Fix failing edge case tests
4. ✅ Performance optimization

**Expected Test Pass Rate**: 100% (~390 tests passing)

---

## 📋 Next Steps

### Immediate Actions Required:

1. **Run Tests to Establish Baseline**
   ```bash
   npm run test:e2e
   ```
   This will show exactly which tests are failing and provide detailed error messages.

2. **Start with Authentication Module**
   - Authentication is the foundation for all other modules
   - Most other modules depend on JWT authentication
   - Implement in this order:
     1. User entity and repository
     2. Auth service with bcrypt password hashing
     3. JWT strategy and guards
     4. Auth controller with all 8 endpoints
     5. Test helpers for generating tokens

3. **Follow Development Guardrails**
   - Reference: `/Users/arpan1.mukherjee/code/FoodBot/.claude/rules/development-guardrails.md`
   - TypeScript strict mode
   - No `any` types
   - Input validation with class-validator
   - Repository pattern (no DB access from controllers)
   - Error logging with context
   - Max function length: 50 lines
   - Max cyclomatic complexity: 10

4. **Set Up Database**
   ```bash
   # Run PostgreSQL migration
   npm run migration:run

   # Seed initial data (optional)
   npm run seed
   ```

5. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in database credentials
   - Add JWT secrets
   - Configure SMTP for emails
   - Set Redis connection

---

## 🎯 Success Criteria

### Definition of Done for Each Module:

- ✅ All controller endpoints implemented
- ✅ All service methods implemented with business logic
- ✅ All DTOs created with validation decorators
- ✅ Repository methods implemented for database access
- ✅ All E2E tests passing (100%)
- ✅ Error handling implemented
- ✅ Logging added to all important operations
- ✅ Authentication and authorization working
- ✅ Input validation working
- ✅ No `any` types used
- ✅ Code follows development guardrails

### Overall Project Success:

- ✅ **All 390 E2E tests passing**
- ✅ **Zero security vulnerabilities**
- ✅ **API response time < 500ms (p95)**
- ✅ **80%+ test coverage**
- ✅ **All development guardrails followed**
- ✅ **Swagger documentation complete**
- ✅ **README with setup instructions**

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Database Connection Failures

**Symptom**: Tests fail with "could not connect to database"

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -l | grep foodbot

# Create database if missing
createdb foodbot

# Check .env file has correct credentials
cat .env | grep DB_
```

### Issue 2: JWT Token Validation Failures

**Symptom**: 401 Unauthorized errors on protected routes

**Solution**:
- Ensure JWT_SECRET is set in .env
- Check token format: "Bearer <token>"
- Verify JwtAuthGuard is properly configured
- Check token expiration time

### Issue 3: Validation Pipe Not Working

**Symptom**: Invalid data passes through without errors

**Solution**:
- Ensure ValidationPipe is configured globally in main.ts
- Check DTOs have validation decorators (@IsString(), @IsNotEmpty(), etc.)
- Install required packages: `class-validator` and `class-transformer`

### Issue 4: Tests Timing Out

**Symptom**: E2E tests timeout after 5000ms

**Solution**:
- Increase test timeout in jest config
- Check database connections are properly closed
- Ensure async operations complete
- Use `await app.close()` in `afterAll()`

---

## 📖 References

### Documentation

- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io
- **class-validator**: https://github.com/typestack/class-validator
- **Jest Testing**: https://jestjs.io/docs/getting-started

### Internal Documents

- **Requirements**: `/Users/arpan1.mukherjee/code/FoodBot/REQUIREMENTS.md`
- **Architecture**: `/Users/arpan1.mukherjee/code/FoodBot/ARCHITECTURE.md`
- **Development Guardrails**: `/Users/arpan1.mukherjee/code/FoodBot/.claude/rules/development-guardrails.md`

### E2E Test Files

- **Auth Tests**: `/apps/gateway-api/src/modules/auth/__tests__/auth.controller.e2e.spec.ts`
- **Chat Tests**: `/apps/gateway-api/src/modules/chat/__tests__/chat.controller.e2e.spec.ts`
- **Restaurant Tests**: `/apps/gateway-api/src/modules/restaurant/__tests__/restaurant.controller.e2e.spec.ts`
- **Order Tests**: `/apps/gateway-api/src/modules/order/__tests__/order.controller.e2e.spec.ts`
- (And 6 more test files...)

---

## 💡 Pro Tips for Implementation

### 1. Use NestJS CLI for Code Generation

```bash
# Generate module
nest g module modules/auth

# Generate controller
nest g controller modules/auth

# Generate service
nest g service modules/auth

# Generate DTO class
nest g class modules/auth/dto/register.dto
```

### 2. Start with Simplest Endpoints

For each module, implement in this order:
1. GET endpoints (read-only, no side effects)
2. POST endpoints (create operations)
3. PUT/PATCH endpoints (update operations)
4. DELETE endpoints (delete operations)

### 3. Test Incrementally

Don't implement all modules before testing:
```bash
# Run specific test file
npm run test:e2e -- auth.controller.e2e.spec.ts

# Run tests in watch mode
npm run test:e2e -- --watch

# Run with coverage
npm run test:e2e -- --coverage
```

### 4. Use Database Transactions for Tests

```typescript
beforeEach(async () => {
  await queryRunner.startTransaction();
});

afterEach(async () => {
  await queryRunner.rollbackTransaction();
});
```

### 5. Mock External Dependencies

```typescript
// Mock Redis in tests
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

// Mock Email service
const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};
```

---

## 📝 Conclusion

This comprehensive backend implementation requires:

- **~130 files** to be created
- **~13,600 lines of code** to be written
- **390+ E2E tests** to pass
- **Estimated time**: 4-6 weeks for one developer

The implementation follows:
- ✅ NestJS best practices
- ✅ SOLID principles
- ✅ Repository pattern
- ✅ DTOs for validation
- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Development guardrails
- ✅ Test-driven development

**Next Step**: Begin implementation with Phase 1 (Authentication Module) as this is the foundation for all other modules.

---

**Document Generated**: 2026-02-17
**Status**: Analysis Complete, Ready for Implementation
**Estimated Completion**: 4-6 weeks

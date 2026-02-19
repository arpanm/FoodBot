# Security Package Integration Guide

## Step-by-Step Integration

### 1. Install the Package

```bash
cd /path/to/your/app
npm install @foodbot/security
```

### 2. Configure Environment Variables

Create or update `.env` file:

```bash
# Generate secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:
```env
JWT_ACCESS_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=foodbot
JWT_AUDIENCE=foodbot-api

ENCRYPTION_KEY=<generated-key>

REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Import SecurityModule

In your main application module:

```typescript
// apps/gateway-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from '@foodbot/security';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SecurityModule, // Add security module
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Update main.ts with Security Configuration

```typescript
// apps/gateway-api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  SecurityHeadersInterceptor,
  SecurityLoggingInterceptor,
  SanitizeInputInterceptor,
} from '@foodbot/security';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Helmet.js for secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );

  // Security: CORS Configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Security interceptors
  app.useGlobalInterceptors(
    new SecurityHeadersInterceptor(),
    new SecurityLoggingInterceptor(),
    app.get(SanitizeInputInterceptor)
  );

  await app.listen(3000);
}

bootstrap();
```

### 5. Create Authentication Module

```typescript
// apps/gateway-api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { SecurityModule } from '@foodbot/security';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [SecurityModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
```

### 6. Implement Authentication Service

```typescript
// apps/gateway-api/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PasswordService,
  JwtAuthService,
  AccountLockoutService,
  UserRole,
  Permission,
} from '@foodbot/security';

@Injectable()
export class AuthService {
  constructor(
    private passwordService: PasswordService,
    private jwtService: JwtAuthService,
    private accountLockoutService: AccountLockoutService
  ) {}

  async login(email: string, password: string) {
    // 1. Check account lockout
    if (this.accountLockoutService.isAccountLocked(email)) {
      const remainingTime = this.accountLockoutService.getRemainingLockoutTime(email);
      throw new UnauthorizedException(
        `Account locked. Try again in ${remainingTime} minutes`
      );
    }

    // 2. Get user from database
    const user = await this.findUserByEmail(email);
    if (!user) {
      this.accountLockoutService.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Verify password
    const isValid = await this.passwordService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const shouldLock = this.accountLockoutService.recordFailedAttempt(email);
      if (shouldLock) {
        throw new UnauthorizedException('Account locked due to too many failed attempts');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Reset failed attempts on successful login
    this.accountLockoutService.resetFailedAttempts(email);

    // 5. Generate tokens
    const tokens = await this.jwtService.generateTokens({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: this.getPermissionsForRoles(user.roles),
    });

    return tokens;
  }

  async register(email: string, password: string, role: UserRole) {
    // 1. Validate password
    const validation = this.passwordService.validatePassword(password);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // 2. Hash password
    const passwordHash = await this.passwordService.hashPassword(password);

    // 3. Create user (implement your database logic)
    const user = await this.createUser({
      email,
      passwordHash,
      roles: [role],
    });

    // 4. Generate tokens
    return this.jwtService.generateTokens({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: this.getPermissionsForRoles(user.roles),
    });
  }

  async refreshToken(refreshToken: string, userId: string) {
    // Get user from database
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Refresh access token
    return this.jwtService.refreshAccessToken(refreshToken, {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: this.getPermissionsForRoles(user.roles),
    });
  }

  // Implement these methods based on your database
  private async findUserByEmail(email: string) {
    // Database query
    return null;
  }

  private async findUserById(id: string) {
    // Database query
    return null;
  }

  private async createUser(data: any) {
    // Database insert
    return null;
  }

  private getPermissionsForRoles(roles: UserRole[]): Permission[] {
    // Use RbacService to get permissions
    return [];
  }
}
```

### 7. Implement Authentication Controller

```typescript
// apps/gateway-api/src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  Public,
  RateLimit,
  RateLimitPresets,
  RateLimitGuard,
  CurrentUser,
  JwtPayload,
} from '@foodbot/security';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @RateLimit(RateLimitPresets.STRICT) // 5 requests per minute
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('register')
  @RateLimit(RateLimitPresets.STRICT)
  async register(@Body() body: { email: string; password: string; role: string }) {
    return this.authService.register(body.email, body.password, body.role as any);
  }

  @Post('refresh')
  @RateLimit(RateLimitPresets.STANDARD)
  async refresh(@Body() body: { refreshToken: string }, @CurrentUser() user: JwtPayload) {
    return this.authService.refreshToken(body.refreshToken, user.sub);
  }
}
```

### 8. Protect Your Routes

```typescript
// apps/gateway-api/src/orders/orders.controller.ts
import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  RateLimitGuard,
  Roles,
  Permissions,
  CurrentUser,
  RateLimit,
  RateLimitPresets,
  UserRole,
  Permission,
  JwtPayload,
} from '@foodbot/security';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, RateLimitGuard)
export class OrdersController {
  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @RateLimit(RateLimitPresets.STANDARD)
  async getOrders(@CurrentUser() user: JwtPayload) {
    // Only customers and admins can view orders
    return { userId: user.sub, orders: [] };
  }

  @Post()
  @Permissions(Permission.ORDER_WRITE)
  @RateLimit(RateLimitPresets.STRICT)
  async createOrder(@Body() orderDto: any, @CurrentUser() user: JwtPayload) {
    // Only users with ORDER_WRITE permission can create orders
    return { orderId: '123', userId: user.sub };
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.ORDER_MANAGE)
  @RateLimit(RateLimitPresets.RELAXED)
  async getAllOrders(@CurrentUser() user: JwtPayload) {
    // Only admins with ORDER_MANAGE permission
    return { orders: [] };
  }
}
```

### 9. Input Validation with DTOs

```typescript
// apps/gateway-api/src/orders/dto/create-order.dto.ts
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @Min(0)
  total: number;
}
```

### 10. Encrypt Sensitive Data

```typescript
// apps/gateway-api/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { EncryptionService } from '@foodbot/security';

@Injectable()
export class UsersService {
  constructor(private encryptionService: EncryptionService) {}

  async saveUser(userData: any) {
    // Encrypt sensitive data before storing
    const encryptedPhone = this.encryptionService.encrypt(userData.phoneNumber);
    const encryptedAddress = this.encryptionService.encrypt(userData.address);

    // Store in database
    await this.database.users.create({
      ...userData,
      phoneNumber: JSON.stringify(encryptedPhone),
      address: JSON.stringify(encryptedAddress),
    });
  }

  async getUser(userId: string) {
    const user = await this.database.users.findById(userId);

    // Decrypt sensitive data
    const encryptedPhone = JSON.parse(user.phoneNumber);
    const encryptedAddress = JSON.parse(user.address);

    return {
      ...user,
      phoneNumber: this.encryptionService.decrypt(encryptedPhone),
      address: this.encryptionService.decrypt(encryptedAddress),
    };
  }
}
```

## Testing Your Integration

### 1. Unit Tests

```typescript
// auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PasswordService, JwtAuthService, AccountLockoutService } from '@foodbot/security';

describe('AuthService', () => {
  let service: AuthService;
  let passwordService: PasswordService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, PasswordService, JwtAuthService, AccountLockoutService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    passwordService = module.get<PasswordService>(PasswordService);
  });

  it('should hash password on registration', async () => {
    const password = 'TestPassword123!';
    jest.spyOn(passwordService, 'hashPassword');

    await service.register('test@example.com', password, 'customer' as any);

    expect(passwordService.hashPassword).toHaveBeenCalledWith(password);
  });
});
```

### 2. E2E Tests

```typescript
// auth.e2e.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST) - should return JWT tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  it('/auth/login (POST) - should reject invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      })
      .expect(401);
  });
});
```

## Troubleshooting

### Issue: "JWT secrets are not configured"
**Solution**: Ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set in `.env`

### Issue: "ENCRYPTION_KEY not found"
**Solution**: Generate and set `ENCRYPTION_KEY` in `.env`

### Issue: Rate limiting not working across instances
**Solution**: Configure Redis URL in `.env` for distributed rate limiting

### Issue: CORS errors
**Solution**: Add your frontend URL to `ALLOWED_ORIGINS` in `.env`

## Production Checklist

- [ ] All secrets stored in AWS Secrets Manager or HashiCorp Vault
- [ ] JWT secrets are strong (32+ characters)
- [ ] Encryption key properly generated and secured
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured with production origins
- [ ] Rate limiting enabled with Redis
- [ ] Input validation on all endpoints
- [ ] Security headers configured
- [ ] Logging enabled and monitored
- [ ] Dependency audit passed (npm audit, Snyk)

## Support

For integration issues: dev@foodbot.com
For security issues: security@foodbot.com

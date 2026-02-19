import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Services
import { EncryptionService } from './encryption/encryption.service';
import { PasswordService } from './encryption/password.service';
import { JwtAuthService } from './auth/jwt.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { AccountLockoutService } from './auth/account-lockout.service';
import { RateLimiterService } from './rate-limiting/rate-limiter.service';
import { SanitizerService } from './validation/sanitizer.service';
import { ValidatorService } from './validation/validator.service';
import { SecretsService } from './secrets/secrets.service';
import { RbacService } from './rbac/rbac.service';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

// Interceptors
import { SecurityHeadersInterceptor } from './interceptors/security-headers.interceptor';
import { SecurityLoggingInterceptor } from './interceptors/logging.interceptor';
import { SanitizeInputInterceptor } from './interceptors/sanitize-input.interceptor';

/**
 * Security Module
 * Production-grade security hardening and OWASP compliance
 *
 * Features:
 * - JWT Authentication with refresh tokens
 * - Password hashing with bcrypt (12 rounds)
 * - Data encryption at rest (AES-256-GCM)
 * - Rate limiting with Redis support
 * - Input validation and sanitization
 * - RBAC and permission-based access control
 * - Security headers and CORS
 * - Account lockout protection
 * - Secrets management
 * - Comprehensive security logging
 */
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      },
    }),
  ],
  providers: [
    // Services
    EncryptionService,
    PasswordService,
    JwtAuthService,
    JwtStrategy,
    AccountLockoutService,
    RateLimiterService,
    SanitizerService,
    ValidatorService,
    SecretsService,
    RbacService,

    // Guards
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    RateLimitGuard,

    // Interceptors
    SecurityHeadersInterceptor,
    SecurityLoggingInterceptor,
    SanitizeInputInterceptor,
  ],
  exports: [
    // Services
    EncryptionService,
    PasswordService,
    JwtAuthService,
    AccountLockoutService,
    RateLimiterService,
    SanitizerService,
    ValidatorService,
    SecretsService,
    RbacService,

    // Guards
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    RateLimitGuard,

    // Interceptors
    SecurityHeadersInterceptor,
    SecurityLoggingInterceptor,
    SanitizeInputInterceptor,

    // Modules
    JwtModule,
    PassportModule,
  ],
})
export class SecurityModule {}

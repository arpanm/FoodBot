/**
 * Core Security Types
 * OWASP Compliant Type Definitions
 */

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for token tracking
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SecurityConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    issuer: string;
    audience: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltRounds: number;
  };
  rateLimit: {
    ttl: number;
    limit: number;
    blockDuration?: number;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventCommon: boolean;
  };
}

export enum UserRole {
  ADMIN = 'admin',
  RESTAURANT_OWNER = 'restaurant_owner',
  CUSTOMER = 'customer',
  DELIVERY_PARTNER = 'delivery_partner',
  SUPPORT = 'support',
}

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Restaurant permissions
  RESTAURANT_READ = 'restaurant:read',
  RESTAURANT_WRITE = 'restaurant:write',
  RESTAURANT_DELETE = 'restaurant:delete',
  RESTAURANT_MANAGE = 'restaurant:manage',

  // Order permissions
  ORDER_READ = 'order:read',
  ORDER_WRITE = 'order:write',
  ORDER_DELETE = 'order:delete',
  ORDER_MANAGE = 'order:manage',

  // Menu permissions
  MENU_READ = 'menu:read',
  MENU_WRITE = 'menu:write',
  MENU_DELETE = 'menu:delete',

  // Admin permissions
  ADMIN_ACCESS = 'admin:access',
  SYSTEM_CONFIG = 'system:config',
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  authTag: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SecurityAuditLog {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login.success',
  LOGIN_FAILED = 'login.failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token.refresh',
  PASSWORD_CHANGE = 'password.change',
  PASSWORD_RESET = 'password.reset',
  ACCOUNT_LOCKED = 'account.locked',
  UNAUTHORIZED_ACCESS = 'unauthorized.access',
  RATE_LIMIT_EXCEEDED = 'rate_limit.exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious.activity',
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommon: boolean;
  preventReuse: number; // Number of previous passwords to check
  expiryDays?: number;
}

export interface AccountLockoutPolicy {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  resetAfterMinutes: number;
}

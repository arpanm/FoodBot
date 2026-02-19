import { SecurityConfig } from '../types';

/**
 * Default Security Configuration
 * OWASP-compliant security settings
 */
export const defaultSecurityConfig: SecurityConfig = {
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || '',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'foodbot',
    audience: process.env.JWT_AUDIENCE || 'foodbot-api',
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltRounds: 12, // bcrypt salt rounds
  },
  rateLimit: {
    ttl: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute
    blockDuration: 15 * 60 * 1000, // 15 minutes
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },
  password: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
  },
};

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: Partial<SecurityConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // JWT validation
  if (config.jwt) {
    if (!config.jwt.accessTokenSecret || config.jwt.accessTokenSecret.length < 32) {
      errors.push('JWT access token secret must be at least 32 characters');
    }
    if (!config.jwt.refreshTokenSecret || config.jwt.refreshTokenSecret.length < 32) {
      errors.push('JWT refresh token secret must be at least 32 characters');
    }
  }

  // Encryption validation
  if (config.encryption) {
    if (config.encryption.saltRounds < 10) {
      errors.push('bcrypt salt rounds should be at least 10');
    }
  }

  // CORS validation
  if (config.cors) {
    if (!config.cors.allowedOrigins || config.cors.allowedOrigins.length === 0) {
      errors.push('At least one allowed origin must be specified');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get security config with validation
 */
export function getSecurityConfig(): SecurityConfig {
  const config = defaultSecurityConfig;
  const validation = validateSecurityConfig(config);

  if (!validation.valid) {
    console.error('Security configuration errors:', validation.errors);
    throw new Error('Invalid security configuration: ' + validation.errors.join(', '));
  }

  return config;
}

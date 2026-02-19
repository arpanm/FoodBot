/**
 * Environment Variable Validator
 *
 * Validates required environment variables at application startup
 * Prevents runtime errors due to missing or invalid configuration
 *
 * @module EnvValidator
 * @version 1.0.0
 */

export interface EnvValidationRule {
  key: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  pattern?: RegExp;
  validator?: (value: string) => boolean;
  defaultValue?: string;
  description?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  invalidValues: Array<{ key: string; reason: string }>;
}

export class EnvironmentValidator {
  private rules: EnvValidationRule[] = [];
  private env: Record<string, string | undefined>;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.env = env;
  }

  /**
   * Add validation rule for an environment variable
   */
  addRule(rule: EnvValidationRule): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Add multiple validation rules
   */
  addRules(rules: EnvValidationRule[]): this {
    this.rules.push(...rules);
    return this;
  }

  /**
   * Validate all registered rules
   */
  validate(): EnvValidationResult {
    const result: EnvValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      missingRequired: [],
      invalidValues: [],
    };

    for (const rule of this.rules) {
      const value = this.env[rule.key];

      // Check required fields
      if (rule.required && !value) {
        result.missingRequired.push(rule.key);
        result.errors.push(
          `Missing required environment variable: ${rule.key}${
            rule.description ? ` (${rule.description})` : ''
          }`
        );
        result.valid = false;
        continue;
      }

      // Skip validation if not required and not provided
      if (!value) {
        if (rule.defaultValue) {
          this.env[rule.key] = rule.defaultValue;
          result.warnings.push(
            `Using default value for ${rule.key}: ${rule.defaultValue}`
          );
        }
        continue;
      }

      // Type validation
      if (rule.type) {
        const typeValid = this.validateType(value, rule.type);
        if (!typeValid) {
          result.invalidValues.push({
            key: rule.key,
            reason: `Invalid type. Expected ${rule.type}, got: ${value}`,
          });
          result.errors.push(
            `Invalid type for ${rule.key}. Expected ${rule.type}`
          );
          result.valid = false;
          continue;
        }
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        result.invalidValues.push({
          key: rule.key,
          reason: `Does not match required pattern: ${rule.pattern}`,
        });
        result.errors.push(
          `Invalid format for ${rule.key}. Must match pattern: ${rule.pattern}`
        );
        result.valid = false;
        continue;
      }

      // Custom validator
      if (rule.validator) {
        try {
          if (!rule.validator(value)) {
            result.invalidValues.push({
              key: rule.key,
              reason: 'Failed custom validation',
            });
            result.errors.push(`Custom validation failed for ${rule.key}`);
            result.valid = false;
          }
        } catch (error) {
          result.invalidValues.push({
            key: rule.key,
            reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          result.errors.push(
            `Validation error for ${rule.key}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          result.valid = false;
        }
      }
    }

    return result;
  }

  /**
   * Validate and throw error if invalid
   */
  validateOrThrow(): void {
    const result = this.validate();

    if (!result.valid) {
      const errorMessage = [
        'Environment validation failed:',
        '',
        ...result.errors,
        '',
        'Please check your environment configuration.',
      ].join('\n');

      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn('Environment validation warnings:');
      result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }
  }

  /**
   * Validate type of environment variable
   */
  private validateType(value: string, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';

      case 'number':
        return !isNaN(Number(value));

      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());

      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }

      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      case 'json':
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }

      default:
        return true;
    }
  }

  /**
   * Get validated environment value with type casting
   */
  get<T = string>(key: string, defaultValue?: T): T {
    const value = this.env[key];

    if (!value && defaultValue !== undefined) {
      return defaultValue;
    }

    if (!value) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    // Type casting based on default value type
    if (typeof defaultValue === 'number') {
      return Number(value) as T;
    }

    if (typeof defaultValue === 'boolean') {
      return (value.toLowerCase() === 'true' || value === '1') as T;
    }

    return value as T;
  }
}

/**
 * Production-ready validation rules for FoodBot
 */
export function createProductionValidationRules(): EnvValidationRule[] {
  return [
    // Application
    {
      key: 'NODE_ENV',
      required: true,
      pattern: /^(development|staging|production|test)$/,
      description: 'Application environment',
    },
    {
      key: 'PORT',
      required: false,
      type: 'number',
      defaultValue: '3000',
      description: 'Application port',
    },

    // Security
    {
      key: 'JWT_SECRET',
      required: true,
      validator: (value) => value.length >= 32,
      description: 'JWT secret (minimum 32 characters)',
    },
    {
      key: 'JWT_REFRESH_SECRET',
      required: true,
      validator: (value) => value.length >= 32,
      description: 'JWT refresh secret (minimum 32 characters)',
    },

    // Database
    {
      key: 'DB_HOST',
      required: true,
      description: 'Database host',
    },
    {
      key: 'DB_PORT',
      required: true,
      type: 'number',
      description: 'Database port',
    },
    {
      key: 'DB_USER',
      required: true,
      description: 'Database user',
    },
    {
      key: 'DB_PASSWORD',
      required: true,
      description: 'Database password',
    },
    {
      key: 'DB_NAME',
      required: true,
      description: 'Database name',
    },

    // Redis
    {
      key: 'REDIS_URL',
      required: true,
      type: 'url',
      description: 'Redis connection URL',
    },

    // LLM Providers
    {
      key: 'ANTHROPIC_API_KEY',
      required: false,
      validator: (value) => value.startsWith('sk-ant-'),
      description: 'Anthropic API key',
    },
    {
      key: 'OPENAI_API_KEY',
      required: false,
      validator: (value) => value.startsWith('sk-'),
      description: 'OpenAI API key',
    },

    // Temporal
    {
      key: 'TEMPORAL_ADDRESS',
      required: true,
      description: 'Temporal server address',
    },
    {
      key: 'TEMPORAL_NAMESPACE',
      required: true,
      description: 'Temporal namespace',
    },

    // Elasticsearch
    {
      key: 'ELASTICSEARCH_URL',
      required: true,
      type: 'url',
      description: 'Elasticsearch URL',
    },

    // Kafka
    {
      key: 'KAFKA_BROKERS',
      required: true,
      description: 'Kafka broker list',
    },

    // Observability
    {
      key: 'SENTRY_DSN',
      required: false,
      type: 'url',
      description: 'Sentry DSN for error tracking',
    },
  ];
}

/**
 * Validate production environment
 */
export function validateProductionEnvironment(): void {
  const validator = new EnvironmentValidator();
  validator.addRules(createProductionValidationRules());

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    validator.addRules([
      {
        key: 'DB_SSL',
        required: true,
        pattern: /^true$/,
        description: 'Database SSL must be enabled in production',
      },
      {
        key: 'REDIS_TLS',
        required: true,
        pattern: /^true$/,
        description: 'Redis TLS must be enabled in production',
      },
      {
        key: 'ALLOWED_ORIGINS',
        required: true,
        validator: (value) => !value.includes('localhost'),
        description: 'CORS origins must not include localhost in production',
      },
    ]);
  }

  validator.validateOrThrow();
}

/**
 * Create a type-safe configuration object
 */
export function createConfig() {
  const validator = new EnvironmentValidator();

  return {
    app: {
      env: validator.get('NODE_ENV', 'development'),
      port: validator.get('PORT', 3000),
    },
    auth: {
      jwtSecret: validator.get('JWT_SECRET'),
      jwtRefreshSecret: validator.get('JWT_REFRESH_SECRET'),
      jwtExpiration: validator.get('JWT_EXPIRATION', '15m'),
      jwtRefreshExpiration: validator.get('JWT_REFRESH_EXPIRATION', '7d'),
    },
    database: {
      host: validator.get('DB_HOST'),
      port: validator.get('DB_PORT', 5432),
      user: validator.get('DB_USER'),
      password: validator.get('DB_PASSWORD'),
      name: validator.get('DB_NAME'),
      poolSize: validator.get('DB_POOL_SIZE', 20),
      ssl: validator.get('DB_SSL', false),
    },
    redis: {
      url: validator.get('REDIS_URL'),
      host: validator.get('REDIS_HOST', 'localhost'),
      port: validator.get('REDIS_PORT', 6379),
      password: validator.get('REDIS_PASSWORD', ''),
      db: validator.get('REDIS_DB', 0),
      tls: validator.get('REDIS_TLS', false),
    },
    cors: {
      allowedOrigins: validator
        .get('ALLOWED_ORIGINS', 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim()),
    },
    rateLimit: {
      ttl: validator.get('RATE_LIMIT_TTL', 60),
      max: validator.get('RATE_LIMIT_MAX', 100),
    },
    logging: {
      level: validator.get('LOG_LEVEL', 'info'),
      format: validator.get('LOG_FORMAT', 'json'),
    },
    observability: {
      enabled: validator.get('OBSERVABILITY_ENABLED', false),
      sentryDsn: validator.get('SENTRY_DSN', ''),
    },
  };
}

export type AppConfig = ReturnType<typeof createConfig>;

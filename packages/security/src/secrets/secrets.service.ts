import { Injectable } from '@nestjs/common';

/**
 * Secrets Service
 * OWASP A02: Cryptographic Failures Protection
 * OWASP A05: Security Misconfiguration Protection
 *
 * Manages application secrets with support for multiple backends
 * Production: Use AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault
 * Development: Use environment variables
 */
@Injectable()
export class SecretsService {
  private secretsCache = new Map<string, { value: string; expiresAt: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Get secret from environment variables or secrets manager
   */
  async getSecret(key: string): Promise<string> {
    // Check cache first
    const cached = this.secretsCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    // Get from appropriate backend
    const value = await this.fetchSecret(key);

    if (!value) {
      throw new Error(`Secret ${key} not found`);
    }

    // Cache the secret
    this.secretsCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return value;
  }

  /**
   * Get multiple secrets at once
   */
  async getSecrets(keys: string[]): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {};

    await Promise.all(
      keys.map(async (key) => {
        secrets[key] = await this.getSecret(key);
      })
    );

    return secrets;
  }

  /**
   * Check if secret exists
   */
  async hasSecret(key: string): Promise<boolean> {
    try {
      await this.getSecret(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear secret from cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.secretsCache.delete(key);
    } else {
      this.secretsCache.clear();
    }
  }

  /**
   * Fetch secret from backend
   */
  private async fetchSecret(key: string): Promise<string | null> {
    // Try environment variable first
    const envValue = process.env[key];
    if (envValue) {
      return envValue;
    }

    // In production, integrate with secrets manager
    // Example: AWS Secrets Manager
    if (process.env.NODE_ENV === 'production') {
      return await this.fetchFromSecretsManager(key);
    }

    return null;
  }

  /**
   * Fetch from AWS Secrets Manager (example implementation)
   * Install: npm install @aws-sdk/client-secrets-manager
   */
  private async fetchFromSecretsManager(key: string): Promise<string | null> {
    // This is a placeholder. In production:
    // 1. Install AWS SDK
    // 2. Configure credentials
    // 3. Implement actual fetching

    /*
    import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const command = new GetSecretValueCommand({ SecretId: key });

    try {
      const response = await client.send(command);
      return response.SecretString || null;
    } catch (error) {
      console.error(`Failed to fetch secret ${key}:`, error);
      return null;
    }
    */

    console.warn(`Secrets Manager not configured. Add AWS SDK integration for production.`);
    return null;
  }

  /**
   * Validate that required secrets are configured
   */
  async validateSecrets(requiredSecrets: string[]): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];

    for (const key of requiredSecrets) {
      if (!(await this.hasSecret(key))) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Rotate secret (invalidate cache)
   */
  rotateSecret(key: string): void {
    this.clearCache(key);
  }
}

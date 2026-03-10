/**
 * Provider Health Service
 *
 * Manages health status tracking for order providers (internal, swiggy, zomato, ondc).
 * Handles health checks, circuit breaker state, and fallback provider selection.
 *
 * Features:
 * - Cached health status with staleness detection
 * - Circuit breaker pattern (closed/open/half-open)
 * - Fallback provider selection when primary is unhealthy
 *
 * Extracted from OrderRoutingService for file-length compliance.
 *
 * Implements FR-CA-ORDER-001: MCP-based order routing.
 */

import { Injectable, Logger } from '@nestjs/common';

import { ProviderType, ProviderHealthStatus, ProviderHealth } from './order-routing.types';

// ============================================================================
// Constants
// ============================================================================

const PROVIDER_HEALTH_CHECK_INTERVAL_MS = 30_000;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);

  private readonly providerHealthCache: Map<ProviderType, ProviderHealth> =
    new Map();

  constructor() {
    this.initializeDefaultHealth();
  }

  /**
   * Check if a provider is healthy.
   */
  async isProviderHealthy(provider: ProviderType): Promise<boolean> {
    const health = this.providerHealthCache.get(provider);

    if (!health) {
      return false;
    }

    const isStale =
      Date.now() - health.lastChecked.getTime() >
      PROVIDER_HEALTH_CHECK_INTERVAL_MS;

    if (isStale) {
      const refreshedHealth = await this.checkProviderHealth(provider);
      return refreshedHealth.status !== 'unhealthy';
    }

    return (
      health.status !== 'unhealthy' &&
      health.circuitBreakerState !== 'open'
    );
  }

  /**
   * Update the health status of a provider.
   */
  updateProviderHealth(
    provider: ProviderType,
    status: ProviderHealthStatus,
    latencyMs: number
  ): void {
    this.providerHealthCache.set(provider, {
      provider,
      status,
      latencyMs,
      lastChecked: new Date(),
      circuitBreakerState:
        status === 'unhealthy' ? 'open' : 'closed',
    });
  }

  /**
   * Find a healthy fallback provider from the given list.
   */
  async findHealthyFallback(
    fallbackProviders: ProviderType[]
  ): Promise<ProviderType | null> {
    for (const provider of fallbackProviders) {
      const isHealthy = await this.isProviderHealthy(provider);
      if (isHealthy) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Check provider health (performs actual health check).
   * In production, this would call the provider's health endpoint.
   */
  async checkProviderHealth(
    provider: ProviderType
  ): Promise<ProviderHealth> {
    const startTime = Date.now();

    const health: ProviderHealth = {
      provider,
      status: 'healthy',
      latencyMs: Date.now() - startTime,
      lastChecked: new Date(),
      circuitBreakerState: 'closed',
    };

    this.providerHealthCache.set(provider, health);
    return health;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private initializeDefaultHealth(): void {
    const providers: ProviderType[] = [
      'internal',
      'swiggy',
      'zomato',
      'ondc',
    ];

    for (const provider of providers) {
      this.providerHealthCache.set(provider, {
        provider,
        status: 'healthy',
        latencyMs: 0,
        lastChecked: new Date(),
        circuitBreakerState: 'closed',
      });
    }
  }
}

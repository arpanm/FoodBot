/**
 * Temporal Module
 *
 * NestJS module for Temporal workflow integration.
 * Provides the TemporalService as a singleton for the entire application.
 */

import { TemporalService } from './temporal.service';

/**
 * Create and configure a TemporalService instance.
 * This factory function handles connection lifecycle.
 */
export async function createTemporalService(
  address?: string,
  namespace?: string
): Promise<TemporalService> {
  const service = new TemporalService(address, namespace);
  await service.connect();
  return service;
}

/**
 * NestJS-compatible provider definition.
 * Use this in your module's providers array.
 */
export const TEMPORAL_SERVICE_PROVIDER = {
  provide: 'TEMPORAL_SERVICE',
  useFactory: async (): Promise<TemporalService> => {
    const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
    return createTemporalService(address, namespace);
  },
};

export { TemporalService };

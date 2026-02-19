/**
 * Database Activities
 *
 * Activity implementations for database operations.
 * Uses repository pattern for data access with connection pooling.
 *
 * In production, these connect to PostgreSQL via TypeORM.
 * The repository instances are injected at worker startup.
 */

import type { Order, OrderStatus } from '../types';

// ============================================================================
// Repository Interface (injected at worker startup)
// ============================================================================

interface Repository<T> {
  findOne(query: { where: Record<string, unknown> }): Promise<T | null>;
  save(entity: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

interface RepositoryMap {
  [key: string]: Repository<unknown>;
}

let repositories: RepositoryMap = {};

/**
 * Initialize database repositories for activity use.
 * Called during worker startup with actual repository instances.
 */
export function initializeRepositories(repos: RepositoryMap): void {
  repositories = repos;
}

function getRepository(type: string): Repository<unknown> {
  const repository = repositories[type];
  if (!repository) {
    throw new Error(`Repository not found for type: ${type}`);
  }
  return repository;
}

// ============================================================================
// Generic Database Activities
// ============================================================================

/**
 * Save an entity to the database.
 *
 * @param collection - The entity type/collection name
 * @param data - The entity data to save
 * @returns The saved entity with generated ID
 */
export async function saveToDatabase(
  collection: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const repository = getRepository(collection);
    const saved = await repository.save(data);
    return saved as Record<string, unknown>;
  } catch (error) {
    if (repositories[collection] === undefined) {
      // Fallback for development/testing without real DB
      const id = `${collection}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return { id, ...data, createdAt: new Date(), updatedAt: new Date() };
    }
    throw error;
  }
}

/**
 * Load an entity from the database by ID.
 *
 * @param collection - The entity type/collection name
 * @param id - The entity ID
 * @returns The entity or null if not found
 */
export async function loadFromDatabase(
  collection: string,
  id: string
): Promise<Record<string, unknown> | null> {
  try {
    const repository = getRepository(collection);
    const entity = await repository.findOne({ where: { id } });
    return entity as Record<string, unknown> | null;
  } catch (error) {
    if (repositories[collection] === undefined) {
      return null;
    }
    throw error;
  }
}

/**
 * Update an entity in the database.
 *
 * @param collection - The entity type/collection name
 * @param id - The entity ID
 * @param data - The fields to update
 * @returns The updated entity
 */
export async function updateDatabase(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const repository = getRepository(collection);
    const updated = await repository.update(id, { ...data, updatedAt: new Date() });
    return updated as Record<string, unknown>;
  } catch (error) {
    if (repositories[collection] === undefined) {
      return { id, ...data, updatedAt: new Date() };
    }
    throw error;
  }
}

/**
 * Delete an entity from the database.
 *
 * @param collection - The entity type/collection name
 * @param id - The entity ID
 * @returns Whether the delete was successful
 */
export async function deleteFromDatabase(collection: string, id: string): Promise<boolean> {
  try {
    const repository = getRepository(collection);
    return await repository.delete(id);
  } catch (error) {
    if (repositories[collection] === undefined) {
      return true;
    }
    throw error;
  }
}

// ============================================================================
// Order-Specific Database Activities
// ============================================================================

/**
 * Create an order in the database.
 *
 * @param orderData - The order data
 * @returns The created order
 */
export async function createOrder(orderData: Record<string, unknown>): Promise<Order> {
  const saved = await saveToDatabase('orders', {
    ...orderData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return saved as unknown as Order;
}

/**
 * Update the status of an order.
 *
 * @param orderId - The order ID
 * @param status - The new order status
 * @returns The updated order
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  const updated = await updateDatabase('orders', orderId, {
    status,
    updatedAt: new Date(),
  });
  return { ...updated, id: orderId, status } as unknown as Order;
}

/**
 * Cancel an order.
 *
 * @param orderId - The order ID
 * @returns The cancelled order
 */
export async function cancelOrder(orderId: string): Promise<Order> {
  return updateOrderStatus(orderId, 'cancelled');
}

import { Page, APIRequestContext } from '@playwright/test';

/**
 * API helper utilities for E2E tests
 */

export const API_ENDPOINTS = {
  gateway: process.env.GATEWAY_API_URL || 'http://localhost:3000',
  customerApp: process.env.CUSTOMER_APP_URL || 'http://localhost:3001',
};

export interface Job {
  id: string;
  userId: string;
  action: string;
  platform: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a test job via API
 */
export async function createTestJob(
  request: APIRequestContext,
  jobData: Partial<Job>,
  authToken: string
): Promise<Job> {
  const response = await request.post(`${API_ENDPOINTS.gateway}/jobs`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    data: jobData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create job: ${response.status()} ${response.statusText()}`);
  }

  return response.json();
}

/**
 * Get job status via API
 */
export async function getJobStatus(
  request: APIRequestContext,
  jobId: string,
  authToken: string
): Promise<Job> {
  const response = await request.get(`${API_ENDPOINTS.gateway}/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to get job status: ${response.status()} ${response.statusText()}`);
  }

  return response.json();
}

/**
 * Poll job until completion
 */
export async function pollJobUntilComplete(
  request: APIRequestContext,
  jobId: string,
  authToken: string,
  options: { timeout?: number; interval?: number } = {}
): Promise<Job> {
  const { timeout = 60000, interval = 2000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const job = await getJobStatus(request, jobId, authToken);

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
}

/**
 * Create order via API
 */
export async function createOrder(
  request: APIRequestContext,
  orderData: {
    restaurantId: string;
    items: Array<{ dishId: string; quantity: number }>;
    deliveryAddress: string;
  },
  authToken: string
): Promise<{ orderId: string; jobId: string }> {
  const response = await request.post(`${API_ENDPOINTS.gateway}/orders`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    data: orderData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create order: ${response.status()} ${response.statusText()}`);
  }

  return response.json();
}

/**
 * Get order status
 */
export async function getOrderStatus(
  request: APIRequestContext,
  orderId: string,
  authToken: string
): Promise<{ status: string; trackingInfo?: Record<string, unknown> }> {
  const response = await request.get(`${API_ENDPOINTS.gateway}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to get order status: ${response.status()} ${response.statusText()}`);
  }

  return response.json();
}

/**
 * Search restaurants via API
 */
export async function searchRestaurants(
  request: APIRequestContext,
  query: string,
  authToken: string
): Promise<Array<{ id: string; name: string; cuisine: string }>> {
  const response = await request.get(
    `${API_ENDPOINTS.gateway}/restaurants/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to search restaurants: ${response.status()} ${response.statusText()}`
    );
  }

  const data = await response.json();
  return data.restaurants;
}

/**
 * Get menu for restaurant
 */
export async function getRestaurantMenu(
  request: APIRequestContext,
  restaurantId: string,
  authToken: string
): Promise<Array<{ id: string; name: string; price: number }>> {
  const response = await request.get(
    `${API_ENDPOINTS.gateway}/restaurants/${restaurantId}/menu`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to get menu: ${response.status()} ${response.statusText()}`);
  }

  const data = await response.json();
  return data.menu;
}

/**
 * Wait for API to be healthy
 */
export async function waitForAPIHealth(
  request: APIRequestContext,
  timeout = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await request.get(`${API_ENDPOINTS.gateway}/health`);
      if (response.ok()) {
        return;
      }
    } catch (error) {
      // Continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`API not healthy after ${timeout}ms`);
}

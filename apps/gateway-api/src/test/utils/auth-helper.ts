import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';

/**
 * Authentication helper for E2E tests
 */
export class AuthTestHelper {
  private jwtService: JwtService;

  constructor(private app: INestApplication) {
    this.jwtService = this.app.get(JwtService);
  }

  /**
   * Generates a JWT token for testing
   */
  generateToken(payload: {
    userId: string;
    email: string;
    role: string;
  }): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'test-secret',
      expiresIn: '1h',
    });
  }

  /**
   * Generates a token for a customer user
   */
  generateCustomerToken(userId: string = 'test-customer-id'): string {
    return this.generateToken({
      userId,
      email: 'customer@example.com',
      role: 'customer',
    });
  }

  /**
   * Generates a token for a restaurant owner
   */
  generateRestaurantOwnerToken(
    userId: string = 'test-owner-id',
    restaurantId?: string
  ): string {
    const payload: any = {
      userId,
      email: 'owner@example.com',
      role: 'restaurant_owner',
    };
    if (restaurantId) {
      payload.restaurantId = restaurantId;
    }
    return this.generateToken(payload);
  }

  /**
   * Generates a token for an admin user
   */
  generateAdminToken(userId: string = 'test-admin-id'): string {
    return this.generateToken({
      userId,
      email: 'admin@example.com',
      role: 'admin',
    });
  }

  /**
   * Performs login and returns auth token
   */
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(credentials)
      .expect(200);

    return response.body.accessToken;
  }

  /**
   * Registers a new user and returns auth token
   */
  async register(userData: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
  }): Promise<{ token: string; userId: string }> {
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    return {
      token: response.body.accessToken,
      userId: response.body.user.id,
    };
  }

  /**
   * Creates authorization header with Bearer token
   */
  static createAuthHeader(token: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Adds auth header to supertest request
   */
  static withAuth(
    req: request.Test,
    token: string
  ): request.Test {
    return req.set('Authorization', `Bearer ${token}`);
  }
}

/**
 * Mock auth tokens for different user roles
 */
export const mockAuthTokens = {
  customer: 'mock-customer-token',
  restaurantOwner: 'mock-restaurant-owner-token',
  admin: 'mock-admin-token',
};

/**
 * Mock user payloads for testing
 */
export const mockUserPayloads = {
  customer: {
    userId: 'customer-123',
    email: 'customer@test.com',
    role: 'customer',
  },
  restaurantOwner: {
    userId: 'owner-123',
    email: 'owner@test.com',
    role: 'restaurant_owner',
    restaurantId: 'restaurant-123',
  },
  admin: {
    userId: 'admin-123',
    email: 'admin@test.com',
    role: 'admin',
  },
};

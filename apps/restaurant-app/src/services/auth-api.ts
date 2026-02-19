/**
 * Authentication API service
 * Handles login, register, token refresh, and user profile
 */

import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
} from '../types/api.types';
import type { RestaurantOwner } from '../types/models';
import { JWT_STORAGE_KEY, REFRESH_TOKEN_KEY } from '../utils/constants';

import { apiClient } from './api-client';

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    const loginData = response.data;

    localStorage.setItem(JWT_STORAGE_KEY, loginData.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, loginData.refreshToken);

    return loginData;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      ...data,
      role: 'restaurant_owner',
    });
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem(JWT_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    });
    const tokenData = response.data;

    localStorage.setItem(JWT_STORAGE_KEY, tokenData.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refreshToken);

    return tokenData;
  },

  async getCurrentUser(): Promise<RestaurantOwner> {
    const response = await apiClient.get<{ user: RestaurantOwner }>('/auth/me');
    return response.data.user;
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/verify-email', {
      token,
    });
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(JWT_STORAGE_KEY));
  },
};

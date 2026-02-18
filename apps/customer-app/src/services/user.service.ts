import { apiClient } from './api/axios.config';
import { User, UserPreferences, Address } from '../types/models';
import {
  UpdateProfileRequest,
  UpdatePreferencesRequest,
  CreateAddressRequest
} from '../types/api.types';

class UserService {
  async getCurrentUser(): Promise<User> {
    return apiClient.get('/user/me');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    return apiClient.put('/user/profile', data);
  }

  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<UserPreferences> {
    return apiClient.put('/user/preferences', preferences);
  }

  async getAddresses(): Promise<Address[]> {
    return apiClient.get('/user/addresses');
  }

  async addAddress(address: CreateAddressRequest): Promise<Address> {
    return apiClient.post('/user/addresses', address);
  }

  async deleteAddress(addressId: string): Promise<void> {
    return apiClient.delete(`/user/addresses/${addressId}`);
  }
}

export const userService = new UserService();

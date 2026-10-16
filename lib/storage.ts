import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const LEASE_KEY = 'selected_lease_id';

export const secureStorage = {
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    const userString = await SecureStore.getItemAsync(USER_KEY);
    return userString ? JSON.parse(userString) : null;
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(LEASE_KEY);
  },

  async setLeaseId(leaseId: string, userId: string): Promise<void> {
    await SecureStore.setItemAsync(`${LEASE_KEY}_${userId}`, leaseId);
  },

  async getLeaseId(userId: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`${LEASE_KEY}_${userId}`);
  },
};

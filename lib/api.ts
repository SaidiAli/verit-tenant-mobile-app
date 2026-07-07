import axios, { AxiosError, AxiosResponse } from 'axios';
import { secureStorage } from './storage';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  User,
  PaymentBalance,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  PaymentReceipt,
  PaymentWithDetails,
  PaymentScheduleItem,
  LeaseApiResponse,
  TenantDashboardData,
  TenantPropertyInfo,
  TenantSettings,
  SettingsProfile,
  NotificationSettings,
  PreferenceSettings,
  PaymentPreferences,
  MaintenanceRequest,
  MaintenanceListItem,
  MaintenanceRequestDetail,
  MaintenanceCategory,
  MaintenancePhoto,
  MaintenancePhotoUpload,
  CreateMaintenanceRequestInput
} from '../types';

import * as Sentry from '@sentry/react-native';

// `EXPO_PUBLIC_API_URL` is inlined into the bundle at build time (it is not read
// at runtime). If it is missing — e.g. the bundle was built without a `.env`, or
// the var wasn't exported to EAS — every request would otherwise silently fall
// back to a relative URL and `lib/socket.ts` would crash on `undefined.replace`.
// Fail loudly here instead so the cause is obvious.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Add it to .env.local (e.g. http://<your-lan-ip>:4000/api) ' +
      'and restart the bundler with `npx expo start -c`. For EAS builds, set it in eas.json / build env.',
  );
}

export const API_BASE_URL: string = apiBaseUrl;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased timeout for slower connections
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await secureStorage.clear();
      // Note: Navigation will be handled by the auth context

      Sentry.captureException(error);
    }

    Sentry.captureException(error);
    return Promise.reject(error);
  }
);

// User profile update types
interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Auth API functions
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {

      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Login failed');
      }

      // Ensure user has required fields
      const authData = response.data.data;
      if (!authData.user.firstName || !authData.token) {
        throw new Error('Invalid response data from server');
      }

      return authData;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Unable to connect to server. Please check your connection and ensure the server is running.');
      }

      throw new Error(error.message || 'Login failed');
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/me');

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get user data');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired or invalid
        await secureStorage.clear();
        throw new Error('Session expired. Please login again.');
      } else if (error.response?.status === 404) {
        throw new Error('User not found');
      }

      throw new Error(error.message || 'Failed to get user data');
    }
  },

  updateUser: async (userData: UpdateUserRequest): Promise<User> => {
    try {
      // Unified settings surface (server: PUT /api/settings/profile)
      const response = await api.put<ApiResponse<User>>('/settings/profile', userData);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update profile');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid profile data');
      } else if (error.response?.status === 409) {
        throw new Error('Email already exists');
      }

      throw new Error(error.message || 'Failed to update profile');
    }
  },

  changePassword: async (passwordData: ChangePasswordRequest): Promise<void> => {
    try {
      // Unified settings surface (server: PUT /api/settings/security)
      const response = await api.put<ApiResponse<{ message: string }>>('/settings/security', passwordData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to change password');
      }
    } catch (error: any) {
      // Server returns 400 "Current password is incorrect" for a wrong current password
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid password data');
      } else if (error.response?.status === 401) {
        throw new Error('Current password is incorrect');
      }

      throw new Error(error.message || 'Failed to change password');
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to send reset code');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid email address');
      } else if (error.response?.status === 404) {
        throw new Error('No account found with this email');
      }
      throw new Error(error.message || 'Failed to send reset code');
    }
  },

  verifyOtp: async (email: string, otp: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>('/auth/verify-otp', { email, otp });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Invalid verification code');
      }
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 429) {
        // Too many failed attempts — the current code is now dead; only a fresh
        // one works. Tag the error so the screen can steer the user to resend.
        const err = new Error(
          error.response.data?.error || 'Too many failed attempts. Please request a new code.',
        );
        (err as any).status = 429;
        throw err;
      }
      if (status === 400) {
        throw new Error(error.response.data?.error || 'Invalid verification code');
      }
      throw new Error(error.message || 'Failed to verify code');
    }
  },

  resetPassword: async (email: string, otp: string, newPassword: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { email, otp, newPassword });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to reset password');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid password data');
      }
      throw new Error(error.message || 'Failed to reset password');
    }
  },
};

// Payment API functions
export const paymentApi = {
  /**
   * Get payment balance for a specific lease
   */
  getBalance: async (leaseId: string): Promise<PaymentBalance> => {
    try {
      const response = await api.get<ApiResponse<PaymentBalance>>(`/payments/lease/${leaseId}/balance`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get payment balance');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Lease not found. Please contact support.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw new Error(error.message || 'Failed to get payment balance');
    }
  },

  /**
   * Get payment history for a specific lease
   */
  getHistory: async (leaseId: string): Promise<PaymentWithDetails[]> => {
    try {
      const response = await api.get<ApiResponse<PaymentWithDetails[]>>(`/payments/lease/${leaseId}/history`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get payment history');
      }

      // Return empty array if no data (first time users)
      return response.data.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Return empty array for lease not found or no history
        return [];
      }
      throw new Error(error.message || 'Failed to get payment history');
    }
  },

  /**
   * Initiate a payment
   */
  initiate: async (paymentData: PaymentInitiationRequest): Promise<PaymentInitiationResponse> => {
    try {
      const response = await api.post<ApiResponse<PaymentInitiationResponse>>('/payments/initiate', paymentData);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Failed to initiate payment');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.response.data?.error;
        throw new Error(errorMessage || 'Invalid payment data');
      }
      throw new Error(error.message || 'Failed to initiate payment');
    }
  },

  /**
   * Get payment status
   */
  getStatus: async (transactionId: string): Promise<PaymentStatusResponse> => {
    try {
      const response = await api.get<ApiResponse<PaymentStatusResponse>>(`/payments/status/${transactionId}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get payment status');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Transaction not found');
      }
      throw new Error(error.message || 'Failed to get payment status');
    }
  },

  /**
   * Get payment receipt
   */
  getReceipt: async (paymentId: string): Promise<PaymentReceipt> => {
    try {
      const response = await api.get<ApiResponse<PaymentReceipt>>(`/payments/${paymentId}/receipt`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get receipt');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Receipt only available for completed payments');
      } else if (error.response?.status === 404) {
        throw new Error('Payment not found');
      }
      throw new Error(error.message || 'Failed to get receipt');
    }
  },

  /**
   * Get all payments (for tenant)
   */
  getAll: async (filters?: { status?: string; limit?: number; offset?: number }): Promise<PaymentWithDetails[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await api.get<ApiResponse<PaymentWithDetails[]>>(`/payments?${params.toString()}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get payments');
      }

      return response.data.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get payments');
    }
  },

  /**
   * Get payment schedule for a specific lease
   */
  getSchedule: async (leaseId: string): Promise<PaymentScheduleItem[]> => {
    try {
      const response = await api.get<ApiResponse<PaymentScheduleItem[]>>(`/payment-schedules/?leaseId=${leaseId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get payment schedule');
      }

      return response.data.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(error.message || 'Failed to get payment schedule');
    }
  },
};

// Tenant-specific API functions
export const tenantApi = {
  getDashboard: async (leaseId?: string): Promise<TenantDashboardData> => {
    try {
      const url = leaseId ? `/tenant/dashboard?leaseId=${leaseId}` : '/tenant/dashboard';
      const response = await api.get<ApiResponse<TenantDashboardData>>(url);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get dashboard data');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('No active lease found. Please contact your landlord.');
      } else if (error.response?.status === 404) {
        throw new Error('Tenant data not found. Please contact support.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw new Error(error.message || 'Failed to get dashboard data');
    }
  },

  getLeaseInfo: async (leaseId?: string) => {
    const url = leaseId ? `/tenant/lease?leaseId=${leaseId}` : '/tenant/lease';
    const response = await api.get<ApiResponse<TenantDashboardData>>(url);
    if (response.data?.data) {
      // Backend returns TenantDashboardData, not LeaseApiResponse[]
      // Need to convert the structure to match what the mobile app expects
      const data = response.data.data;
      if (data.lease) {
        // Construct Lease directly from TenantDashboardData
        const lease: any = {
          id: data.lease.id,
          unitId: data.unit?.id || '',
          tenantId: data.tenant.id,
          startDate: data.lease.startDate,
          endDate: data.lease.endDate,
          monthlyRent: data.lease.monthlyRent,
          deposit: data.lease.deposit,
          status: data.lease.status as 'draft' | 'active' | 'expired' | 'terminated',
          terms: data.lease.terms,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          unit: data.unit ? {
            id: data.unit.id,
            propertyId: data.property?.id || '',
            unitNumber: data.unit.unitNumber,
            bedrooms: data.unit.bedrooms,
            bathrooms: parseFloat(data.unit.bathrooms) || 0,
            squareFeet: data.unit.squareFeet,
            monthlyRent: data.lease.monthlyRent,
            deposit: data.lease.deposit,
            isAvailable: false,
            description: data.unit.description,
            createdAt: '',
            updatedAt: '',
            property: data.property ? {
              id: data.property.id,
              name: data.property.name,
              address: data.property.address,
              city: data.property.city,
              state: data.property.state,
              zipCode: data.property.postalCode,
              description: data.property.description,
              landlordId: '',
              createdAt: '',
              updatedAt: ''
            } : undefined
          } : undefined,
          landlord: data.landlord ? {
            id: '',
            firstName: data.landlord.name.split(' ')[0] || '',
            lastName: data.landlord.name.split(' ').slice(1).join(' ') || '',
            phone: data.landlord.phone,
            email: data.landlord.email || '',
            role: 'landlord',
            createdAt: '',
            updatedAt: ''
          } : undefined
        };
        return [lease];
      }
    }
    return [];
  },

  getPayments: async () => {
    return paymentApi.getAll();
  },

  makePayment: async (paymentData: PaymentInitiationRequest) => {
    return paymentApi.initiate(paymentData);
  },

  /**
   * List the tenant's own maintenance requests. The server branches on role and
   * returns one row per request: `{ maintenanceRequest, unit, property, vendor }`.
   */
  getMaintenanceRequests: async (): Promise<MaintenanceListItem[]> => {
    try {
      const response = await api.get<ApiResponse<MaintenanceListItem[]>>('/maintenance');
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load maintenance requests');
      }
      return response.data.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) return [];
      throw new Error(error.message || 'Failed to load maintenance requests');
    }
  },

  /**
   * A single request with its photos: `{ maintenanceRequest, unit, property, vendor, photos }`.
   */
  getMaintenanceRequest: async (id: string): Promise<MaintenanceRequestDetail> => {
    try {
      const response = await api.get<ApiResponse<MaintenanceRequestDetail>>(`/maintenance/${id}`);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to load maintenance request');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Maintenance request not found');
      }
      throw new Error(error.message || 'Failed to load maintenance request');
    }
  },

  /**
   * Submit a maintenance request. When photos are attached we send
   * multipart/form-data (up to 10 photos under the repeated `document` field);
   * otherwise a plain JSON body. `unitId` is derived server-side from the
   * tenant's active lease. Tenants cannot set status/cost/vendor/schedule.
   */
  createMaintenanceRequest: async (form: CreateMaintenanceRequestInput): Promise<MaintenanceRequest> => {
    try {
      const { photos, ...fields } = form;
      let response;

      if (photos && photos.length > 0) {
        const data = new FormData();
        data.append('title', fields.title);
        if (fields.description) data.append('description', fields.description);
        if (fields.priority) data.append('priority', fields.priority);
        if (fields.category) data.append('category', fields.category);
        // React Native FormData file parts: { uri, name, type }. Append each
        // photo under the same `document` field name the server's multer expects.
        photos.forEach((photo) => {
          data.append('document', {
            uri: photo.uri,
            name: photo.name,
            type: photo.type,
          } as any);
        });
        response = await api.post<ApiResponse<MaintenanceRequest>>('/maintenance', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post<ApiResponse<MaintenanceRequest>>('/maintenance', fields);
      }

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Failed to submit request');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        // The server puts the generic label in `error` ("Validation failed") and
        // the field-level reason in `message` — prefer the latter so the tenant
        // sees which field is wrong.
        throw new Error(error.response.data?.message || error.response.data?.error || 'Invalid request details');
      }
      throw new Error(error.message || 'Failed to submit maintenance request');
    }
  },

  /**
   * Attach an additional photo to an existing request (multipart, field `document`).
   */
  addMaintenancePhoto: async (id: string, file: MaintenancePhotoUpload): Promise<MaintenancePhoto> => {
    try {
      const data = new FormData();
      data.append('document', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      const response = await api.post<ApiResponse<MaintenancePhoto>>(`/maintenance/${id}/photos`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to upload photo');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid photo');
      }
      throw new Error(error.message || 'Failed to upload photo');
    }
  },

  /**
   * Landlord-managed maintenance categories for the tenant's landlord (resolved
   * from the active lease). Each item is `{ slug, label }`.
   */
  getMaintenanceCategories: async (): Promise<MaintenanceCategory[]> => {
    try {
      const response = await api.get<ApiResponse<MaintenanceCategory[]>>('/tenant/maintenance-categories');
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load categories');
      }
      return response.data.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) return [];
      throw new Error(error.message || 'Failed to load categories');
    }
  },

  getPropertyInfo: async (leaseId?: string): Promise<TenantPropertyInfo> => {
    try {
      const url = leaseId ? `/tenant/property?leaseId=${leaseId}` : '/tenant/property';
      const response = await api.get<ApiResponse<TenantPropertyInfo>>(url);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get property information');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Property information not found');
      }
      throw new Error(error.message || 'Failed to get property information');
    }
  },

  getAllLeases: async (): Promise<LeaseApiResponse[]> => {
    const response = await api.get<ApiResponse<LeaseApiResponse[]>>('/tenant/leases');
    return response.data.data || [];
  },
};

// Settings API functions (unified /api/settings surface — tenant is always self-scoped)
export const settingsApi = {
  /**
   * Aggregated tenant settings (profile, notifications, preferences, paymentPreferences)
   */
  get: async (): Promise<TenantSettings> => {
    const response = await api.get<ApiResponse<TenantSettings>>('/settings');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to load settings');
    }
    return response.data.data;
  },

  updateProfile: async (data: Partial<Pick<SettingsProfile, 'firstName' | 'lastName' | 'email' | 'phone' | 'avatarUrl'>>): Promise<SettingsProfile> => {
    try {
      const response = await api.put<ApiResponse<SettingsProfile>>('/settings/profile', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update profile');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid profile data');
      } else if (error.response?.status === 409) {
        throw new Error('Email already exists');
      }
      throw new Error(error.message || 'Failed to update profile');
    }
  },

  updateSecurity: async (data: ChangePasswordRequest): Promise<void> => {
    try {
      const response = await api.put<ApiResponse<{ message: string }>>('/settings/security', data);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update password');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Current password is incorrect');
      } else if (error.response?.status === 401) {
        throw new Error('Current password is incorrect');
      }
      throw new Error(error.message || 'Failed to update password');
    }
  },

  updateNotifications: async (data: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    try {
      const response = await api.put<ApiResponse<NotificationSettings>>('/settings/notifications', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update notifications');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid notification settings');
      }
      throw new Error(error.message || 'Failed to update notifications');
    }
  },

  updatePreferences: async (data: Partial<PreferenceSettings>): Promise<PreferenceSettings> => {
    try {
      const response = await api.put<ApiResponse<PreferenceSettings>>('/settings/preferences', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update preferences');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid preferences');
      }
      throw new Error(error.message || 'Failed to update preferences');
    }
  },

  getPaymentPrefs: async (): Promise<PaymentPreferences | null> => {
    const response = await api.get<ApiResponse<PaymentPreferences | null>>('/settings/payment-preferences');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to load payment preferences');
    }
    return response.data.data ?? null;
  },

  updatePaymentPrefs: async (data: Partial<PaymentPreferences>): Promise<PaymentPreferences> => {
    try {
      const response = await api.put<ApiResponse<PaymentPreferences>>('/settings/payment-preferences', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update payment preferences');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid payment preferences');
      }
      throw new Error(error.message || 'Failed to update payment preferences');
    }
  },
};

export default api;
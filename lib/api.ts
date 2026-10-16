import { AxiosError, AxiosResponse, CanceledError, create, isCancel } from 'axios';
import { assertBalanceCurrencies, assertHistoryCurrencies, assertReceiptCurrencies, assertDashboardCurrencies } from './paymentContracts';
import { session } from './session';
import { secureStorage } from './storage';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  TenantActivateRequest,
  PendingTenantAccount,
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

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Add it to .env.local (e.g. http://<your-lan-ip>:4000/api) ' +
      'and restart the bundler with `npx expo start -c`. For EAS builds, set it in eas.json / build env.',
  );
}

export const API_BASE_URL: string = apiBaseUrl;

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    sessionGeneration?: number;
    releaseSessionSignal?: () => void;
  }
}

// Create axios instance
const api = create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased timeout for slower connections
});

api.interceptors.request.use(async config => {
  const generation = session.current();
  config.sessionGeneration = generation;
  const signal = session.signal();
  const requestSignal = config.signal;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  requestSignal?.addEventListener?.('abort', abort);
  config.releaseSessionSignal = () => {
    signal.removeEventListener('abort', abort);
    requestSignal?.removeEventListener?.('abort', abort);
  };
  if (signal.aborted || requestSignal?.aborted) abort();
  config.signal = controller.signal;
  const token = await secureStorage.getToken();
  if (!session.isCurrent(generation)) {
    config.releaseSessionSignal();
    throw new CanceledError('Session changed');
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => {
    response.config.releaseSessionSignal?.();
    if (!session.isCurrent(response.config.sessionGeneration!)) throw new CanceledError('Session changed');
    return response;
  },
  async (error: AxiosError) => {
    error.config?.releaseSessionSignal?.();
    if (isCancel(error)) return Promise.reject(error);
    if (error.config?.sessionGeneration !== undefined && !session.isCurrent(error.config.sessionGeneration)) {
      return Promise.reject(new CanceledError('Session changed'));
    }
    if (error.response?.status === 401 && error.config?.headers.Authorization) {
      onUnauthorized?.();
    }
    if (error.config?.url?.startsWith('/tenant/identity')) {
      Sentry.captureException(new Error(`Tenant identity request failed (HTTP ${error.response?.status ?? 'unavailable'})`));
    } else {
      Sentry.captureException(error);
    }
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
      if (error.response?.status === 401) {
        // Token expired or invalid
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid password data');
      }
      throw new Error(error.message || 'Failed to reset password');
    }
  },

  /**
   * Tenant phone+OTP self-activation — a landlord creates the tenant shell with no credentials;
   * the tenant verifies their phone here, then picks a username/password in `activateTenant`.
   */
  requestTenantOtp: async (phone: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>('/auth/tenant/request-otp', { phone });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      if (isCancel(error)) throw error;
      if (error.response?.status === 429) {
        throw new Error(error.response.data?.error || 'Please wait before requesting another code.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid phone number');
      }
      throw new Error(error.message || 'Failed to send verification code');
    }
  },

  verifyTenantOtp: async (phone: string, otp: string): Promise<PendingTenantAccount[]> => {
    try {
      const response = await api.post<ApiResponse<{ accounts: PendingTenantAccount[] }>>('/auth/tenant/verify-otp', { phone, otp });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Invalid verification code');
      }
      return response.data.data?.accounts ?? [];
    } catch (error: any) {
      if (isCancel(error)) throw error;
      const status = error.response?.status;
      if (status === 429) {
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

  activateTenant: async (data: TenantActivateRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/tenant/activate', data);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to activate account');
      }
      return response.data.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
      if (error.response?.status === 409) {
        throw new Error(error.response.data?.error || 'This username is already taken.');
      } else if (error.response?.status === 400) {
        throw Object.assign(new Error(error.response.data?.message || error.response.data?.error || 'Phone verification expired. Request a fresh code.'), { status: 400 });
      } else if (error.response?.status === 404) {
        throw new Error(error.response.data?.error || 'No account found for this phone number.');
      }
      throw new Error(error.message || 'Failed to activate account');
    }
  },
};

// Payment API functions
export const paymentApi = {
  /**
   * Get payment balance for a specific lease
   */
  getBalance: async (leaseId: string, signal?: AbortSignal): Promise<PaymentBalance> => {
    try {
      const response = await api.get<ApiResponse<PaymentBalance>>(`/payments/lease/${leaseId}/balance`, { signal });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get payment balance');
      }

      // The payload is cast, not validated. A server that omits `currency` silently regresses
      // mobile money to "unavailable" for every lease, UGX included — loud in dev only.
      if (__DEV__ && !response.data.data.currency) {
        console.warn(
          '[getBalance] server returned no `currency`; mobile money will be hidden on all leases',
        );
      }

      assertBalanceCurrencies(response.data.data);
      return response.data.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
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
  getHistory: async (leaseId: string, signal?: AbortSignal): Promise<PaymentWithDetails[]> => {
    try {
      const response = await api.get<ApiResponse<PaymentWithDetails[]>>(`/payments/lease/${leaseId}/history`, { signal });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get payment history');
      }

      // Return empty array if no data (first time users)
      assertHistoryCurrencies(response.data.data);
      return response.data.data || [];
    } catch (error: any) {
      if (isCancel(error)) throw error;
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
      const response = await api.post<ApiResponse<PaymentInitiationResponse>>('/payments/initiate', paymentData, { timeout: 60000 });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Failed to initiate payment');
      }

      return { ...response.data.data, amount: response.data.data.amount ?? paymentData.amount, currency: response.data.data.currency ?? 'UGX', leaseId: paymentData.leaseId };
    } catch (error: any) {
      if (isCancel(error)) throw error;
      const payload = error.response?.data;
      const pending = payload?.data;
      if (error.response?.status === 503 && payload?.error === 'Payment confirmation pending'
        && pending?.status === 'pending' && pending.paymentId && pending.transactionId) {
        return { ...pending, amount: paymentData.amount, currency: 'UGX', leaseId: paymentData.leaseId, confirmationPending: true };
      }
      if (!error.response || error.response.status >= 500) {
        throw Object.assign(new Error('Payment confirmation pending. Check history before starting another payment.'), { confirmationPending: true });
      }
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.response.data?.error;
        throw new Error(errorMessage || 'Invalid payment data');
      }
      throw Object.assign(new Error(payload?.message || payload?.error || error.message || 'Failed to initiate payment'), { code: payload?.code, status: error.response?.status });
    }
  },

  /**
   * Get payment status
   */
  getStatus: async (transactionId: string, signal?: AbortSignal): Promise<PaymentStatusResponse> => {
    try {
      const response = await api.get<ApiResponse<PaymentStatusResponse>>(`/payments/status/${transactionId}`, { signal });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get payment status');
      }

      return response.data.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
      if (error.response?.status === 404) {
        throw new Error('Transaction not found');
      }
      throw new Error(error.message || 'Failed to get payment status');
    }
  },

  /**
   * Get payment receipt
   */
  getReceipt: async (paymentId: string, signal?: AbortSignal): Promise<PaymentReceipt> => {
    try {
      const response = await api.get<ApiResponse<PaymentReceipt>>(`/payments/${paymentId}/receipt`, { signal });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get receipt');
      }

      assertReceiptCurrencies(response.data.data);
      return response.data.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
      throw new Error(error.message || 'Failed to get payments');
    }
  },

  /**
   * Get payment schedule for a specific lease
   */
  getSchedule: async (leaseId: string, signal?: AbortSignal): Promise<PaymentScheduleItem[]> => {
    try {
      const response = await api.get<ApiResponse<PaymentScheduleItem[]>>(`/payment-schedules/?leaseId=${leaseId}`, { signal });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get payment schedule');
      }

      return response.data.data || [];
    } catch (error: any) {
      if (isCancel(error)) throw error;
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(error.message || 'Failed to get payment schedule');
    }
  },
};

// Tenant-specific API functions
export const tenantApi = {
  getDashboard: async (leaseId?: string, signal?: AbortSignal): Promise<TenantDashboardData> => {
    try {
      const url = leaseId ? `/tenant/dashboard?leaseId=${leaseId}` : '/tenant/dashboard';
      const response = await api.get<ApiResponse<TenantDashboardData>>(url, { signal });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get dashboard data');
      }

      assertDashboardCurrencies(response.data.data);
      return response.data.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
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

  getLeaseInfo: async (leaseId?: string, signal?: AbortSignal) => {
    const url = leaseId ? `/tenant/lease?leaseId=${leaseId}` : '/tenant/lease';
    const response = await api.get<ApiResponse<TenantDashboardData>>(url, { signal });
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
          depositCurrency: data.lease.depositCurrency,
          securityDeposit: data.lease.securityDeposit,
          securityDepositCurrency: data.lease.securityDepositCurrency,
          securityDepositStatus: data.lease.securityDepositStatus,
          currency: data.lease.currency,
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
  getMaintenanceRequests: async (signal?: AbortSignal): Promise<MaintenanceListItem[]> => {
    try {
      const response = await api.get<ApiResponse<MaintenanceListItem[]>>('/maintenance', { signal });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load maintenance requests');
      }
      return response.data.data || [];
    } catch (error: any) {
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
      if (error.response?.status === 404) return [];
      throw new Error(error.message || 'Failed to load categories');
    }
  },

  getPropertyInfo: async (leaseId?: string, signal?: AbortSignal): Promise<TenantPropertyInfo> => {
    try {
      const url = leaseId ? `/tenant/property?leaseId=${leaseId}` : '/tenant/property';
      const response = await api.get<ApiResponse<TenantPropertyInfo>>(url, { signal });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get property information');
      }

      return response.data.data;
    } catch (error: any) {
      if (isCancel(error)) throw error;
      if (error.response?.status === 404) {
        throw new Error('Property information not found');
      }
      throw new Error(error.message || 'Failed to get property information');
    }
  },

  getAllLeases: async (signal?: AbortSignal): Promise<LeaseApiResponse[]> => {
    const response = await api.get<ApiResponse<LeaseApiResponse[]>>('/tenant/leases', { signal });
    return response.data.data || [];
  },
};

// Settings API functions (unified /api/settings surface — tenant is always self-scoped)
export const settingsApi = {
  /**
   * Aggregated tenant settings (profile, notifications, preferences, paymentPreferences)
   */
  get: async (signal?: AbortSignal): Promise<TenantSettings> => {
    const response = await api.get<ApiResponse<TenantSettings>>('/settings', { signal });
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
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
      if (isCancel(error)) throw error;
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid payment preferences');
      }
      throw new Error(error.message || 'Failed to update payment preferences');
    }
  },
};

export default api;

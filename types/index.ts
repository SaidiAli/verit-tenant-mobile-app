// Shared types with backend (matching server schema)
export type Currency = 'UGX' | 'USD';

export interface TenantManagementPresentation {
  managingOrganizationId: string;
  managingDisplayName: string;
  managingContactEmail?: string | null;
  managingContactPhone?: string | null;
  ownerOrganizationId: string;
  ownerDisplayName: string;
  ownerLegalName: string;
  portfolioManagementId: string;
  payeeReady: boolean;
  payeeOrganizationId?: string | null;
  payeeDisplayName?: string | null;
  settlementMode?: 'direct_to_owner' | 'agency_collect' | 'agency_collect_net_fee' | null;
}

export interface User {
  id: string;
  userName?: string;
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'landlord' | 'tenant';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description?: string;
  landlordId: string;
  createdAt: string;
  landlord?: User;
  units?: Unit[];
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  monthlyRent: number;
  deposit: number;
  isAvailable: boolean;
  description?: string;
  createdAt: string;
  property?: Property;
  leases?: Lease[];
}

export type SecurityDepositStatus = 'not_required' | 'unpaid' | 'pending' | 'paid' | 'refunded';
export interface SecurityDepositProjection {
  securityDeposit: number | null;
  securityDepositCurrency: Currency | null;
  securityDepositStatus: SecurityDepositStatus;
}

export interface Lease extends SecurityDepositProjection {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  depositCurrency: Currency;
  currency: Currency;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  terms?: string;
  createdAt: string;
  unit?: Unit;
  tenant?: User;
  landlord?: User;
  payments?: Payment[];
}

export type PaymentType = 'rent' | 'security_deposit' | 'utility' | 'late_fee' | 'other';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  rent: 'Rent',
  security_deposit: 'Security Deposit',
  utility: 'Utility Fee',
  late_fee: 'Late Fee',
  other: 'Other',
};

export interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  currency: Currency;
  dueDate?: string;
  paidDate?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  periodCovered?: string;
  paymentType?: PaymentType;
  gateway?: string;
  gatewayReference?: string;
  createdAt: string;
  updatedAt: string;
  lease?: Lease;
}

// Mirrors the server's maintenance status / priority enums.
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus =
  | 'submitted'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  tenantId: string;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  category: string; // slug → landlord-managed maintenance categories
  status: MaintenanceStatus;
  vendorId: string | null;
  dueDate: string | null;
  scheduledDate: string | null;
  assignedAt: string | null;
  // Money is returned as decimal strings; parseFloat before display.
  // Always UGX — maintenance costs feed the auto-expense and expenses are UGX-only
  // (business rule). Never format these with the lease/property currency.
  estimatedCost: string | null;
  actualCost: string | null;
  submittedAt: string;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Minimal shapes for the joined rows the server returns alongside a request.
export interface MaintenanceVendor {
  id: string;
  name: string;
  companyName: string | null;
  phone: string;
}

export interface MaintenanceUnitInfo {
  id: string;
  unitNumber: string;
}

export interface MaintenancePropertyInfo {
  id: string;
  name: string;
  address?: string;
}

export interface MaintenancePhoto {
  id: string;
  maintenanceRequestId: string;
  url: string;
  uploadedBy: string | null;
  createdAt: string;
}

// GET /api/maintenance (tenant) — one row per request.
export interface MaintenanceListItem {
  maintenanceRequest: MaintenanceRequest;
  unit: MaintenanceUnitInfo | null;
  property: MaintenancePropertyInfo | null;
  vendor: MaintenanceVendor | null;
}

// GET /api/maintenance/:id — list item plus its photos.
export interface MaintenanceRequestDetail extends MaintenanceListItem {
  photos: MaintenancePhoto[];
}

// GET /api/tenant/maintenance-categories — landlord-managed list.
export interface MaintenanceCategory {
  slug: string;
  label: string;
}

// A photo picked on-device, ready to append to multipart/form-data.
export interface MaintenancePhotoUpload {
  uri: string;
  name: string;
  type: string;
}

// Create form payload (client side). `unitId` is derived server-side from the
// tenant's active lease, so it is intentionally omitted here.
export interface CreateMaintenanceRequestInput {
  title: string;
  description?: string;
  priority?: MaintenancePriority;
  category?: string; // slug
  photos?: MaintenancePhotoUpload[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginRequestBackend {
  userName: string; // Backend expects userName
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Tenant phone+OTP self-activation (landlord-provisioned tenant sets their own username/password)
export interface PendingTenantAccount {
  tenantId: string;
  landlordName: string;
  propertyName: string | null;
  unitNumber?: string | null;
}

export interface TenantActivateRequest {
  tenantId: string;
  phone: string;
  userName: string;
  password: string;
}

export interface LeaseApiResponse {
  id: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: string;
  propertyName: string;
  unitNumber: string;
  status: 'active' | 'draft' | 'expired' | 'terminated';
  createdAt: string;
  currency: Currency;
}

// Transformation utility to convert backend response to frontend Lease type
export function transformLeaseResponse(response: LeaseApiResponse): Lease {
  // Since the API response is flat and missing many details, we populate what we can
  // and use defaults for the rest. This transformation is likely for list views.

  return {
    id: response.id,
    unitId: '', // Not provided in list response
    tenantId: '', // Not provided in list response
    startDate: response.startDate,
    endDate: response.endDate || '',
    monthlyRent: parseFloat(response.monthlyRent),
    deposit: 0, // Not provided in list response
    depositCurrency: response.currency,
    securityDeposit: null,
    securityDepositCurrency: null,
    securityDepositStatus: 'not_required',
    currency: response.currency,
    status: response.status,
    terms: '', // Not provided
    createdAt: response.createdAt,
    unit: {
      id: '',
      propertyId: '',
      unitNumber: response.unitNumber,
      bedrooms: 0,
      bathrooms: 0,
      monthlyRent: parseFloat(response.monthlyRent),
      deposit: 0,
      isAvailable: false,
      createdAt: '',
      property: {
        id: '',
        name: response.propertyName,
        address: '',
        city: '',
        state: '',
        zipCode: '',
        landlordId: '',
        createdAt: '',
      }
    }
  };
}

// Dashboard data
export interface TenantDashboard {
  currentLease?: Lease;
  upcomingPayments: Payment[];
  recentPayments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  propertyInfo?: Property & { unit: Unit };
}

// Backend Dashboard API Response Type (matches TenantService.getTenantDashboard response)
export interface TenantDashboardData {
  management?: TenantManagementPresentation | null;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
  };
  lease: {
    id: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    deposit: number;
    depositCurrency: Currency;
    securityDeposit: number | null;
    securityDepositCurrency: Currency | null;
    securityDepositStatus: SecurityDepositStatus;
    currency: Currency;
    status: string;
    terms?: string;
  } | null;
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: string;
    squareFeet?: number;
    description?: string;
  } | null;
  property: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    description?: string;
  } | null;
  payments: {
    /** Scoped to the payable currency. Absent when there is no lease or the balance lookup failed. */
    currency?: Currency;
    /** Every currency on the lease; `[]` when no balance could be computed. */
    balances: CurrencyBalance[];
    currentBalance: number;
    nextDueDate?: string | null;
    isOverdue: boolean;
    minimumPayment: number;
    recentPayments: Array<{
      payment: Payment;
      lease: Lease;
      tenant: any;
    }>;
  };
  quickStats: {
    daysInLease: number;
    paymentsOnTime: number;
    totalPaid: number;
    leaseProgress: number;
  };
  landlord: {
    name: string;
    phone: string;
    email?: string;
  } | null;
}

// Payment System Types

/**
 * One currency's slice of a lease balance. A rent-currency transition only re-stamps unpaid
 * schedules whose period has not started, so a lease can owe old-currency arrears *and*
 * new-currency rent at the same time. Never sum across buckets.
 */
export interface CurrencyBalance {
  currency: Currency;
  paidAmount: number;
  outstandingBalance: number;
  minimumPayment: number;
  /** Next unpaid schedule in *this* currency; null when the bucket is fully paid. */
  dueDate: string | null;
  nextPaymentDue?: string;
  isOverdue: boolean;
}

export interface PaymentBalance {
  leaseId: string;
  /** What a payment will actually be billed in. Mobile-money gating keys on this. */
  currency: Currency;
  /** One entry per currency on the lease; `balances[0].currency === currency`. */
  balances: CurrencyBalance[];
  monthlyRent: number;
  /** The lease's current rent currency — differs from `currency` on an arrears-only lease. */
  monthlyRentCurrency: Currency;
  // Flat mirror of balances[0]. Deprecated server-side; scoped to one currency, never a mixed sum.
  paidAmount: number;
  outstandingBalance: number;
  minimumPayment: number;
  dueDate: string | null;
  isOverdue: boolean;
  nextPaymentDue?: string;
}

export interface PaymentInitiationRequest {
  paymentType?: 'rent' | 'security_deposit';
  paymentScope?: 'current' | 'arrears';
  leaseId: string;
  amount: number;
  phoneNumber?: string;
  paymentMethod?: 'mobile_money';
  provider: 'mtn' | 'airtel' | 'm-sente';
}

export interface PaymentInitiationResponse {
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confirmationPending?: boolean;
  gateway?: 'yo' | 'iotec';
  gatewayReference?: string;
  leaseId: string;
  scheduleId?: string;
  statusMessage?: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  gatewayReference?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'indeterminate';
  paymentStatus: 'pending' | 'completed' | 'failed';
  message: string;
  amount: number;
  currency: Currency;
  mnoReference?: string;
  gateway: string;
  processedAt?: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: Currency;
  paymentType?: PaymentType;
  paymentMethod: string;
  paidDate: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
  } | null;
  lease: {
    id: string;
    monthlyRent: number;
    currency: Currency;
    startDate: string;
    endDate?: string | null;
  } | null;
  generatedAt: string;
  dueDate?: string;
  periodCovered?: string | null;
  appliedSchedules?: Array<{
    scheduleId: string;
    paymentNumber: number;
    amountApplied: number;
    scheduledAmount: number;
    currency: Currency;
    period: string;
  }> | null;
  companyInfo: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
}

export interface PaymentWithDetails {
  payment: Payment;
  lease: Lease;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

// Mobile Money Types
export interface MobileMoneyProvider {
  id: 'mtn' | 'airtel';
  name: string;
  displayName: string;
  color: string;
  icon: string;
  prefixes: string[];
}

// Payment Flow Types
export type PaymentStep =
  | 'idle'
  | 'amount-selection'
  | 'payment-method'
  | 'confirmation'
  | 'pin-entry'
  | 'processing'
  | 'pending'
  | 'success'
  | 'failed';

export interface PaymentFlowState {
  paymentType?: 'rent' | 'security_deposit';
  paymentScope?: 'current' | 'arrears';
  step: PaymentStep;
  amount?: number;
  phoneNumber?: string;
  paymentMethod?: MobileMoneyProvider;
  transactionId?: string;
  error?: string;
  isLoading?: boolean;
}

export interface TenantPropertyInfo {
  management?: TenantManagementPresentation | null;
  property: Property;
  unit: Unit;
  landlord: {
    name: string;
    phone: string;
    email?: string;
  };
  amenities: string[];
  rules?: string;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    type: string;
  }>;
}

// Settings types (matches verit-server /api/settings tenant surface)
export interface SettingsProfile {
  id: string;
  userName?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  role: string;
}

export interface NotificationSettings {
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  notifyPush: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export type PreferenceLanguage = 'en' | 'sw' | 'lg';

export interface PreferenceSettings {
  language: PreferenceLanguage;
  timezone: string;
}

export type MobileMoneyProviderId = 'mtn' | 'airtel' | 'm-sente';

export interface PaymentPreferences {
  mobileMoneyPhone: string | null;
  mobileMoneyProvider: MobileMoneyProviderId | null;
  reminderDaysBefore: number;
}

export interface TenantSettings {
  profile: SettingsProfile;
  notifications: NotificationSettings;
  preferences: PreferenceSettings;
  paymentPreferences: PaymentPreferences | null;
}

export interface PaymentScheduleItem {
  id: string;
  leaseId: string;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  currency: Currency;
  periodStart: string;
  periodEnd: string;
  isPaid: boolean;
  paidAmount: number;
  status: 'upcoming' | 'pending' | 'overdue' | 'paid' | 'partial';
}

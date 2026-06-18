// Shared types with backend (matching server schema)
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

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
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

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  submittedAt: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  unit?: Unit;
  tenant?: User;
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

export interface LeaseApiResponse {
  id: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: string;
  propertyName: string;
  unitNumber: string;
  status: 'active' | 'draft' | 'expired' | 'terminated';
  createdAt: string;
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
    currentBalance: number;
    nextDueDate?: string;
    isOverdue: boolean;
    minimumPayment: number;
    recentPayments: Array<{
      payment: any;
      lease: any;
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
export interface PaymentBalance {
  leaseId: string;
  monthlyRent: number;
  paidAmount: number;
  outstandingBalance: number;
  minimumPayment: number;
  dueDate: string;
  isOverdue: boolean;
  nextPaymentDue?: string;
}

export interface PaymentInitiationRequest {
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
  status: 'pending' | 'processing';
  gateway: 'yo' | 'iotec';
  gatewayReference: string;
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
  mnoReference?: string;
  gateway: string;
  processedAt?: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: 'UGX';
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
  | 'success'
  | 'failed';

export interface PaymentFlowState {
  step: PaymentStep;
  amount?: number;
  phoneNumber?: string;
  paymentMethod?: MobileMoneyProvider;
  transactionId?: string;
  error?: string;
  isLoading?: boolean;
}

export interface TenantPropertyInfo {
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

export interface PaymentScheduleItem {
  id: string;
  leaseId: string;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  isPaid: boolean;
  paidAmount: number;
  status: 'upcoming' | 'pending' | 'overdue' | 'paid' | 'partial';
}
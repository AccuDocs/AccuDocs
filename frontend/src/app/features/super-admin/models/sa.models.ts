import { Observable } from 'rxjs';

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  mfa_enabled: boolean;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  gstin?: string;
  pan?: string;
  state_code?: string;
  address?: string;
  subscription_plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  is_active: boolean;
  trial_ends_at: string | null;
  current_subscription_id?: string;
  logo_s3_key?: string;
  bank_name?: string;
  bank_ifsc?: string;
  settings?: any;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields:
  current_subscription?: Subscription;
  client_count?: number;
  user_count?: number;
  stats?: OrgStats;
}

export interface OrgStats {
  total_clients: number;
  total_invoices: number;
  total_revenue_collected: number;
  outstanding_amount: number;
  active_users: number;
  document_count: number;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancelled_at: string | null;
  cancel_reason?: string;
  payment_gateway?: string;
  gateway_subscription_id?: string;
  max_clients: number;
  max_users: number;
  max_storage_gb: number;
  features: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  org_name?: string;
}

export interface PlatformAnalytics {
  organizations: {
    total: number;
    active: number;
    suspended: number;
    deleted: number;
    new_this_month: number;
    new_this_week: number;
  };
  plans: {
    trial: number;
    starter: number;
    professional: number;
    enterprise: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    staff: number;
    clients: number;
  };
  invoices: {
    total_invoices: number;
    total_billed: number;
    total_collected: number;
    total_outstanding: number;
    total_overdue: number;
    this_month_billed: number;
    this_month_collected: number;
  };
  subscriptions: {
    active_subs: number;
    cancelled_subs: number;
    expiring_7d: number;
    expiring_30d: number;
    mrr: number;
    arr_monthly_equiv: number;
  };
}

export interface RevenueData {
  period: string;
  year: number;
  data: Array<{ label: string; billed: number; collected: number; outstanding: number }>;
  totals: {
    billed: number;
    collected: number;
    outstanding: number;
    collection_rate_pct: number;
  };
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  org_name: string | null;
  user_id: string;
  admin_id?: string; // Alias for Super Admin logs
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  details?: string; // Detailed description for some actions
  old_values: any;
  new_values: any;
  ip_address: string;
  request_id: string;
  created_at: string;
}

export interface ServiceTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description: string;
  sac_code: string;
  default_rate: number;
  default_gst_rate: number;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  admin: SuperAdmin;
}

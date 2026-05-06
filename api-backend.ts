/**
 * Client API pour le backend NestJS FinOps
 */

import type { AuditLog, Client, Invoice, UserPreferences } from './types';

/** Dispatched after invoices, expenses or clients change so the dashboard can refetch. */
export const FINOPS_DATA_CHANGED_EVENT = 'finops-data-changed';

export function notifyFinopsDataChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FINOPS_DATA_CHANGED_EVENT));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  return localStorage.getItem('finops_token');
}

function setToken(token: string) {
  localStorage.setItem('finops_token', token);
}

function clearToken() {
  localStorage.removeItem('finops_token');
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetchWithAuth(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || res.statusText || 'Erreur';
    const text =
      Array.isArray(msg)
        ? msg.join(', ')
        : typeof msg === 'string'
        ? msg
        : msg && typeof msg === 'object'
        ? JSON.stringify(msg)
        : String(msg);
    throw new Error(`${res.status}:${text}`);
  }
  return data;
}

async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg.includes('fetch') ? 'NETWORK_ERROR:Failed to fetch' : msg);
  }
}

async function fetchBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const headers = {
    ...(options.headers as Record<string, string>),
  };
  if (!headers['Accept']) {
    headers['Accept'] = 'application/pdf';
  }

  console.log('fetchBlob called with path:', path, 'headers:', headers);
  const res = await fetchWithAuth(path, {
    ...options,
    headers,
  });
  console.log('fetchBlob response status:', res.status, 'ok:', res.ok);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}:${text || res.statusText || 'Erreur'}`);
  }
  return res.blob();
}

function toQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// Types alignés avec le backend
export type CompanyCategory =
  | 'technology'
  | 'retail'
  | 'services'
  | 'manufacturing'
  | 'construction'
  | 'healthcare'
  | 'finance'
  | 'other';

export type UserRoleBackend =
  | 'platform_admin'
  | 'owner'
  | 'manager'
  | 'employee'
  | 'accountant'
  | 'client';

export interface UserBackend {
  id: string;
  email: string;
  name: string;
  role: UserRoleBackend;
  companyRole?: string;
  companyId?: string;
  activeCompanyId?: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  pendingEmail?: string;
  lastLoginAt?: string;
  locked?: boolean;
  lockReason?: 'manual' | 'failed_attempts';
  lockedUntil?: string;
  preferences?: UserPreferences;
  twoFactorEnabled?: boolean;
  twoFactorEnrolledAt?: string;
  twoFactorLastVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
    category: string;
    currency: string;
  };
}

export interface UserListItemBackend {
  id: string;
  name: string;
  email: string;
  role: UserRoleBackend;
  companyRole?: string;
  companyId?: string;
  activeCompanyId?: string;
  companyName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  locked: boolean;
  lockReason?: 'manual' | 'failed_attempts';
  lockedUntil?: string;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  membershipIsDefault: boolean;
}

export interface PaginatedResponseBackend<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserActivityBackend {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  companyId?: string;
  ipAddress?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface UserStatsBackend {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  verifiedUsers: number;
  windowDays: number;
  usersByRole: Array<{ role: UserRoleBackend; count: number }>;
}

export interface EmailVerificationRequestResponse {
  message: string;
  targetEmail: string;
  emailSent: boolean;
  previewUrl?: string;
  provider: 'gmail' | 'smtp' | 'ethereal' | 'console';
  codeForDev?: string;
  expiresAt: string;
}

export interface CompanyBackend {
  id: string;
  name: string;
  category: CompanyCategory;
  logo?: string;
  matriculeFiscal?: string;
  taxRate: number;
  currency: string;
}

export interface RegistrationRequestBackend {
  id: string;
  companyName: string;
  companyCategory: CompanyCategory;
  email: string;
  ownerName: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface EmployeeAccessRequestBackend {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  desiredRole: 'manager' | 'employee' | 'accountant';
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface TranslatePayload {
  text: string;
  source_lang: string;
  target_lang: string;
}

export interface TranslateResponse {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  model_name: string;
}

export interface BatchTranslatePayload {
  texts: string[];
  source_lang: string;
  target_lang: string;
}

export interface BatchTranslateResponse {
  translations: string[];
  source_lang: string;
  target_lang: string;
  model_name: string;
}

export interface AiExpenseAnomaly {
  title: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

export interface AiAnalyzeExpensesResponse {
  summary: string;
  anomalies: AiExpenseAnomaly[];
  alerts: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface AiForecastResponse {
  nextMonthExpense: number;
  next3MonthsTotal: number;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
  timeline: Array<{ period: string; predictedExpense: number }>;
  generatedAt: string;
}

export interface AiCashFlowCopilotPointResponse {
  period: string;
  projectedInflows: number;
  projectedOutflows: number;
  netCashFlow: number;
  endingCash: number;
}

export interface AiCashFlowCopilotResponse {
  openingCashEstimate: number;
  projectedEndingCash: number;
  netTrend: 'improving' | 'stable' | 'deteriorating';
  confidence: number;
  summary: string;
  drivers: Array<{
    label: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  actions: Array<{
    title: string;
    detail: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  timeline: AiCashFlowCopilotPointResponse[];
  generatedAt: string;
}

export interface AiSmartDocumentLineItemResponse {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AiSmartDocumentIntakeResponse {
  detectedType: 'invoice' | 'receipt';
  suggestedAction: 'create_invoice' | 'create_expense';
  confidenceScore: number;
  summary: string;
  warnings: string[];
  missingFields: string[];
  blockingFields: string[];
  normalizedTextPreview: string;
  invoiceDraft?: {
    number: string;
    clientName: string;
    clientEmail?: string;
    date: string;
    dueDate: string;
    total: number;
    status: 'Draft';
    notes?: string;
    lineItems: AiSmartDocumentLineItemResponse[];
  };
  expenseDraft?: {
    amount: number;
    expenseDate: string;
    category: string;
    vendor?: string;
    notes?: string;
  };
  generatedAt: string;
}

export interface AiExpenseForecastResponse {
  companyId: string;
  category?: string;
  predictedAmount: number;
  confidenceScore: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  explanation: string;
  generatedAt: string;
}

export interface AiExpenseAlertResponse {
  expenseId: string;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  reason: string;
  recommendation: string;
  amount: number;
  category: string;
  vendor?: string;
  expenseDate: string;
  detectedAt: string;
}

export interface AiChatResponse {
  answer: string;
  followUps: string[];
  generatedAt: string;
}

export interface AiOptimizeCostsResponse {
  summary: string;
  estimatedMonthlySavings: number;
  recommendations: Array<{
    title: string;
    description: string;
    estimatedSavings: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  generatedAt: string;
}

export interface AiMonthlyReportResponse {
  month: string;
  totalExpenses: number;
  biggestCostSources: Array<{ label: string; amount: number }>;
  costIncreaseAnalysis: string;
  optimizationSuggestions: string[];
  executiveSummary: string;
  generatedAt: string;
}

export interface ExpenseBackend {
  id: string;
  companyId: string;
  category: string;
  amount: number;
  expenseDate: string;
  vendor?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface InvoiceBackend {
  id: string;
  number: string;
  clientName: string;
  clientEmail?: string;
  clientId?: string;
  linkedClient?: {
    id: string;
    name: string;
    email?: string;
    companyName?: string;
  };
  date: string;
  dueDate: string;
  total: number | string;
  status: string;
}

export interface InvoicePaymentSuggestionBackend {
  invoiceId: string;
  recommendationType: string;
  numberOfChunks: number;
  chunkAmounts: number[];
  proposedDates: string[];
  confidenceScore: number;
  suggestedTerms?: string;
  explanation?: string;
}

export interface DashboardMonthlyBackend {
  period: string;
  revenue: number;
  expenses: number;
}

export interface DashboardSummaryBackend {
  invoicedTotal: number;
  paidTotal: number;
  outstandingTotal: number;
  expenseTotal: number;
  netPaidMinusExpenses: number;
  invoiceCount: number;
  expenseCount: number;
  clientCount: number;
  monthly: DashboardMonthlyBackend[];
}

export interface ClientRowBackend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
}

export interface ActivityLogRowBackend {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { name: string; email?: string };
}

export interface NotificationBackend {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export interface CompanyJoinRequestBackend {
  id: string;
  requesterUserId: string;
  companyId: string;
  desiredRole: 'manager' | 'employee' | 'accountant';
  profileDetails?: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  company?: CompanyBackend;
  requesterUser?: UserBackend;
}

export interface TwoFactorLoginChallengeBackend {
  userId: string;
  email: string;
  name: string;
  method: 'totp';
  expiresAt: string;
}

export interface TwoFactorSetupBackend {
  qrCodeDataUrl: string;
  manualEntryKey: string;
  otpauthUrl: string;
  issuer: string;
  accountLabel: string;
  expiresAt: string;
}

export type LoginResponseBackend =
  | {
      requiresTwoFactor: false;
      user: UserBackend;
      token: string;
      mustChangePassword: boolean;
    }
  | {
      requiresTwoFactor: true;
      twoFactor: TwoFactorLoginChallengeBackend;
    };

export const BackendAPI = {
  isConfigured: () => true,

  // Auth
  async login(email: string, password: string) {
    const data = await fetchApi<LoginResponseBackend>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!data.requiresTwoFactor) {
      setToken(data.token);
    }
    return data;
  },

  async verifyTwoFactorLogin(
    userId: string,
    code: string
  ) {
    const data = await fetchApi<{
      requiresTwoFactor: false;
      user: UserBackend;
      token: string;
      mustChangePassword: boolean;
    }>('/auth/2fa/login/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    });
    setToken(data.token);
    return data;
  },

  logout() {
    clearToken();
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return fetchApi<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  },

  async forgotPassword(email: string) {
    return fetchApi<{
      message: string;
      emailSent: boolean;
      previewUrl?: string;
      provider: 'gmail' | 'smtp' | 'ethereal' | 'console';
      tempPasswordForDev?: string;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async beginTwoFactorSetup() {
    return fetchApi<TwoFactorSetupBackend>('/auth/2fa/setup', {
      method: 'POST',
    });
  },

  async completeTwoFactorSetup(code: string) {
    return fetchApi<{ message: string; user: UserBackend }>(
      '/auth/2fa/setup/verify',
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      }
    );
  },

  async disableTwoFactor() {
    return fetchApi<{ message: string; user: UserBackend }>('/auth/2fa/disable', {
      method: 'POST',
    });
  },

  async getMe(): Promise<UserBackend | null> {
    try {
      return await fetchApi<UserBackend>('/users/me');
    } catch {
      clearToken();
      return null;
    }
  },

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    return fetchApi<UserBackend>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getMyPreferences() {
    return fetchApi<{ preferences: UserPreferences }>('/users/me/preferences');
  },

  async updateMyPreferences(data: Partial<UserPreferences>) {
    return fetchApi<{ preferences: UserPreferences; user: UserBackend }>('/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return fetchApi<UserBackend>('/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  async requestEmailVerification(newEmail?: string) {
    return fetchApi<EmailVerificationRequestResponse>('/users/me/email-verification/request', {
      method: 'POST',
      body: JSON.stringify(newEmail ? { newEmail } : {}),
    });
  },

  async confirmEmailVerification(code: string) {
    return fetchApi<{ message: string; user: UserBackend }>('/users/me/email-verification/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async getMyActivity(page = 1, limit = 20) {
    return fetchApi<PaginatedResponseBackend<UserActivityBackend>>(
      `/users/me/activity${toQueryString({ page, limit })}`
    );
  },

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRoleBackend;
    companyId?: string;
    locked?: boolean;
    emailVerified?: boolean;
    sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt' | 'role';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    return fetchApi<PaginatedResponseBackend<UserListItemBackend>>(
      `/users${toQueryString(params)}`
    );
  },

  async getUser(id: string) {
    return fetchApi<UserBackend>(`/users/${id}`);
  },

  async lockUser(id: string, durationMinutes = 60) {
    return fetchApi<{ message: string; lockedUntil: string; user: UserBackend }>(
      `/users/${id}/lock`,
      {
        method: 'PATCH',
        body: JSON.stringify({ durationMinutes }),
      }
    );
  },

  async unlockUser(id: string) {
    return fetchApi<{ message: string; user: UserBackend }>(`/users/${id}/unlock`, {
      method: 'PATCH',
    });
  },

  async getUserActivity(id: string, page = 1, limit = 20) {
    return fetchApi<PaginatedResponseBackend<UserActivityBackend>>(
      `/users/${id}/activity${toQueryString({ page, limit })}`
    );
  },

  async exportUsers(
    format: 'csv' | 'excel' = 'csv',
    params: {
      search?: string;
      role?: UserRoleBackend;
      companyId?: string;
      locked?: boolean;
      emailVerified?: boolean;
      sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt' | 'role';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    return fetchBlob(`/users/export${toQueryString({ format, ...params })}`);
  },

  async getUserStats() {
    return fetchApi<UserStatsBackend>('/users/stats');
  },

  // Registration (public)
  async submitRegistration(data: {
    companyName: string;
    companyCategory: CompanyCategory;
    email: string;
    ownerName: string;
    phone?: string;
  }) {
    return fetchApi<RegistrationRequestBackend>('/registration', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async submitEmployeeAccessRequest(data: {
    fullName: string;
    email: string;
    companyName: string;
    desiredRole: 'manager' | 'employee' | 'accountant';
  }) {
    return fetchApi<EmployeeAccessRequestBackend>('/registration/employee-access', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin
  async getRegistrationRequests() {
    return fetchApi<RegistrationRequestBackend[]>('/admin/registration-requests');
  },

  async acceptRegistrationRequest(id: string) {
    return fetchApi<{
      message: string;
      credentials: { email: string; tempPassword: string; role: string; companyName: string };
      emailSent: boolean;
      previewUrl?: string;
      mailProvider: 'gmail' | 'smtp' | 'ethereal' | 'console';
      mailConfigured: boolean;
    }>(`/admin/registration-requests/${id}/accept`, {
      method: 'POST',
    });
  },

  async rejectRegistrationRequest(id: string, rejectionReason: string) {
    return fetchApi<{
      message: string;
      emailSent: boolean;
      previewUrl?: string;
      mailProvider: 'gmail' | 'smtp' | 'ethereal' | 'console';
      mailConfigured: boolean;
      rejectedUser: { email: string; name: string; reason: string };
    }>(
      `/admin/registration-requests/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      }
    );
  },

  async deleteRegistrationRequest(id: string) {
    return fetchApi<{
      message: string;
      deletedRequestId: string;
      deletedCompany: boolean;
      deletedUsersCount: number;
    }>(`/admin/registration-requests/${id}`, {
      method: 'DELETE',
    });
  },

  async getEmployeeAccessRequests() {
    return fetchApi<EmployeeAccessRequestBackend[]>('/admin/employee-access-requests');
  },

  async acceptEmployeeAccessRequest(id: string) {
    return fetchApi<{
      message: string;
      credentials: { email: string; tempPassword: string; role: string; companyName: string };
      emailSent: boolean;
      previewUrl?: string;
      mailProvider: 'gmail' | 'smtp' | 'ethereal' | 'console';
      mailConfigured: boolean;
    }>(`/admin/employee-access-requests/${id}/accept`, {
      method: 'POST',
    });
  },

  async rejectEmployeeAccessRequest(id: string, rejectionReason: string) {
    return fetchApi<{
      message: string;
      emailSent: boolean;
      previewUrl?: string;
      mailProvider: 'gmail' | 'smtp' | 'ethereal' | 'console';
      mailConfigured: boolean;
      rejectedUser: { email: string; name: string; reason: string };
    }>(
      `/admin/employee-access-requests/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      }
    );
  },

  // Companies
  async getMyCompanies() {
    return fetchApi<CompanyBackend[]>('/companies/my-companies');
  },

  async discoverCompanies() {
    return fetchApi<CompanyBackend[]>('/companies/discover');
  },

  async createCompany(data: {
    name: string;
    category: CompanyCategory;
    address?: string;
    currency?: string;
  }) {
    return fetchApi<CompanyBackend>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCompany(id: string) {
    return fetchApi<CompanyBackend>(`/companies/${id}`);
  },

  async switchCompany(id: string) {
    return fetchApi<{ message: string; activeCompanyId: string }>(`/companies/${id}/switch`, {
      method: 'POST',
    });
  },

  async updateCompany(id: string, data: Partial<CompanyBackend>) {
    return fetchApi<CompanyBackend>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getEmployees(companyId: string) {
    return fetchApi<UserBackend[]>(`/companies/${companyId}/employees`);
  },

  async createEmployee(
    companyId: string,
    data: { email: string; name: string; role: 'manager' | 'employee' | 'accountant' }
  ) {
    return fetchApi<{
      user: UserBackend;
      tempPassword: string;
      emailSent: boolean;
      previewUrl?: string;
      role: string;
      mailProvider: 'gmail' | 'smtp' | 'ethereal' | 'console';
      mailConfigured: boolean;
    }>(`/companies/${companyId}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createCompanyJoinRequest(data: {
    companyId: string;
    desiredRole: 'manager' | 'employee' | 'accountant';
    profileDetails?: string;
  }) {
    return fetchApi<CompanyJoinRequestBackend>('/companies/join-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyCompanyJoinRequests() {
    return fetchApi<CompanyJoinRequestBackend[]>('/companies/join-requests/mine');
  },

  async getCompanyJoinRequests(companyId: string) {
    return fetchApi<CompanyJoinRequestBackend[]>(`/companies/${companyId}/join-requests`);
  },

  async acceptCompanyJoinRequest(companyId: string, requestId: string) {
    return fetchApi<{ message: string }>(`/companies/${companyId}/join-requests/${requestId}/accept`, {
      method: 'POST',
    });
  },

  async rejectCompanyJoinRequest(
    companyId: string,
    requestId: string,
    rejectionReason: string,
  ) {
    return fetchApi<{ message: string }>(`/companies/${companyId}/join-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  async getNotifications() {
    return fetchApi<NotificationBackend[]>('/notifications');
  },

  async getUnreadNotificationsCount() {
    return fetchApi<number>('/notifications/unread-count');
  },

  async markNotificationAsRead(id: string) {
    return fetchApi<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsAsRead() {
    return fetchApi<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
  },

  async getExpenses() {
    return fetchApi<ExpenseBackend[]>('/expenses');
  },

  async createExpense(data: {
    amount: number;
    expenseDate: string;
    category?: string;
    vendor?: string;
    notes?: string;
  }) {
    return fetchApi<ExpenseBackend>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getExpense(id: string) {
    return fetchApi<ExpenseBackend>(`/expenses/${id}`);
  },

  async updateExpense(
    id: string,
    data: {
      amount?: number;
      expenseDate?: string;
      category?: string;
      vendor?: string;
      notes?: string;
    },
  ) {
    return fetchApi<ExpenseBackend>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteExpense(id: string) {
    return fetchApi<{ deleted: true }>(`/expenses/${id}`, { method: 'DELETE' });
  },

  async translate(payload: TranslatePayload) {
    return fetchApi<TranslateResponse>('/ai/translate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async translateBatch(payload: BatchTranslatePayload) {
    const { texts, source_lang, target_lang } = payload;
    const CHUNK = 280;
    if (texts.length <= CHUNK) {
      return fetchApi<BatchTranslateResponse>('/ai/translate/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    const translations: string[] = [];
    let model_name = 'nllb';
    for (let i = 0; i < texts.length; i += CHUNK) {
      const slice = texts.slice(i, i + CHUNK);
      const part = await fetchApi<BatchTranslateResponse>('/ai/translate/batch', {
        method: 'POST',
        body: JSON.stringify({ texts: slice, source_lang, target_lang }),
      });
      const tr = Array.isArray(part.translations) ? part.translations : [];
      for (let j = 0; j < slice.length; j += 1) {
        translations.push(tr[j] != null && String(tr[j]).trim() !== '' ? String(tr[j]) : slice[j]);
      }
      if (part.model_name) model_name = part.model_name;
    }
    return { translations, source_lang, target_lang, model_name };
  },

  async getTranslationLanguages() {
    const res = await fetch(`${API_URL}/ai/languages`, { method: 'GET' });
    const data = await res.json().catch(() => ({ languages: [] }));
    if (!res.ok) {
      throw new Error(`${res.status}:${res.statusText || 'Erreur'}`);
    }
    return data as { languages: string[] };
  },

  async analyzeExpenses(payload: { lookbackMonths?: number } = {}) {
    return fetchApi<AiAnalyzeExpensesResponse>('/ai/analyze-expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async forecast(payload: { historyMonths?: number } = {}) {
    return fetchApi<AiForecastResponse>('/ai/forecast', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cashFlowCopilot(payload: { historyMonths?: number; horizonMonths?: number } = {}) {
    return fetchApi<AiCashFlowCopilotResponse>('/ai/cash-flow-copilot', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async smartDocumentIntake(payload: {
    sourceText: string;
    documentType?: 'auto' | 'invoice' | 'receipt';
  }) {
    return fetchApi<AiSmartDocumentIntakeResponse>('/ai/smart-intake', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getExpenseForecast(payload: { companyId: string; category?: string; periodMonths?: number } = { companyId: '' }) {
    const params = new URLSearchParams();
    params.append('companyId', payload.companyId);
    if (payload.category) params.append('category', payload.category);
    if (payload.periodMonths) params.append('periodMonths', payload.periodMonths.toString());

    return fetchApi<AiExpenseForecastResponse>(`/ai/forecasting?${params.toString()}`);
  },

  async getExpenseAlerts(payload: { companyId: string; category?: string } = { companyId: '' }) {
    const params = new URLSearchParams();
    params.append('companyId', payload.companyId);
    if (payload.category) params.append('category', payload.category);

    return fetchApi<AiExpenseAlertResponse[]>(`/ai/alerts?${params.toString()}`);
  },

  async chat(payload: { message: string }) {
    return fetchApi<AiChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async optimizeCosts() {
    return fetchApi<AiOptimizeCostsResponse>('/ai/optimize-costs', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async monthlyReport(payload: { month?: string } = {}) {
    return fetchApi<AiMonthlyReportResponse>('/ai/report/monthly', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getDashboardSummary() {
    return fetchApi<DashboardSummaryBackend>('/dashboard/summary');
  },

  async getInvoices() {
    return fetchApi<InvoiceBackend[]>('/invoices');
  },

  async createInvoice(data: {
    number: string;
    clientName?: string;
    clientId?: string;
    clientEmail?: string;
    date: string;
    dueDate: string;
    total: number;
    status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
    lineItems?: Array<{
      productKey: string;
      notes?: string;
      quantity: number;
      cost: number;
    }>;
  }) {
    return fetchApi<InvoiceBackend>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInvoice(id: string) {
    return fetchApi<InvoiceBackend>(`/invoices/${id}`);
  },

  async downloadInvoicePdf(id: string) {
    return fetchBlob(`/invoices/${id}/export-pdf`, {
      method: 'GET',
    });
  },

  async getInvoicePaymentSuggestion(id: string) {
    return fetchApi<InvoicePaymentSuggestionBackend>(`/invoices/${id}/payment-suggestion`);
  },

  async updateInvoice(
    id: string,
    data: {
      number?: string;
      clientName?: string;
      clientId?: string | null;
      clientEmail?: string;
      date?: string;
      dueDate?: string;
      total?: number;
      status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
    },
  ) {
    return fetchApi<InvoiceBackend>(`/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteInvoice(id: string) {
    return fetchApi<{ deleted: true }>(`/invoices/${id}`, { method: 'DELETE' });
  },

  async payInvoice(id: string) {
    return fetchApi<InvoiceBackend>(`/invoices/${id}/pay`, {
      method: 'PATCH',
    });
  },

  async getClients() {
    return fetchApi<ClientRowBackend[]>('/clients');
  },

  async createClient(data: {
    name: string;
    email?: string;
    phone?: string;
    companyName?: string;
  }) {
    return fetchApi<ClientRowBackend>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getClient(id: string) {
    return fetchApi<ClientRowBackend>(`/clients/${id}`);
  },

  async updateClient(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      companyName?: string;
    },
  ) {
    return fetchApi<ClientRowBackend>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string) {
    return fetchApi<{ deleted: true }>(`/clients/${id}`, { method: 'DELETE' });
  },

  async getActivityLogs() {
    return fetchApi<ActivityLogRowBackend[]>('/activity-logs');
  },
};

export function invoiceFromBackend(row: InvoiceBackend): Invoice {
  const d = typeof row.date === 'string' ? row.date : String(row.date);
  const due = typeof row.dueDate === 'string' ? row.dueDate : String(row.dueDate);
  return {
    id: row.id,
    number: row.number,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientId: row.clientId ?? row.linkedClient?.id,
    date: d.slice(0, 10),
    dueDate: due.slice(0, 10),
    total: Number(row.total),
    status: row.status as Invoice['status'],
  };
}

export function clientFromBackend(row: ClientRowBackend): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    company: row.companyName || '',
  };
}

function parseActivityAction(action: string) {
  const trimmed = (action || '').trim();
  const splitIndex = trimmed.indexOf(' ');
  if (splitIndex === -1) {
    return { method: '', path: trimmed };
  }
  return {
    method: trimmed.slice(0, splitIndex).toUpperCase(),
    path: trimmed.slice(splitIndex + 1).trim(),
  };
}

function isOpaqueActivityId(value: string | undefined) {
  if (!value) return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    /^\d+$/.test(value) ||
    /^[A-Za-z0-9_-]{16,}$/.test(value)
  );
}

function formatActivityTargetLabel(value: string | undefined) {
  if (!value) return 'activity';
  if (isOpaqueActivityId(value)) return 'record';
  return value.replace(/[-_]/g, ' ').trim().toLowerCase();
}

function defaultActivitySentence(method: string, target: string) {
  switch (method) {
    case 'GET':
      return `Viewed ${target}.`;
    case 'POST':
      return `Created ${target}.`;
    case 'PUT':
    case 'PATCH':
      return `Updated ${target}.`;
    case 'DELETE':
      return `Deleted ${target}.`;
    default:
      return `Updated ${target}.`;
  }
}

export function formatActivityContext(entityType: string, entityId: string) {
  switch (entityType) {
    case 'users':
      if (entityId === 'activity') return 'Activity history';
      return 'User account';
    case 'companies':
      if (entityId === 'discover') return 'Company discovery';
      if (entityId === 'my-companies') return 'Company memberships';
      if (entityId === 'join-requests') return 'Join requests';
      return 'Company';
    case 'notifications':
      if (entityId === 'unread-count') return 'Unread notifications';
      return 'Notifications';
    case 'clients':
      return 'Clients';
    case 'expenses':
      return 'Expenses';
    case 'invoices':
      return 'Invoices';
    case 'transactions':
      return 'Transactions';
    case 'activity-logs':
      return 'Activity logs';
    case 'auth':
      return 'Account security';
    case 'subscriptions':
      return 'Subscription';
    case 'tenants':
      return 'Workspace';
    case 'ai':
      return 'AI tools';
    case 'admin':
      if (entityId === 'registration-requests') return 'Registration requests';
      if (entityId === 'employee-access-requests') return 'Access requests';
      return 'Administration';
    default:
      return formatActivityTargetLabel(entityType).replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function formatActivitySentence(
  action: string,
  entityType: string,
  entityId: string
) {
  const { method, path } = parseActivityAction(action);
  const segments = path.split('/').filter(Boolean);
  const [resource, first, second, third, fourth] = segments;

  switch (resource) {
    case 'users':
      if (first === 'me') {
        if (!second) return method === 'PATCH' ? 'Updated profile details.' : 'Viewed profile details.';
        if (second === 'preferences') {
          return method === 'PATCH' ? 'Updated personal preferences.' : 'Viewed personal preferences.';
        }
        if (second === 'avatar') return 'Updated the profile picture.';
        if (second === 'activity') return 'Viewed personal activity history.';
        if (second === 'email-verification' && third === 'request') {
          return 'Requested email verification.';
        }
        if (second === 'email-verification' && third === 'confirm') {
          return 'Confirmed email verification.';
        }
      }
      if (second === 'activity') return 'Viewed this user\'s activity history.';
      if (second === 'lock') return 'Locked this user account.';
      if (second === 'unlock') return 'Unlocked this user account.';
      if (!first) return 'Viewed the user directory.';
      return defaultActivitySentence(method, 'user details');

    case 'companies':
      if (!first && method === 'POST') return 'Created a company.';
      if (first === 'discover') return 'Browsed available companies.';
      if (first === 'my-companies') return 'Viewed company memberships.';
      if (first === 'join-requests' && second === 'mine') return 'Viewed personal join requests.';
      if (first === 'join-requests' && !second && method === 'POST') {
        return 'Submitted a company join request.';
      }
      if (second === 'switch') return 'Switched the active company.';
      if (second === 'employees') {
        return method === 'POST' ? 'Added a company employee.' : 'Viewed company employees.';
      }
      if (second === 'join-requests' && !third) return 'Viewed company join requests.';
      if (fourth === 'accept') return 'Accepted a company join request.';
      if (fourth === 'reject') return 'Rejected a company join request.';
      if (isOpaqueActivityId(first)) {
        if (method === 'GET') return 'Viewed company details.';
        if (method === 'PUT' || method === 'PATCH') return 'Updated company details.';
      }
      return defaultActivitySentence(method, 'company details');

    case 'notifications':
      if (first === 'unread-count') return 'Checked unread notifications.';
      if (first === 'read-all') return 'Marked all notifications as read.';
      if (second === 'read') return 'Marked a notification as read.';
      return method === 'GET' ? 'Viewed notifications.' : defaultActivitySentence(method, 'notifications');

    case 'clients':
      if (method === 'POST') return 'Added a client.';
      return method === 'GET' ? 'Viewed clients.' : defaultActivitySentence(method, 'client records');

    case 'expenses':
      if (method === 'POST') return 'Created an expense.';
      return method === 'GET' ? 'Viewed expenses.' : defaultActivitySentence(method, 'expense records');

    case 'invoices':
      if (second === 'pay') return 'Marked an invoice as paid.';
      if (method === 'POST') return 'Created an invoice.';
      return method === 'GET' ? 'Viewed invoices.' : defaultActivitySentence(method, 'invoice records');

    case 'transactions':
      if (method === 'POST') return 'Created a transaction.';
      return method === 'GET' ? 'Viewed transactions.' : defaultActivitySentence(method, 'transaction records');

    case 'auth':
      if (first === 'change-password') return 'Changed account password.';
      if (first === 'forgot-password') return 'Requested a password reset.';
      if (first === '2fa' && second === 'setup' && !third) {
        return 'Started authenticator app 2FA setup.';
      }
      if (first === '2fa' && second === 'setup' && third === 'verify') {
        return 'Enabled authenticator app 2FA.';
      }
      if (first === '2fa' && second === 'disable') {
        return 'Disabled authenticator app 2FA.';
      }
      if (first === '2fa' && second === 'login' && third === 'verify') {
        return 'Completed authenticator app 2FA sign-in.';
      }
      if (first === '2fa' && second === 'register' && third === 'options') {
        return 'Started two-factor authentication setup.';
      }
      if (first === '2fa' && second === 'register' && third === 'verify') {
        return 'Enabled two-factor authentication.';
      }
      return 'Updated account security settings.';

    case 'activity-logs':
      return 'Viewed activity logs.';

    case 'tenants':
      if (first === 'switch') return 'Switched the active workspace.';
      return defaultActivitySentence(method, 'workspace settings');

    case 'subscriptions':
      return 'Viewed subscription details.';

    case 'ai':
      if (first === 'insights') return 'Viewed AI insights.';
      if (first === 'translate') {
        return second === 'batch' ? 'Translated content in batch.' : 'Translated content.';
      }
      if (first === 'languages') return 'Loaded available languages.';
      if (first === 'analyze-expenses') return 'Analyzed expenses with AI.';
      if (first === 'forecast') return 'Generated a financial forecast.';
      if (first === 'cash-flow-copilot') return 'Generated a cash-flow copilot forecast.';
      if (first === 'smart-intake') return 'Used AI smart invoice and receipt intake.';
      if (first === 'chat') return 'Used the AI assistant.';
      if (first === 'optimize-costs') return 'Generated cost optimization suggestions.';
      if (first === 'report' && second === 'monthly') return 'Generated a monthly AI report.';
      return 'Used an AI feature.';

    case 'admin':
      if (first === 'registration-requests' && !second) return 'Viewed registration requests.';
      if (first === 'registration-requests' && second === 'pending') {
        return 'Viewed pending registration requests.';
      }
      if (first === 'registration-requests' && third === 'accept') {
        return 'Accepted a registration request.';
      }
      if (first === 'registration-requests' && third === 'reject') {
        return 'Rejected a registration request.';
      }
      if (first === 'registration-requests' && method === 'DELETE') {
        return 'Deleted a registration request.';
      }
      if (first === 'employee-access-requests' && !second) {
        return 'Viewed employee access requests.';
      }
      if (first === 'employee-access-requests' && third === 'accept') {
        return 'Accepted an employee access request.';
      }
      if (first === 'employee-access-requests' && third === 'reject') {
        return 'Rejected an employee access request.';
      }
      return 'Viewed administration activity.';

    default:
      return defaultActivitySentence(method, formatActivityTargetLabel(entityId || entityType));
  }
}

export function auditFromBackend(row: ActivityLogRowBackend): AuditLog {
  return {
    id: String(row.id),
    action: formatActivitySentence(row.action, row.entityType, row.entityId),
    user: row.actor?.name || row.actor?.email || 'Système',
    timestamp: row.createdAt,
    entity: formatActivityContext(row.entityType, row.entityId),
  };
}

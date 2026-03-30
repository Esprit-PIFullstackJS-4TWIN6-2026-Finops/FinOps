/**
 * Client API pour le backend NestJS FinOps
 */

import type { AuditLog, Client, Invoice, UserPreferences } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    return await fetch(`${API_BASE}${path}`, {
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
  const res = await fetchWithAuth(path, options);
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
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
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
  lockedUntil?: string;
  preferences?: UserPreferences;
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
  date: string;
  dueDate: string;
  total: number | string;
  status: string;
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

export const BackendAPI = {
  isConfigured: () => true,

  // Auth
  async login(email: string, password: string) {
    const data = await fetchApi<{
      user: UserBackend;
      token: string;
      mustChangePassword: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    }>(`/admin/registration-requests/${id}/accept`, {
      method: 'POST',
    });
  },

  async rejectRegistrationRequest(id: string, rejectionReason: string) {
    return fetchApi<{
      message: string;
      emailSent: boolean;
      previewUrl?: string;
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
    }>(`/admin/employee-access-requests/${id}/accept`, {
      method: 'POST',
    });
  },

  async rejectEmployeeAccessRequest(id: string, rejectionReason: string) {
    return fetchApi<{
      message: string;
      emailSent: boolean;
      previewUrl?: string;
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

  async translate(payload: TranslatePayload) {
    return fetchApi<TranslateResponse>('/ai/translate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async translateBatch(payload: BatchTranslatePayload) {
    return fetchApi<BatchTranslateResponse>('/ai/translate/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getTranslationLanguages() {
    return fetchApi<{ languages: string[] }>('/ai/languages');
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

  async getInvoices() {
    return fetchApi<InvoiceBackend[]>('/invoices');
  },

  async createInvoice(data: {
    number: string;
    clientName: string;
    clientEmail?: string;
    date: string;
    dueDate: string;
    total: number;
    status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  }) {
    return fetchApi<InvoiceBackend>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

export function auditFromBackend(row: ActivityLogRowBackend): AuditLog {
  return {
    id: String(row.id),
    action: row.action,
    user: row.actor?.name || row.actor?.email || 'Système',
    timestamp: row.createdAt,
    entity: row.entityType,
  };
}

/**
 * Client API pour le backend NestJS FinOps
 */

import type { AuditLog, Client, Invoice } from './types';

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
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg.includes('fetch') ? 'NETWORK_ERROR:Failed to fetch' : msg);
  }

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
  companyId?: string;
  avatarUrl?: string;
  mustChangePassword?: boolean;
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


export enum UserRole {
  PLATFORM_ADMIN = 'Platform Administrator',
  BUSINESS_OWNER = 'Business Owner',
  BUSINESS_ADMIN = 'Business Administrator',
  ACCOUNTANT = 'Accountant',
  TEAM_MEMBER = 'Team Member',
  CLIENT = 'Client'
}

export function mapBackendRoleToFrontend(role: string): UserRole {
  const m: Record<string, UserRole> = {
    platform_admin: UserRole.PLATFORM_ADMIN,
    owner: UserRole.BUSINESS_OWNER,
    manager: UserRole.BUSINESS_ADMIN,
    employee: UserRole.TEAM_MEMBER,
    accountant: UserRole.ACCOUNTANT,
    client: UserRole.CLIENT,
  };
  return m[role] ?? UserRole.TEAM_MEMBER;
}

export interface UserNotificationPreferences {
  email?: boolean;
  inApp?: boolean;
  marketing?: boolean;
  security?: boolean;
}

export interface UserPreferences {
  language?: string;
  theme?: 'light' | 'dark';
  timezone?: string;
  dateFormat?: string;
  notifications?: UserNotificationPreferences;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyRole?: string;
  avatarUrl?: string;
  companyId?: string;
  activeCompanyId?: string;
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

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  currency: string;
  taxRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  date: string;
  dueDate: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reportedBy: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  entity: string;
}

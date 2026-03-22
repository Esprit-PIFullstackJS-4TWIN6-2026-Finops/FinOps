
import { Invoice, Expense, Client, Tenant, User, UserRole, AuditLog } from './types';

const STORAGE_KEYS = {
  INVOICES: 'finops_invoices',
  EXPENSES: 'finops_expenses',
  CLIENTS: 'finops_clients',
  TENANT: 'finops_tenant',
  AUTH: 'finops_auth_session',
  AUDIT: 'finops_audit_logs'
};

const INITIAL_TENANT: Tenant = {
  id: 't1',
  name: 'DevSphere Global',
  currency: 'USD',
  taxRate: 15,
  logo: 'https://picsum.photos/seed/corp/200'
};

const INITIAL_ADMIN_USER: User = {
  id: 'u1',
  email: 'admin@devsphere.com',
  name: 'Alex Johnson',
  role: UserRole.BUSINESS_OWNER,
  avatarUrl: 'https://picsum.photos/seed/alex/100'
};

const INITIAL_CLIENT_USER: User = {
  id: 'u2',
  email: 'jane@acme.com',
  name: 'Jane Doe',
  role: UserRole.CLIENT,
  avatarUrl: 'https://picsum.photos/seed/jane/100'
};

const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Jane Doe', email: 'jane@acme.com', phone: '+1-555-0199', company: 'Acme Corp' },
  { id: 'c2', name: 'John Smith', email: 'john@globex.com', phone: '+1-555-0120', company: 'Globex Inc' },
  { id: 'c3', name: 'Sarah Connor', email: 'sarah@cyberdyne.com', phone: '+1-555-0900', company: 'Cyberdyne Systems' }
];

const INITIAL_INVOICES: Invoice[] = [
  { id: '1', number: 'INV-1001', clientName: 'Jane Doe', date: '2024-03-01', dueDate: '2024-03-15', total: 1250, status: 'Paid' },
  { id: '2', number: 'INV-1002', clientName: 'Jane Doe', date: '2024-03-05', dueDate: '2024-03-20', total: 3400, status: 'Sent' },
  { id: '3', number: 'INV-1003', clientName: 'John Smith', date: '2024-03-10', dueDate: '2024-03-25', total: 890, status: 'Overdue' }
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Google Cloud Platform', category: 'Software', amount: 450, date: '2024-03-01', status: 'Approved', reportedBy: 'Alex' },
  { id: 'e2', description: 'Co-working Office Rent', category: 'Rent', amount: 1200, date: '2024-03-02', status: 'Approved', reportedBy: 'Alex' },
  { id: 'e3', description: 'MacBook Pro Repair', category: 'Hardware', amount: 350, date: '2024-03-05', status: 'Pending', reportedBy: 'Sarah' }
];

const INITIAL_AUDITS: AuditLog[] = [
  { id: 'a1', action: 'User Auth: Login', user: 'Alex Johnson', timestamp: new Date().toISOString(), entity: 'Security' },
  { id: 'a2', action: 'Invoice Generated', user: 'Alex Johnson', timestamp: new Date(Date.now() - 3600000).toISOString(), entity: 'Billing' },
  { id: 'a3', action: 'Tenant Settings Updated', user: 'Alex Johnson', timestamp: new Date(Date.now() - 7200000).toISOString(), entity: 'Core' }
];

const delay = (ms: number = 600) => new Promise(resolve => setTimeout(resolve, ms));

const db = {
  get: <T>(key: string, defaultValue: T): T => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const BackendAPI = {
  async login(email: string, pass: string): Promise<User | null> {
    await delay(1000);
    if (email === 'admin@devsphere.com' && pass === 'password') {
      db.set(STORAGE_KEYS.AUTH, { token: 'session-admin-' + Date.now(), user: INITIAL_ADMIN_USER });
      this.logAudit('User Auth: Login', INITIAL_ADMIN_USER.name, 'Security');
      return INITIAL_ADMIN_USER;
    }
    if (email === 'jane@acme.com' && pass === 'password') {
      db.set(STORAGE_KEYS.AUTH, { token: 'session-client-' + Date.now(), user: INITIAL_CLIENT_USER });
      return INITIAL_CLIENT_USER;
    }
    return null;
  },

  async register(name: string, email: string, role: UserRole): Promise<User> {
    await delay(1500);
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      role,
      avatarUrl: `https://picsum.photos/seed/${name}/100`
    };
    db.set(STORAGE_KEYS.AUTH, { token: 'session-new-' + Date.now(), user: newUser });
    this.logAudit('New User Registration', name, 'Onboarding');
    return newUser;
  },

  async getSession(): Promise<User | null> {
    const session = db.get<{user: User} | null>(STORAGE_KEYS.AUTH, null);
    return session ? session.user : null;
  },

  async logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    await delay(200);
  },

  async getInvoices(user?: User): Promise<Invoice[]> {
    await delay();
    const all = db.get(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    if (user?.role === UserRole.CLIENT) {
      return all.filter(inv => inv.clientName === user.name);
    }
    return all;
  },

  async createInvoice(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    await delay();
    const invoices = db.get(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    const newInvoice = { ...invoice, id: Math.random().toString(36).substr(2, 9) };
    db.set(STORAGE_KEYS.INVOICES, [newInvoice, ...invoices]);
    this.logAudit(`Invoice ${newInvoice.number} Created`, 'System', 'Billing');
    return newInvoice;
  },

  async payInvoice(id: string): Promise<void> {
    await delay(1500);
    const invoices = await this.getInvoices();
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status: 'Paid' as const } : inv);
    db.set(STORAGE_KEYS.INVOICES, updated);
    this.logAudit(`Payment Received for ${id}`, 'Client Portal', 'Billing');
  },

  async getExpenses(): Promise<Expense[]> {
    await delay();
    return db.get(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  },

  async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    await delay();
    const expenses = db.get(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const newExpense = { ...expense, id: Math.random().toString(36).substr(2, 9) };
    db.set(STORAGE_KEYS.EXPENSES, [newExpense, ...expenses]);
    this.logAudit(`Expense ${newExpense.description} Added`, 'System', 'Finance');
    return newExpense;
  },

  async getClients(): Promise<Client[]> {
    await delay();
    return db.get(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  },

  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    await delay();
    const clients = db.get(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) };
    db.set(STORAGE_KEYS.CLIENTS, [newClient, ...clients]);
    this.logAudit(`Client ${newClient.name} Added`, 'System', 'CRM');
    return newClient;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    await delay();
    return db.get(STORAGE_KEYS.AUDIT, INITIAL_AUDITS);
  },

  logAudit(action: string, user: string, entity: string) {
    const logs = db.get<AuditLog[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDITS);
    const newLog = { id: Date.now().toString(), action, user, timestamp: new Date().toISOString(), entity };
    db.set(STORAGE_KEYS.AUDIT, [newLog, ...logs]);
  },

  async getTenant(): Promise<Tenant> {
    await delay();
    return db.get(STORAGE_KEYS.TENANT, INITIAL_TENANT);
  },

  async updateTenant(data: Partial<Tenant>): Promise<Tenant> {
    await delay();
    const current = await this.getTenant();
    const updated = { ...current, ...data };
    db.set(STORAGE_KEYS.TENANT, updated);
    this.logAudit('Workspace Settings Updated', 'Administrator', 'Settings');
    return updated;
  }
};

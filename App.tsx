
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Receipt, Users, BarChart3, Settings, 
  LogOut, Bell, Moon, Sun, Menu, X, Plus, Search, ChevronRight, 
  History, ShieldCheck, Loader2, Filter, Download, UserPlus, 
  CreditCard, ExternalLink, MessageSquare, PackageCheck, Briefcase,
  TrendingUp, Wallet, CheckCircle2, AlertCircle, Clock, Zap, Globe,
  Sparkles, ArrowRight, BrainCircuit, Building2, Eye, EyeOff, 
  RefreshCw, ChevronDown, Mail, Hash, CircleDot, Info,
  Crown, UserCheck, Copy, KeyRound, Trash2
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, LineChart, Line
} from 'recharts';
import { UserRole, User, Tenant, Invoice, Expense, Client, AuditLog, mapBackendRoleToFrontend } from './types';
import { BackendAPI } from './api';
import {
  BackendAPI as RealAPI,
  checkBackendHealth,
  type AiAnalyzeExpensesResponse,
  type AiForecastResponse,
  type AiMonthlyReportResponse,
  type AiOptimizeCostsResponse,
  type CompanyBackend,
  type CompanyJoinRequestBackend,
  type ExpenseBackend,
  type NotificationBackend,
} from './api-backend';
import { getErrorMessage } from './utils/api-errors';
import {
  LANGUAGES,
  UiLang,
  getBaseTranslations,
  getLangDir,
  getRuntimeTranslations,
  isStaticLang,
  setRuntimeTranslations,
  t,
} from './i18n';

/* ================================================================
   DESIGN SYSTEM – shared atoms
   ================================================================ */

const ErrorAlert: React.FC<{ message: string; solution?: string; onDismiss?: () => void }> = ({ message, solution, onDismiss }) => (
  <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 animate-in fade-in duration-300">
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg shrink-0 mt-0.5"><AlertCircle className="w-4 h-4 text-rose-500" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-rose-800 dark:text-rose-200">{message}</p>
        {solution && <p className="text-xs text-rose-600 dark:text-rose-300/80 mt-1.5 leading-relaxed">{solution}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-rose-400 transition-colors shrink-0"><X size={16} /></button>
      )}
    </div>
  </div>
);

const SuccessAlert: React.FC<{ message: string; description?: string }> = ({ message, description }) => (
  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 animate-in fade-in duration-300">
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
      <div>
        <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">{message}</p>
        {description && <p className="text-xs text-emerald-600 dark:text-emerald-300/80 mt-1">{description}</p>}
      </div>
    </div>
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = ({ children, variant = 'default' }) => {
  const colors = {
    default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${colors[variant]}`}>{children}</span>;
};

const InputField: React.FC<{
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; icon?: React.ReactNode; disabled?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, required, icon, disabled }) => {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          type={isPassword && showPwd ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-11' : 'pr-4'} py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-medium text-gray-900 dark:text-white placeholder-gray-400 transition-all disabled:opacity-50`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

const SelectField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}> = ({ label, value, onChange, options, required }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-medium text-gray-900 dark:text-white appearance-none pr-10 transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit'; className?: string; variant?: 'primary' | 'danger' | 'success' | 'outline' }> = 
  ({ children, onClick, loading, disabled, type = 'button', className = '', variant = 'primary' }) => {
  const base = 'inline-flex items-center justify-center gap-2.5 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20',
    outline: 'border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-400 dark:text-gray-500 mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean }> = ({ children, className = '', hover }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer' : ''} ${className}`}>
    {children}
  </div>
);

const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

/* ================================================================
   DATA
   ================================================================ */

const REVENUE_DATA = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 5000, expenses: 2800 },
  { name: 'Apr', revenue: 2780, expenses: 3908 },
  { name: 'May', revenue: 4890, expenses: 2800 },
  { name: 'Jun', revenue: 6390, expenses: 3800 },
];

const COMPANY_CATEGORIES = [
  { value: 'technology', label: 'Technologie' },
  { value: 'retail', label: 'Commerce' },
  { value: 'services', label: 'Services' },
  { value: 'manufacturing', label: 'Industrie' },
  { value: 'construction', label: 'BTP' },
  { value: 'healthcare', label: 'Santé' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Autre' },
];

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employé' },
  { value: 'accountant', label: 'Comptable' },
];

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const content = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ADVANCED_NLLB_LANGUAGES: Array<{
  code: string;
  label: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}> = [
  { code: 'spa_Latn', label: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'deu_Latn', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ita_Latn', label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'por_Latn', label: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'tur_Latn', label: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'rus_Cyrl', label: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'zho_Hans', label: '中文(简体)', flag: '🇨🇳', dir: 'ltr' },
  { code: 'hin_Deva', label: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
];

type LanguageOption = {
  code: UiLang;
  label: string;
  flag: string;
  dir: 'ltr' | 'rtl';
};

const NLLB_LANGUAGE_META: Record<string, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  eng_Latn: { label: 'English', flag: '🇬🇧', dir: 'ltr' },
  fra_Latn: { label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  arb_Arab: { label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  spa_Latn: { label: 'Español', flag: '🇪🇸', dir: 'ltr' },
  deu_Latn: { label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  ita_Latn: { label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  por_Latn: { label: 'Português', flag: '🇵🇹', dir: 'ltr' },
  tur_Latn: { label: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  rus_Cyrl: { label: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  zho_Hans: { label: '中文(简体)', flag: '🇨🇳', dir: 'ltr' },
  hin_Deva: { label: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
};

const NLLB_ROOT_TO_FLAG: Record<string, string> = {
  eng: '🇬🇧',
  fra: '🇫🇷',
  arb: '🇸🇦',
  spa: '🇪🇸',
  deu: '🇩🇪',
  ita: '🇮🇹',
  por: '🇵🇹',
  tur: '🇹🇷',
  rus: '🇷🇺',
  zho: '🇨🇳',
  hin: '🇮🇳',
  jpn: '🇯🇵',
  kor: '🇰🇷',
  nld: '🇳🇱',
  pol: '🇵🇱',
  ukr: '🇺🇦',
  ron: '🇷🇴',
  ces: '🇨🇿',
  swe: '🇸🇪',
  dan: '🇩🇰',
  fin: '🇫🇮',
  ell: '🇬🇷',
  heb: '🇮🇱',
  tha: '🇹🇭',
  ind: '🇮🇩',
  msa: '🇲🇾',
  vie: '🇻🇳',
};

const DYNAMIC_TO_STATIC_LANG: Record<string, UiLang> = {
  eng_Latn: 'en',
  fra_Latn: 'fr',
  arb_Arab: 'ar',
};

function buildDynamicLanguageOption(code: string): LanguageOption {
  const known = NLLB_LANGUAGE_META[code];
  if (known) return { code, ...known };

  const [langPart = code, scriptPart = ''] = code.split('_');
  const dir = scriptPart === 'Arab' || scriptPart === 'Hebr' ? 'rtl' : 'ltr';
  return {
    code,
    label: code,
    flag: NLLB_ROOT_TO_FLAG[langPart] ?? '🏳️',
    dir,
  };
}

/* ================================================================
   APP ROOT
   ================================================================ */

/* ================================================================
   LANGUAGE SWITCHER COMPONENT
   ================================================================ */

const LanguageSwitcher: React.FC<{
  lang: UiLang;
  setLang: (l: UiLang) => void;
  options?: LanguageOption[];
  compact?: boolean;
  isLoading?: boolean;
  unavailableMessage?: string | null;
}> = ({ lang, setLang, options, compact, isLoading = false, unavailableMessage }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const fallbackOptions = useMemo<LanguageOption[]>(
    () => [
      ...LANGUAGES.map((l) => ({ ...l, code: l.code as UiLang })),
      ...ADVANCED_NLLB_LANGUAGES.map((l) => ({ ...l, code: l.code as UiLang })),
    ],
    [],
  );
  const availableOptions = options ?? fallbackOptions;
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableOptions;
    return availableOptions.filter((option) => {
      const label = option.label.toLowerCase();
      const code = String(option.code).toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [availableOptions, query]);
  const current = availableOptions.find(l => l.code === lang) ?? {
    code: 'en',
    label: String(lang),
    flag: '🏳️',
    dir: 'ltr' as const,
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 ${compact ? 'p-2' : 'px-3 py-2'} hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors text-sm font-medium`}
        title="Changer de langue / Change language"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
        {!compact && <span>{current.flag} {current.label}</span>}
        {compact && <span>{current.flag}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-auto max-h-80 min-w-[230px]">
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une langue..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
            {filteredOptions.map(l => (
              <button
                key={String(l.code)}
                onClick={() => { setLang(l.code); setOpen(false); setQuery(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  l.code === lang
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                <span>{l.label}</span>
                {l.code === lang && <CheckCircle2 size={14} className="ml-auto text-primary-500" />}
              </button>
            ))}
            {!filteredOptions.length && (
              <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Aucune langue trouvée.</p>
            )}
            {unavailableMessage && (
              <p className="px-4 py-2.5 text-[11px] border-t border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                {unavailableMessage}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [lang, setLang] = useState<UiLang>(() => localStorage.getItem('finops_lang') || 'fr');
  const [availableDynamicLangs, setAvailableDynamicLangs] = useState<string[]>(() =>
    ADVANCED_NLLB_LANGUAGES.map((l) => l.code),
  );
  const [isTranslatingUi, setIsTranslatingUi] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'register-business'>('login');
  const [showRegisterBusiness, setShowRegisterBusiness] = useState(false);
  const [useRealBackend, setUseRealBackend] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [translationServiceAvailable, setTranslationServiceAvailable] = useState(true);
  const [userCompanies, setUserCompanies] = useState<CompanyBackend[]>([]);
  const [companySwitching, setCompanySwitching] = useState(false);
  const [companyActionError, setCompanyActionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationBackend[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const languageOptions = useMemo<LanguageOption[]>(() => {
    const staticOptions: LanguageOption[] = LANGUAGES.map((l) => ({ ...l, code: l.code as UiLang }));
    const staticCodes = new Set(staticOptions.map((l) => String(l.code)));
    const dynamicOptions = availableDynamicLangs
      .filter((code) => !staticCodes.has(code) && !DYNAMIC_TO_STATIC_LANG[code])
      .map((code) => buildDynamicLanguageOption(code));
    return [...staticOptions, ...dynamicOptions];
  }, [availableDynamicLangs]);
  const translationUnavailableMessage = useMemo(() => {
    if (translationServiceAvailable) return null;
    if (lang === 'fr') return 'Service de traduction indisponible: fallback en anglais.';
    if (lang === 'ar') return 'خدمة الترجمة غير متاحة حاليا: سيتم استخدام الإنجليزية مؤقتا.';
    return 'Translation service unavailable: using English fallback.';
  }, [translationServiceAvailable, lang]);

  useEffect(() => {
    const init = async () => {
      setConnectionError(null);
      try {
        const healthy = await checkBackendHealth();
        if (!healthy) { setConnectionError('BACKEND_DOWN'); setIsAppLoading(false); return; }
        const realUser = await RealAPI.getMe();
        if (realUser) {
          setUser({
            id: realUser.id, email: realUser.email, name: realUser.name,
            role: mapBackendRoleToFrontend(realUser.role),
            avatarUrl: realUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(realUser.name)}&background=2563eb&color=fff&bold=true`,
            companyId: realUser.companyId, mustChangePassword: realUser.mustChangePassword,
          });
          if (realUser.companyId) {
            const company = await RealAPI.getCompany(realUser.companyId);
            if (company) setTenant({ id: company.id, name: company.name, logo: company.logo, currency: company.currency, taxRate: company.taxRate });
          }
        }
      } catch { setConnectionError('BACKEND_DOWN'); }
      setIsAppLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const loadAvailableLanguages = async () => {
      try {
        const result = await RealAPI.getTranslationLanguages();
        if (Array.isArray(result.languages) && result.languages.length) {
          setAvailableDynamicLangs(result.languages);
        }
        setTranslationServiceAvailable(true);
      } catch {
        setTranslationServiceAvailable(false);
        // Keep default language list if translation service languages cannot be loaded.
      }
    };
    void loadAvailableLanguages();
  }, []);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  useEffect(() => {
    if (DYNAMIC_TO_STATIC_LANG[lang]) {
      setLang(DYNAMIC_TO_STATIC_LANG[lang]);
      return;
    }
    localStorage.setItem('finops_lang', lang);
    const dir = getLangDir(lang);
    const htmlLang = isStaticLang(lang) ? lang : lang.slice(0, 3).toLowerCase();
    document.documentElement.dir = dir;
    document.documentElement.lang = htmlLang;
  }, [lang]);

  useEffect(() => {
    const loadUserCompanies = async () => {
      if (!user || !useRealBackend) {
        setUserCompanies([]);
        return;
      }
      if (
        user.role !== UserRole.BUSINESS_OWNER &&
        user.role !== UserRole.BUSINESS_ADMIN &&
        user.role !== UserRole.ACCOUNTANT &&
        user.role !== UserRole.TEAM_MEMBER
      ) {
        setUserCompanies([]);
        return;
      }
      try {
        const companies = await RealAPI.getMyCompanies();
        setUserCompanies(companies);
      } catch {
        // Keep current tenant context if loading companies fails.
      }
    };
    void loadUserCompanies();
  }, [user, useRealBackend]);

  useEffect(() => {
    if (!user || !useRealBackend) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const [list, unread] = await Promise.all([
          RealAPI.getNotifications(),
          RealAPI.getUnreadNotificationsCount(),
        ]);
        if (cancelled) return;
        setNotifications(list);
        setUnreadNotificationsCount(unread);
      } catch {
        if (cancelled) return;
        setNotifications([]);
        setUnreadNotificationsCount(0);
      }
    };

    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user, useRealBackend]);

  useEffect(() => {
    const available = new Set(languageOptions.map((option) => String(option.code)));
    if (!isStaticLang(lang) && !available.has(lang)) {
      setLang('fr');
    }
  }, [lang, languageOptions]);

  useEffect(() => {
    const loadRuntimeTranslations = async () => {
      if (isStaticLang(lang) || getRuntimeTranslations(lang)) return;
      setIsTranslatingUi(true);
      try {
        const english = getBaseTranslations('en');
        const keys = Object.keys(english);
        const texts = keys.map(k => english[k]);
        const result = await RealAPI.translateBatch({
          texts,
          source_lang: 'eng_Latn',
          target_lang: lang,
        });
        if (result.translations.length === keys.length) {
          const dynamicValues = keys.reduce<Record<string, string>>((acc, key, idx) => {
            acc[key] = result.translations[idx];
            return acc;
          }, {});
          setRuntimeTranslations(lang, dynamicValues);
          setTranslationServiceAvailable(true);
        }
      } catch {
        setTranslationServiceAvailable(false);
        // Keep English fallback if runtime translation service is unavailable.
      } finally {
        setIsTranslatingUi(false);
      }
    };
    void loadRuntimeTranslations();
  }, [lang]);

  const handleLogin = async (u: User, mustChangePassword?: boolean) => {
    setUser({ ...u, mustChangePassword });
    if (u.companyId && useRealBackend) {
      try {
        const company = await RealAPI.getCompany(u.companyId);
        if (company) setTenant({ id: company.id, name: company.name, logo: company.logo, currency: company.currency, taxRate: company.taxRate });
      } catch {}
    } else {
      const t = await BackendAPI.getTenant();
      setTenant(t);
    }
  };

  const handleLogout = async () => {
    if (useRealBackend) RealAPI.logout();
    else await BackendAPI.logout();
    setUser(null); setTenant(null); setShowAuth(false); setActiveTab('dashboard');
  };

  const handleSwitchCompany = async (nextCompanyId: string) => {
    if (!nextCompanyId || !user || user.companyId === nextCompanyId) return;
    setCompanySwitching(true);
    setCompanyActionError(null);
    try {
      await RealAPI.switchCompany(nextCompanyId);
      const company = await RealAPI.getCompany(nextCompanyId);
      setTenant({ id: company.id, name: company.name, logo: company.logo, currency: company.currency, taxRate: company.taxRate });
      setUser({ ...user, companyId: nextCompanyId });
      if (activeTab === 'employees' && (user.role === UserRole.TEAM_MEMBER || user.role === UserRole.ACCOUNTANT)) {
        setActiveTab('dashboard');
      }
    } catch (err) {
      const { message } = getErrorMessage(err);
      setCompanyActionError(message);
    } finally {
      setCompanySwitching(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!user || user.role !== UserRole.BUSINESS_OWNER) return;
    const name = window.prompt('Nom de la nouvelle entreprise:');
    if (!name || !name.trim()) return;
    const categoryInput = window.prompt('Catégorie (technology, retail, services, manufacturing, construction, healthcare, finance, other):', 'other');
    const category = (categoryInput || 'other').trim() as CompanyBackend['category'];
    setCompanySwitching(true);
    setCompanyActionError(null);
    try {
      const created = await RealAPI.createCompany({ name: name.trim(), category });
      const companies = await RealAPI.getMyCompanies();
      setUserCompanies(companies);
      await handleSwitchCompany(created.id);
    } catch (err) {
      const { message } = getErrorMessage(err);
      setCompanyActionError(message);
      setCompanySwitching(false);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)),
    );
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    try {
      await RealAPI.markNotificationAsRead(id);
    } catch {
      // Ignore optimistic update rollback to keep UX smooth.
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || now })));
    setUnreadNotificationsCount(0);
    try {
      await RealAPI.markAllNotificationsAsRead();
    } catch {
      // Ignore optimistic update rollback to keep UX smooth.
    }
  };

  /* ---- SCREENS ---- */

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-600/30">
            <ShieldCheck size={32} />
          </div>
          <Loader2 size={20} className="absolute -bottom-1 -right-1 text-primary-600 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-gray-900 dark:text-white">FinOps Platform</p>
          <p className="text-sm text-gray-400 animate-pulse">{t('loading.connecting', lang)}</p>
        </div>
      </div>
    );
  }

  if (connectionError === 'BACKEND_DOWN') {
    const handleRetry = async () => {
      setIsAppLoading(true); setConnectionError(null);
      const ok = await checkBackendHealth();
      if (ok) {
        try {
          const u = await RealAPI.getMe();
          if (u) {
            setUser({ id: u.id, email: u.email, name: u.name, role: mapBackendRoleToFrontend(u.role), avatarUrl: u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563eb&color=fff&bold=true`, companyId: u.companyId, mustChangePassword: u.mustChangePassword });
            if (u.companyId) { const c = await RealAPI.getCompany(u.companyId); if (c) setTenant({ id: c.id, name: c.name, logo: c.logo, currency: c.currency, taxRate: c.taxRate }); }
          }
        } catch {}
      } else { setConnectionError('BACKEND_DOWN'); }
      setIsAppLoading(false);
    };
    const handleDemoMode = async () => {
      setUseRealBackend(false); setConnectionError(null);
      const u = await BackendAPI.getSession();
      if (u) { setUser(u); const t = await BackendAPI.getTenant(); setTenant(t); }
    };
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 sm:p-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex justify-center flex-1">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                <AlertCircle size={28} className="text-amber-500" />
              </div>
            </div>
            <LanguageSwitcher lang={lang} setLang={setLang} options={languageOptions} compact isLoading={isTranslatingUi} unavailableMessage={translationUnavailableMessage} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">{t('conn.title', lang)}</h1>
          <p className="text-sm text-gray-500 text-center mb-6">{t('conn.desc', lang)}</p>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 mb-6 border border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Info size={16} className="text-primary-500" /> {t('conn.instructions', lang)}</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs">
              <li>{t('conn.step1', lang)}</li>
              <li>{t('conn.step2', lang)} <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400 font-mono">cd backend</code></li>
              <li>{t('conn.step3', lang)} <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400 font-mono">npm run start:dev</code></li>
              <li>{t('conn.step4', lang)} <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">"FinOps API running"</code></li>
              <li>{t('conn.step5', lang)} <strong>{t('conn.retry', lang)}</strong></li>
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryButton onClick={handleRetry} className="flex-1 py-3.5 text-sm"><RefreshCw size={16} /> {t('conn.retry', lang)}</PrimaryButton>
            <PrimaryButton onClick={handleDemoMode} variant="outline" className="flex-1 py-3.5 text-sm">{t('conn.demoMode', lang)}</PrimaryButton>
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-4">{t('conn.demoNote', lang)}</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    if (showRegisterBusiness) {
      return <BusinessRegistrationView lang={lang} setLang={setLang} languageOptions={languageOptions} translationUnavailableMessage={translationUnavailableMessage} onSuccess={() => { setShowRegisterBusiness(false); setAuthMode('login'); setShowAuth(true); }} onCancel={() => setShowRegisterBusiness(false)} />;
    }
    if (showAuth) {
      return <AuthView lang={lang} setLang={setLang} languageOptions={languageOptions} translationUnavailableMessage={translationUnavailableMessage} mode={authMode} setMode={setAuthMode} onLogin={handleLogin} useRealBackend={useRealBackend} onCancel={() => setShowAuth(false)} onShowRegisterBusiness={() => { setShowAuth(false); setShowRegisterBusiness(true); }} />;
    }
    return <LandingPageView lang={lang} setLang={setLang} languageOptions={languageOptions} translationUnavailableMessage={translationUnavailableMessage} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} onEnter={() => { setAuthMode('login'); setShowAuth(true); }} onGetStarted={() => setShowRegisterBusiness(true)} />;
  }

  if (user.mustChangePassword) {
    return <ChangePasswordModal lang={lang} onSuccess={() => setUser({ ...user, mustChangePassword: false })} />;
  }

  const isClient = user.role === UserRole.CLIENT;

  const adminNavItems = [
    ...(user.role === UserRole.PLATFORM_ADMIN ? [{ id: 'admin-requests', icon: <ShieldCheck size={20} />, label: t('nav.requests', lang) }] : []),
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: t('nav.dashboard', lang) },
    { id: 'invoices', icon: <FileText size={20} />, label: t('nav.invoices', lang) },
    { id: 'expenses', icon: <Receipt size={20} />, label: t('nav.expenses', lang) },
    { id: 'clients', icon: <Users size={20} />, label: t('nav.clients', lang) },
    { id: 'analytics', icon: <BarChart3 size={20} />, label: t('nav.analytics', lang) },
    { id: 'audit', icon: <History size={20} />, label: t('nav.audit', lang) },
    ...((user.role === UserRole.TEAM_MEMBER || user.role === UserRole.ACCOUNTANT || user.role === UserRole.BUSINESS_ADMIN) ? [{ id: 'join-company', icon: <Building2 size={20} />, label: 'Rejoindre entreprise' }] : []),
    ...((user.role === UserRole.BUSINESS_OWNER || user.role === UserRole.BUSINESS_ADMIN) && user.companyId ? [{ id: 'employees', icon: <UserPlus size={20} />, label: t('nav.employees', lang) }] : []),
  ];

  const clientNavItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: t('nav.myPortal', lang) },
    { id: 'invoices', icon: <CreditCard size={20} />, label: t('nav.myInvoices', lang) },
    { id: 'projects', icon: <Briefcase size={20} />, label: t('nav.projects', lang) },
    { id: 'support', icon: <MessageSquare size={20} />, label: t('nav.support', lang) },
  ];

  const navItems = isClient ? clientNavItems : adminNavItems;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-[72px]'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col fixed h-full z-50`}>
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'px-5' : 'px-0 justify-center'} border-b border-gray-100 dark:border-gray-800`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-primary-600/25">
              <ShieldCheck size={20} />
            </div>
            {isSidebarOpen && <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">FinOps</span>}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} expanded={isSidebarOpen} />
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <NavItem icon={<Settings size={20} />} label={t('nav.settings', lang)} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} expanded={isSidebarOpen} />
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors text-sm font-medium ${!isSidebarOpen && 'justify-center'}`}>
            <LogOut size={18} />
            {isSidebarOpen && <span>{t('nav.logout', lang)}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`relative flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-[72px]'}`}>
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors">
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {userCompanies.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                <select
                  value={user.companyId || ''}
                  onChange={(e) => void handleSwitchCompany(e.target.value)}
                  disabled={companySwitching}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 outline-none disabled:opacity-60"
                >
                  {userCompanies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                {user.role === UserRole.BUSINESS_OWNER && (
                  <button
                    onClick={() => void handleCreateCompany()}
                    disabled={companySwitching}
                    className="px-2.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
                  >
                    + Société
                  </button>
                )}
              </div>
            )}
            {tenant && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Building2 size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{tenant.name}</span>
              </div>
            )}
            {companyActionError && (
              <span className="hidden lg:inline text-xs text-rose-500">{companyActionError}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher lang={lang} setLang={setLang} options={languageOptions} compact isLoading={isTranslatingUi} unavailableMessage={translationUnavailableMessage} />
            <button
              onClick={() => setIsNotificationPanelOpen((v) => !v)}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold leading-none text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {isNotificationPanelOpen && (
          <div className="absolute right-6 top-20 z-40 w-full max-w-md">
            <Card className="p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h3>
                <button
                  onClick={handleMarkAllNotificationsAsRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Tout marquer lu
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">Aucune notification.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleMarkNotificationAsRead(n.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        n.readAt
                          ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          : 'bg-primary-50/70 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{n.title}</p>
                        {!n.readAt && <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {!isClient ? (
            <>
              {activeTab === 'admin-requests' && <AdminRegistrationRequestsView />}
              {activeTab === 'dashboard' && <AdminDashboardView tenant={tenant} />}
              {activeTab === 'invoices' && <AdminInvoicesView user={user} />}
              {activeTab === 'expenses' && <AdminExpensesView useRealBackend={useRealBackend} />}
              {activeTab === 'clients' && <AdminClientsView />}
              {activeTab === 'analytics' && <AdminAnalyticsView />}
              {activeTab === 'audit' && <AdminAuditLogView />}
              {activeTab === 'join-company' && <EmployeeCompanyJoinView />}
              {activeTab === 'employees' && user.companyId && <AdminEmployeesView companyId={user.companyId} />}
              {activeTab === 'settings' && <AdminSettingsView tenant={tenant} onUpdate={setTenant} companyId={user.companyId} />}
            </>
          ) : (
            <>
              {activeTab === 'dashboard' && <ClientDashboardView user={user} />}
              {activeTab === 'invoices' && <ClientInvoicesView user={user} />}
              {activeTab === 'projects' && <ClientProjectsView />}
              {activeTab === 'support' && <ClientSupportView />}
              {activeTab === 'settings' && <AdminSettingsView tenant={null} onUpdate={() => {}} />}
            </>
          )}
        </div>
      </main>
      <AIAssistantWidget />
    </div>
  );
};

/* ================================================================
   GEMINI AI INSIGHT
   ================================================================ */

const SmartInsightCard: React.FC = () => {
  const [analysis, setAnalysis] = useState<AiAnalyzeExpensesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const result = await RealAPI.analyzeExpenses({ lookbackMonths: 6 });
        setAnalysis(result);
      } catch {
        setAnalysis({
          summary: 'AI insight currently unavailable. Please retry in a few moments.',
          anomalies: [],
          alerts: [],
          recommendations: [],
          generatedAt: new Date().toISOString(),
        });
      }
      finally { setLoading(false); }
    };
    void fetchInsight();
  }, []);

  return (
    <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl shadow-primary-600/15 relative overflow-hidden group">
      <div className="absolute -right-8 -bottom-8 opacity-[0.08]"><BrainCircuit size={160} /></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-1.5 bg-white/20 rounded-lg"><Sparkles size={16} /></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-200">Intelligence IA</span>
        </div>
        <h3 className="text-base font-bold mb-2">Briefing Exécutif</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-primary-200 animate-pulse">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs font-medium">Analyse en cours...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-primary-100">{analysis?.summary}</p>
            {analysis?.anomalies.slice(0, 2).map((anomaly, idx) => (
              <p key={idx} className="text-xs text-amber-200">- {anomaly.title}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AIForecastPanel: React.FC = () => {
  const [forecast, setForecast] = useState<AiForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setForecast(await RealAPI.forecast({ historyMonths: 12 }));
      } catch {
        setForecast(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">AI Financial Forecast</h3>
        {loading && <Loader2 size={16} className="animate-spin text-primary-600" />}
      </div>
      {forecast ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Next month</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{forecast.nextMonthExpense.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Next 3 months</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{forecast.next3MonthsTotal.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Trend</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{forecast.growthTrend}</p>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="period" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="predictedExpense" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Forecast unavailable right now.</p>
      )}
    </Card>
  );
};

const AICostOptimizationPanel: React.FC = () => {
  const [data, setData] = useState<AiOptimizeCostsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setData(await RealAPI.optimizeCosts());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">AI Cost Optimization</h3>
        {loading && <Loader2 size={16} className="animate-spin text-primary-600" />}
      </div>
      {data ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">{data.summary}</p>
          <p className="text-sm font-semibold text-emerald-600">Estimated monthly savings: {data.estimatedMonthlySavings.toFixed(2)}</p>
          {data.recommendations.slice(0, 3).map((item, idx) => (
            <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Optimization data unavailable.</p>
      )}
    </Card>
  );
};

const AIAssistantWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    try {
      const data = await RealAPI.chat({ message: message.trim() });
      setReply(data.answer);
    } catch {
      setReply('Assistant unavailable right now. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <Card className="w-[360px] max-w-[calc(100vw-2rem)] p-4 mb-3 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">AI FinOps Assistant</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void ask(); } }}
              placeholder="Ask anything..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
            <PrimaryButton onClick={ask} loading={loading} className="px-3 py-2 text-sm">Ask</PrimaryButton>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 min-h-[48px]">{reply || 'Assistant ready.'}</p>
        </Card>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
        title="Open AI Assistant"
      >
        <MessageSquare size={20} />
      </button>
    </div>
  );
};

const AIMonthlyReportCard: React.FC = () => {
  const [report, setReport] = useState<AiMonthlyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setReport(await RealAPI.monthlyReport({}));
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-white">AI Monthly Report</h3>
        {loading && <Loader2 size={16} className="animate-spin text-primary-600" />}
      </div>
      {report ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">{report.executiveSummary}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Total expenses: {report.totalExpenses.toFixed(2)}</p>
          <p className="text-xs text-gray-500">{report.costIncreaseAnalysis}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Monthly report unavailable.</p>
      )}
    </Card>
  );
};

/* ================================================================
   BUSINESS REGISTRATION
   ================================================================ */

const BusinessRegistrationView: React.FC<{ lang: UiLang; setLang: (l: UiLang) => void; languageOptions: LanguageOption[]; translationUnavailableMessage: string | null; onSuccess: () => void; onCancel: () => void }> = ({ lang, setLang, languageOptions, translationUnavailableMessage, onSuccess, onCancel }) => {
  const [form, setForm] = useState({ companyName: '', companyCategory: 'technology', email: '', ownerName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const validate = (): string | null => {
    const name = form.companyName.trim();
    const ownerName = form.ownerName.trim();
    const email = form.email.trim();
    if (!name || name.length < 2) return 'Le nom de l\'entreprise doit contenir au moins 2 caractères.';
    if (name.length > 100) return 'Le nom de l\'entreprise ne doit pas dépasser 100 caractères.';
    if (!form.companyCategory) return 'Veuillez sélectionner une catégorie.';
    if (!email) return 'L\'email est obligatoire.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Veuillez fournir un email valide (ex: nom@entreprise.com).';
    if (!ownerName || ownerName.length < 2) return 'Le nom du propriétaire doit contenir au moins 2 caractères.';
    if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(ownerName)) return 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.';
    if (form.phone && !/^[\+]?[0-9\s\-\(\)]{6,20}$/.test(form.phone.trim())) return 'Numéro de téléphone invalide (ex: +216 XX XXX XXX).';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(''); setLoading(true);
    try {
      await RealAPI.submitRegistration({ ...form, companyCategory: form.companyCategory as any, phone: form.phone || undefined });
      setSubmitted(true);
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message); setErrorSolution(solution);
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('reg.success', lang)}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('reg.successDesc', lang)}</p>
          <PrimaryButton onClick={onSuccess} className="w-full py-3.5 text-sm">{t('reg.goLogin', lang)}</PrimaryButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary-600/25"><Building2 size={20} /></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('reg.title', lang)}</h1>
              <p className="text-xs text-gray-500">{t('reg.desc', lang)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher lang={lang} setLang={setLang} options={languageOptions} unavailableMessage={translationUnavailableMessage} compact />
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"><X size={18} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label={t('reg.companyName', lang)} value={form.companyName} onChange={v => setForm({ ...form, companyName: v })} placeholder={t('reg.companyPlaceholder', lang)} required icon={<Building2 size={16} />} />
          <SelectField label={t('reg.category', lang)} value={form.companyCategory} onChange={v => setForm({ ...form, companyCategory: v })} options={COMPANY_CATEGORIES} required />
          <InputField label={t('reg.email', lang)} type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder={t('reg.emailPlaceholder', lang)} required icon={<Mail size={16} />} />
          <InputField label={t('reg.ownerName', lang)} value={form.ownerName} onChange={v => setForm({ ...form, ownerName: v })} placeholder={t('reg.ownerPlaceholder', lang)} required />
          <InputField label={t('reg.phone', lang)} type="tel" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder={t('reg.phonePlaceholder', lang)} />
          {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}
          <PrimaryButton type="submit" loading={loading} className="w-full py-3.5 text-sm">{t('reg.submit', lang)}</PrimaryButton>
        </form>
      </Card>
    </div>
  );
};

/* ================================================================
   CHANGE PASSWORD
   ================================================================ */

const ChangePasswordModal: React.FC<{ lang: UiLang; onSuccess: () => void }> = ({ lang, onSuccess }) => {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();

  const passwordStrength = useMemo(() => {
    if (!newPass) return 0;
    let s = 0;
    if (newPass.length >= 8) s++;
    if (/[a-z]/.test(newPass)) s++;
    if (/[A-Z]/.test(newPass)) s++;
    if (/\d/.test(newPass)) s++;
    return s;
  }, [newPass]);

  const strengthColor = passwordStrength <= 1 ? 'bg-rose-500' : passwordStrength <= 2 ? 'bg-amber-500' : passwordStrength <= 3 ? 'bg-primary-500' : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (newPass !== confirm) { setError(t('changepwd.mismatch', lang)); return; }
    if (newPass.length < 8) { setError(t('changepwd.minLength', lang)); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(newPass)) { setError(t('changepwd.rules', lang)); return; }
    setLoading(true);
    try { await RealAPI.changePassword(current, newPass); onSuccess(); }
    catch (err) { const { message, solution } = getErrorMessage(err); setError(message); setErrorSolution(solution); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center"><ShieldCheck size={28} className="text-amber-500" /></div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">{t('changepwd.title', lang)}</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">{t('changepwd.desc', lang)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label={t('changepwd.current', lang)} type="password" value={current} onChange={setCurrent} required />
          <div>
            <InputField label={t('changepwd.new', lang)} type="password" value={newPass} onChange={setNewPass} required placeholder={t('changepwd.newPlaceholder', lang)} />
            {newPass && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColor : 'bg-gray-200 dark:bg-gray-700'}`} />
                ))}
              </div>
            )}
          </div>
          <InputField label={t('changepwd.confirm', lang)} type="password" value={confirm} onChange={setConfirm} required />
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 space-y-1">
              <span className={`flex items-center gap-2 ${newPass.length >= 8 ? 'text-emerald-500' : ''}`}><CircleDot size={10} /> {t('changepwd.rule1', lang)}</span>
              <span className={`flex items-center gap-2 ${/[A-Z]/.test(newPass) ? 'text-emerald-500' : ''}`}><CircleDot size={10} /> {t('changepwd.rule2', lang)}</span>
              <span className={`flex items-center gap-2 ${/[a-z]/.test(newPass) ? 'text-emerald-500' : ''}`}><CircleDot size={10} /> {t('changepwd.rule3', lang)}</span>
              <span className={`flex items-center gap-2 ${/\d/.test(newPass) ? 'text-emerald-500' : ''}`}><CircleDot size={10} /> {t('changepwd.rule4', lang)}</span>
            </p>
          </div>
          {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}
          <PrimaryButton type="submit" loading={loading} className="w-full py-3.5 text-sm">{t('changepwd.submit', lang)}</PrimaryButton>
        </form>
      </Card>
    </div>
  );
};

/* ================================================================
   LANDING PAGE
   ================================================================ */

const LandingPageView: React.FC<{ lang: UiLang; setLang: (l: UiLang) => void; languageOptions: LanguageOption[]; translationUnavailableMessage: string | null; isDarkMode: boolean; setIsDarkMode: (v: boolean) => void; onEnter: () => void; onGetStarted: () => void }> = ({ lang, setLang, languageOptions, translationUnavailableMessage, isDarkMode, setIsDarkMode, onEnter, onGetStarted }) => (
  <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors overflow-hidden">
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary-600/25"><ShieldCheck size={20} /></div>
          <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">FinOps</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
          <a href="#features" className="hover:text-primary-600 transition-colors">{t('landing.features', lang)}</a>
          <a href="#stats" className="hover:text-primary-600 transition-colors">{t('landing.performance', lang)}</a>
          <a href="#about" className="hover:text-primary-600 transition-colors">{t('landing.platform', lang)}</a>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher lang={lang} setLang={setLang} options={languageOptions} unavailableMessage={translationUnavailableMessage} compact />
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"><Sun size={18} /></button>
          <PrimaryButton onClick={onEnter} variant="outline" className="px-5 py-2 text-sm">{t('landing.connection', lang)}</PrimaryButton>
          <PrimaryButton onClick={onGetStarted} className="px-5 py-2 text-sm">{t('landing.start', lang)}</PrimaryButton>
        </div>
      </div>
    </nav>

    <section className="pt-36 pb-20 px-6 max-w-5xl mx-auto text-center relative">
      <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-600/10 blur-[100px] rounded-full -z-10"></div>
      <Badge variant="info"><Sparkles size={12} /> {t('landing.badge', lang)}</Badge>
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-6 mb-6 text-gray-900 dark:text-white leading-[1.1]">
        {t('landing.title1', lang)}<br /><span className="text-primary-600">{t('landing.title2', lang)}</span>
      </h1>
      <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
        {t('landing.subtitle', lang)}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <PrimaryButton onClick={onGetStarted} className="px-8 py-4 text-base">{t('landing.join', lang)} <ArrowRight size={18} /></PrimaryButton>
        <PrimaryButton onClick={onEnter} variant="outline" className="px-8 py-4 text-base">{t('landing.login', lang)}</PrimaryButton>
      </div>
    </section>

    <section id="features" className="py-16 px-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard icon={<Zap className="text-amber-500" />} title={t('landing.feature1.title', lang)} desc={t('landing.feature1.desc', lang)} />
        <FeatureCard icon={<Globe className="text-blue-500" />} title={t('landing.feature2.title', lang)} desc={t('landing.feature2.desc', lang)} />
        <FeatureCard icon={<TrendingUp className="text-emerald-500" />} title={t('landing.feature3.title', lang)} desc={t('landing.feature3.desc', lang)} />
      </div>
    </section>

    <section id="stats" className="py-16 bg-primary-600 text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
        {[
          { val: '$2.4B+', label: t('landing.transactions', lang) },
          { val: '12k+', label: t('landing.companies', lang) },
          { val: '99.99%', label: t('landing.uptime', lang) },
          { val: '24/7', label: t('landing.support', lang) },
        ].map(s => (
          <div key={s.label}><p className="text-4xl font-bold mb-1">{s.val}</p><p className="text-primary-200 text-xs font-medium uppercase tracking-wider">{s.label}</p></div>
        ))}
      </div>
    </section>

    <footer className="py-12 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-white"><ShieldCheck size={14} /></div>
          <span className="font-bold text-gray-900 dark:text-white">FinOps</span>
        </div>
        <p className="text-xs text-gray-500">{t('landing.footer', lang)}</p>
      </div>
    </footer>
  </div>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <Card hover className="p-8 group">
    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary-600 group-hover:text-white transition-all">
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
    </div>
    <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
  </Card>
);

/* ================================================================
   AUTH VIEW
   ================================================================ */

const AuthView: React.FC<{ lang: UiLang; setLang: (l: UiLang) => void; languageOptions: LanguageOption[]; translationUnavailableMessage: string | null; mode: 'login' | 'register' | 'register-business'; setMode: (m: any) => void; onLogin: (u: User, mustChangePassword?: boolean) => void; useRealBackend?: boolean; onCancel: () => void; onShowRegisterBusiness?: () => void }> = ({ lang, setLang, languageOptions, translationUnavailableMessage, mode, setMode, onLogin, useRealBackend = false, onCancel, onShowRegisterBusiness }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.BUSINESS_OWNER);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showRolesInfo, setShowRolesInfo] = useState(useRealBackend);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    message: string;
    emailSent: boolean;
    previewUrl?: string;
    provider: 'gmail' | 'smtp' | 'ethereal' | 'console';
    tempPasswordForDev?: string;
  } | null>(null);
  const [forgotError, setForgotError] = useState('');
  const [forgotErrorSolution, setForgotErrorSolution] = useState<string | undefined>();
  const [backendCheckStatus, setBackendCheckStatus] = useState<'idle' | 'ok' | 'ko' | 'checking'>('idle');
  const [roleAction, setRoleAction] = useState<'login' | 'create'>('login');
  const [employeeRequestForm, setEmployeeRequestForm] = useState({
    fullName: '',
    email: '',
    companyName: '',
    desiredRole: 'employee',
  });
  const [employeeRequestSent, setEmployeeRequestSent] = useState(false);
  const [employeeRequestLoading, setEmployeeRequestLoading] = useState(false);

  const ROLE_DESCRIPTIONS = [
    {
      id: 'admin',
      icon: <ShieldCheck size={20} />,
      label: t('role.admin.label', lang),
      desc: t('role.admin.desc', lang),
      how: t('role.admin.how', lang),
      color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
      defaultEmail: 'admin@finops.com',
      defaultPass: 'Admin123!',
    },
    {
      id: 'owner',
      icon: <Crown size={20} />,
      label: t('role.owner.label', lang),
      desc: t('role.owner.desc', lang),
      how: t('role.owner.how', lang),
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      id: 'employee',
      icon: <UserCheck size={20} />,
      label: t('role.employee.label', lang),
      desc: t('role.employee.desc', lang),
      how: t('role.employee.how', lang),
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  const handleSelectRole = (roleId: string) => {
    setSelectedRole(roleId);
    setShowRolesInfo(false);
    setRoleAction('login');
    setEmployeeRequestSent(false);
    setEmployeeRequestForm({ fullName: '', email: '', companyName: '', desiredRole: 'employee' });
    setError(''); setErrorSolution(undefined);
    const r = ROLE_DESCRIPTIONS.find(rd => rd.id === roleId);
    if (r?.defaultEmail) { setEmail(r.defaultEmail); setPassword(r.defaultPass || ''); }
    else { setEmail(''); setPassword(''); }
  };

  const handleEmployeeRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeRequestForm.fullName.trim() || !employeeRequestForm.email.trim() || !employeeRequestForm.companyName.trim()) {
      setError('Veuillez remplir tous les champs du formulaire employé.');
      return;
    }
    setEmployeeRequestLoading(true);
    setError('');
    setErrorSolution(undefined);
    try {
      await RealAPI.submitEmployeeAccessRequest({
        fullName: employeeRequestForm.fullName.trim(),
        email: employeeRequestForm.email.trim(),
        companyName: employeeRequestForm.companyName.trim(),
        desiredRole: employeeRequestForm.desiredRole as 'manager' | 'employee' | 'accountant',
      });
      setEmployeeRequestSent(true);
      setEmployeeRequestForm({ fullName: '', email: '', companyName: '', desiredRole: 'employee' });
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setEmployeeRequestLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotError(t('auth.fillAll', lang)); return;
    }
    setForgotLoading(true); setForgotError(''); setForgotErrorSolution(undefined);
    try {
      const result = await RealAPI.forgotPassword(forgotEmail.trim());
      setForgotResult(result);
      setForgotSuccess(true);
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setForgotError(message); setForgotErrorSolution(solution);
    } finally { setForgotLoading(false); }
  };

  const handleCheckBackend = async () => {
    setBackendCheckStatus('checking');
    const healthy = await checkBackendHealth();
    setBackendCheckStatus(healthy ? 'ok' : 'ko');
  };

  const handleSubmit = async () => {
    if (!email || !password) { setError(t('auth.fillAll', lang)); return; }
    setIsProcessing(true); setError(''); setErrorSolution(undefined);
    if (mode === 'login') {
      if (useRealBackend) {
        try {
          const data = await RealAPI.login(email, password);
          onLogin({
            id: data.user.id, email: data.user.email, name: data.user.name,
            role: mapBackendRoleToFrontend(data.user.role),
            avatarUrl: data.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name)}&background=2563eb&color=fff&bold=true`,
            companyId: data.user.companyId, mustChangePassword: data.mustChangePassword,
          }, data.mustChangePassword);
        } catch (err) { const { message, solution } = getErrorMessage(err); setError(message); setErrorSolution(solution); }
      } else {
        const user = await BackendAPI.login(email, password);
        if (user) onLogin(user);
        else setError(t('auth.wrongCredentials', lang));
      }
    } else {
      if (!name || !email) { setError('Veuillez remplir tous les champs.'); }
      else { const user = await BackendAPI.register(name, email, role); onLogin(user); }
    }
    setIsProcessing(false);
  };

  // ---- Forgot Password View ----
  if (showForgotPassword) {
    if (forgotSuccess) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mail size={28} className="text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {forgotResult?.emailSent ? t('forgot.success', lang) : 'Réinitialisation effectuée'}
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              {forgotResult?.message || t('forgot.checkEmail', lang)}
            </p>
            {!forgotResult?.emailSent && forgotResult?.previewUrl && (
              <a
                href={forgotResult.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1 mb-4"
              >
                <ExternalLink size={14} /> Voir l'email de prévisualisation
              </a>
            )}
            {!forgotResult?.emailSent && forgotResult?.tempPasswordForDev && (
              <p className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-amber-700 dark:text-amber-300">
                Mot de passe temporaire (dev): <strong>{forgotResult.tempPasswordForDev}</strong>
              </p>
            )}
            <PrimaryButton
              onClick={() => {
                setShowForgotPassword(false);
                setForgotSuccess(false);
                setForgotResult(null);
                setForgotEmail('');
              }}
              className="w-full py-3.5 text-sm"
            >
              {t('forgot.goLogin', lang)}
            </PrimaryButton>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center"><KeyRound size={20} className="text-amber-600" /></div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('forgot.title', lang)}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher lang={lang} setLang={setLang} options={languageOptions} unavailableMessage={translationUnavailableMessage} compact />
              <button onClick={() => { setShowForgotPassword(false); setForgotError(''); setForgotEmail(''); setForgotResult(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"><X size={18} /></button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">{t('forgot.desc', lang)}</p>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <InputField label={t('auth.email', lang)} type="email" value={forgotEmail} onChange={setForgotEmail} placeholder={t('forgot.emailPlaceholder', lang)} required icon={<Mail size={16} />} />
            {forgotError && <ErrorAlert message={forgotError} solution={forgotErrorSolution} onDismiss={() => { setForgotError(''); setForgotErrorSolution(undefined); }} />}
            <PrimaryButton type="submit" loading={forgotLoading} className="w-full py-3.5 text-sm">
              <Mail size={16} /> {t('forgot.send', lang)}
            </PrimaryButton>
            <div className="text-center">
              <button type="button" onClick={() => { setShowForgotPassword(false); setForgotError(''); setForgotEmail(''); setForgotResult(null); }} className="text-xs font-medium text-gray-400 hover:text-primary-600 transition-colors">
                ← {t('forgot.back', lang)}
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary-600/25"><ShieldCheck size={22} /></div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">FinOps</span>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher lang={lang} setLang={setLang} options={languageOptions} unavailableMessage={translationUnavailableMessage} compact />
              <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"><X size={18} /></button>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('auth.login', lang)}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('auth.selectRole', lang)}</p>

          {/* Role selection cards */}
          {useRealBackend && showRolesInfo && (
            <div className="space-y-2 mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('auth.yourRole', lang)}</p>
              {ROLE_DESCRIPTIONS.map(rd => (
                <button key={rd.id} onClick={() => handleSelectRole(rd.id)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${rd.color}`}>{rd.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{rd.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rd.desc}</p>
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><KeyRound size={10} /> {rd.how}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 mt-1 shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected role indicator */}
          {useRealBackend && selectedRole && !showRolesInfo && (
            <div className="mb-5">
              {(() => {
                const rd = ROLE_DESCRIPTIONS.find(r => r.id === selectedRole);
                if (!rd) return null;
                return (
                  <div className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${rd.color}`}>{rd.icon}</div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{rd.label}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Login form - show when role selected or not using real backend */}
          {(!useRealBackend || !showRolesInfo) && (
            <div className="space-y-4">
              {useRealBackend && selectedRole && (
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setRoleAction('login')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${roleAction === 'login' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                  >
                    Se connecter
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleAction('create')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${roleAction === 'create' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                  >
                    Créer un compte
                  </button>
                </div>
              )}

              {useRealBackend && selectedRole === 'owner' && roleAction === 'create' && (
                <Card className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                    Pour un compte propriétaire, utilisez le formulaire d'inscription entreprise.
                  </p>
                  <PrimaryButton
                    onClick={onShowRegisterBusiness}
                    className="w-full py-2.5 text-sm"
                  >
                    Ouvrir le formulaire propriétaire
                  </PrimaryButton>
                </Card>
              )}

              {useRealBackend && selectedRole === 'employee' && roleAction === 'create' && (
                <Card className="p-4 border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
                  <h3 className="font-semibold text-sm text-blue-800 dark:text-blue-300 mb-3">Formulaire de demande de compte employé</h3>
                  <form onSubmit={handleEmployeeRequestSubmit} className="space-y-3">
                    <InputField label="Nom complet" value={employeeRequestForm.fullName} onChange={(v) => setEmployeeRequestForm({ ...employeeRequestForm, fullName: v })} placeholder="Ex: Ali Ben Salah" required />
                    <InputField label="Email professionnel" type="email" value={employeeRequestForm.email} onChange={(v) => setEmployeeRequestForm({ ...employeeRequestForm, email: v })} placeholder="nom@entreprise.com" required />
                    <InputField label="Entreprise" value={employeeRequestForm.companyName} onChange={(v) => setEmployeeRequestForm({ ...employeeRequestForm, companyName: v })} placeholder="Nom de votre entreprise" required />
                    <SelectField label="Rôle demandé" value={employeeRequestForm.desiredRole} onChange={(v) => setEmployeeRequestForm({ ...employeeRequestForm, desiredRole: v })} options={ROLE_OPTIONS} required />
                    <PrimaryButton type="submit" loading={employeeRequestLoading} className="w-full py-2.5 text-sm">Envoyer la demande</PrimaryButton>
                  </form>
                  {employeeRequestSent && (
                    <p className="text-xs text-emerald-600 mt-2">Demande envoyée avec succès. Elle sera traitée par l'administrateur.</p>
                  )}
                </Card>
              )}

              {useRealBackend && selectedRole === 'admin' && roleAction === 'create' && (
                <Card className="p-4 border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20">
                  <p className="text-sm text-violet-800 dark:text-violet-300">
                    Le compte administrateur plateforme est créé par le système. Utilisez l'option “Se connecter”.
                  </p>
                </Card>
              )}

              {(!useRealBackend || !selectedRole || roleAction === 'login') && (
                <>
              {mode === 'register' && !useRealBackend && (
                <InputField label={t('auth.fullName', lang)} value={name} onChange={setName} placeholder="Jean Dupont" required />
              )}
              <InputField label={t('auth.email', lang)} type="email" value={email} onChange={setEmail} placeholder="nom@entreprise.com" required icon={<Mail size={16} />} />
              {(mode === 'login' || useRealBackend) && (
                <div>
                  <InputField label={t('auth.password', lang)} type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
                  {useRealBackend && (
                    <div className="mt-1.5 text-right">
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                        {t('auth.forgotPassword', lang)}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {mode === 'register' && !useRealBackend && (
                <SelectField label={t('auth.role', lang)} value={role} onChange={v => setRole(v as UserRole)} options={[
                  { value: UserRole.BUSINESS_OWNER, label: t('role.owner.label', lang) },
                  { value: UserRole.CLIENT, label: 'Client' },
                  { value: UserRole.ACCOUNTANT, label: t('erole.accountant', lang) },
                ]} />
              )}

              {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}

              <PrimaryButton onClick={handleSubmit} loading={isProcessing} className="w-full py-3.5 text-sm">
                {t('auth.submit', lang)}
              </PrimaryButton>

              {useRealBackend && (
                <button
                  type="button"
                  onClick={handleCheckBackend}
                  className="w-full text-xs font-medium text-gray-500 hover:text-primary-600 transition-colors"
                >
                  {backendCheckStatus === 'checking'
                    ? 'Vérification du backend...'
                    : backendCheckStatus === 'ok'
                    ? 'Backend OK'
                    : backendCheckStatus === 'ko'
                    ? 'Backend indisponible'
                    : 'Tester le backend'}
                </button>
              )}

              <div className="text-center pt-2">
                {useRealBackend ? (
                  <button onClick={onShowRegisterBusiness} className="text-xs font-medium text-gray-400 hover:text-primary-600 transition-colors">
                    {t('auth.noAccount', lang)} <span className="text-primary-600 font-semibold">{t('auth.registerBusiness', lang)}</span>
                  </button>
                ) : (
                  <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-xs font-medium text-gray-400 hover:text-primary-600 transition-colors">
                    {mode === 'login' ? t('auth.noAccountCreate', lang) : t('auth.alreadyMember', lang)}
                  </button>
                )}
              </div>
                </>
              )}
            </div>
          )}

          {/* Info box for non-admin roles */}
          {useRealBackend && selectedRole && selectedRole !== 'admin' && !showRolesInfo && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
              <div className="flex items-start gap-2.5">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  {selectedRole === 'owner'
                    ? t('role.info.owner', lang)
                    : t('role.info.employee', lang)
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mock mode quick access */}
        {!useRealBackend && (
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 mb-2 font-medium">{t('auth.quickAccess', lang)}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEmail('admin@devsphere.com'); setPassword('password'); }} className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-500 transition-colors font-medium">Admin</button>
              <button onClick={() => { setEmail('jane@acme.com'); setPassword('password'); }} className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-500 transition-colors font-medium">Client</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ================================================================
   CORE NAV & STAT COMPONENTS
   ================================================================ */

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void; expanded: boolean }> = ({ icon, label, active, onClick, expanded }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
    active ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
  } ${!expanded && 'justify-center'}`}>
    <div className="shrink-0">{icon}</div>
    {expanded && <span className="font-medium whitespace-nowrap truncate">{label}</span>}
  </button>
);

const StatCard: React.FC<{ title: string; value: string; change: string; isPositive: boolean; icon: React.ReactNode }> = ({ title, value, change, isPositive, icon }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-primary-600">{icon}</div>
      <Badge variant={isPositive ? 'success' : 'danger'}>{change}</Badge>
    </div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
  </Card>
);

/* ================================================================
   ADMIN - REGISTRATION REQUESTS
   ================================================================ */

const AdminRegistrationRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [acceptedCredentials, setAcceptedCredentials] = useState<{ email: string; tempPassword: string; role: string; companyName: string; emailSent: boolean; previewUrl?: string } | null>(null);
  const [rejectedInfo, setRejectedInfo] = useState<{ email: string; name: string; reason: string; emailSent: boolean; previewUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRequests = () => {
    setLoading(true); setError('');
    RealAPI.getRegistrationRequests()
      .then(setRequests)
      .catch(err => { const { message, solution } = getErrorMessage(err); setError(message); setErrorSolution(solution); setRequests([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadRequests(); }, []);

  const pending = requests.filter(r => r.status === 'pending');
  const displayed = tab === 'pending' ? pending : requests;

  const handleAccept = async (id: string) => {
    setProcessing(id); setError(''); setAcceptedCredentials(null); setRejectedInfo(null);
    try {
      const result = await RealAPI.acceptRegistrationRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' } : r));
      setAcceptedCredentials({ ...result.credentials, emailSent: result.emailSent, previewUrl: result.previewUrl });
    }
    catch (e) { const { message, solution } = getErrorMessage(e); setError(message); setErrorSolution(solution); }
    finally { setProcessing(null); }
  };

  const handleReject = async (id: string) => {
    const reason = rejectReason[id];
    if (!reason || reason.length < 10) { setError('Le motif du rejet doit contenir au moins 10 caractères.'); return; }
    setProcessing(id); setError(''); setAcceptedCredentials(null); setRejectedInfo(null);
    try {
      const result = await RealAPI.rejectRegistrationRequest(id, reason);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
      setRejectReason(prev => ({ ...prev, [id]: '' }));
      setRejectedInfo({ ...result.rejectedUser, emailSent: result.emailSent, previewUrl: result.previewUrl });
    }
    catch (e) { const { message, solution } = getErrorMessage(e); setError(message); setErrorSolution(solution); }
    finally { setProcessing(null); }
  };

  const handleDeleteRequest = async (id: string) => {
    const confirmed = window.confirm(
      "Supprimer définitivement cette demande ? Si elle est acceptée, l'entreprise et ses utilisateurs seront aussi supprimés.",
    );
    if (!confirmed) return;

    setProcessing(id); setError(''); setAcceptedCredentials(null); setRejectedInfo(null);
    try {
      const result = await RealAPI.deleteRegistrationRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      if (result.deletedCompany) {
        setError(`Suppression réussie : entreprise supprimée (${result.deletedUsersCount} utilisateur(s) supprimé(s)).`);
        setErrorSolution(undefined);
      }
    }
    catch (e) { const { message, solution } = getErrorMessage(e); setError(message); setErrorSolution(solution); }
    finally { setProcessing(null); }
  };

  const handleCopyCredentials = () => {
    if (!acceptedCredentials) return;
    const text = `${acceptedCredentials.email}\n${acceptedCredentials.tempPassword}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <Badge variant="success"><CheckCircle2 size={12} /> Acceptée</Badge>;
    if (status === 'rejected') return <Badge variant="danger"><X size={12} /> Rejetée</Badge>;
    return <Badge variant="warning"><Clock size={12} /> En attente</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Demandes d'inscription" description="Gérez les demandes d'inscription des propriétaires d'entreprise."
        actions={
          <PrimaryButton onClick={loadRequests} variant="outline" className="px-4 py-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </PrimaryButton>
        }
      />

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          En attente {pending.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-bold">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          Toutes ({requests.length})
        </button>
      </div>

      {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}

      {/* Accepted credentials banner */}
      {acceptedCredentials && (
        <Card className="p-5 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200">Inscription acceptée — {acceptedCredentials.companyName}</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
                {acceptedCredentials.emailSent
                  ? "Un email contenant les identifiants a été envoyé au propriétaire."
                  : "⚠ L'email n'a pas pu être envoyé (SMTP non configuré). Communiquez les identifiants manuellement."
                }
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/40">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><KeyRound size={12} /> Identifiants générés</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Email</p>
                <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{acceptedCredentials.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Mot de passe temporaire</p>
                <p className="font-mono font-semibold text-sm text-primary-600">{acceptedCredentials.tempPassword}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Rôle attribué</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{acceptedCredentials.role}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <PrimaryButton onClick={handleCopyCredentials} variant="outline" className="px-4 py-2 text-xs">
                {copied ? <><CheckCircle2 size={12} /> Copié !</> : <><Copy size={12} /> Copier les identifiants</>}
              </PrimaryButton>
              <PrimaryButton onClick={() => setAcceptedCredentials(null)} variant="outline" className="px-4 py-2 text-xs">Fermer</PrimaryButton>
            </div>
          </div>
          {acceptedCredentials.previewUrl && (
            <a href={acceptedCredentials.previewUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-semibold hover:underline">
              <Mail size={14} /> 👁️ Voir l'email envoyé (Ethereal)
            </a>
          )}
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1"><Info size={12} /> L'utilisateur devra changer son mot de passe lors de sa première connexion.</p>
        </Card>
      )}

      {/* Rejected info banner */}
      {rejectedInfo && (
        <Card className="p-5 border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg"><X className="w-5 h-5 text-rose-600" /></div>
            <div className="flex-1">
              <h3 className="font-bold text-rose-800 dark:text-rose-200">Inscription rejetée — {rejectedInfo.name}</h3>
              <p className="text-sm text-rose-700 dark:text-rose-300 mt-0.5">
                {rejectedInfo.emailSent
                  ? `Un email de rejet a été envoyé à ${rejectedInfo.email}.`
                  : `⚠ L'email n'a pas pu être envoyé à ${rejectedInfo.email} (SMTP non configuré).`
                }
              </p>
              {rejectedInfo.previewUrl && (
                <a href={rejectedInfo.previewUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 mt-1">
                  <Mail size={12} /> 👁️ Voir l'email de rejet (Ethereal)
                </a>
              )}
              <p className="text-xs text-rose-500 mt-1"><strong>Motif :</strong> {rejectedInfo.reason}</p>
              <button onClick={() => setRejectedInfo(null)} className="text-xs text-rose-600 font-medium hover:underline mt-2">Fermer</button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      ) : displayed.length === 0 ? (
        <Card><EmptyState icon={<ShieldCheck size={32} />} title="Aucune demande" description={tab === 'pending' ? "Il n'y a aucune demande en attente de validation." : "Aucune demande d'inscription n'a encore été soumise."} /></Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(req => (
            <Card key={req.id} className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">
                    {req.companyName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white">{req.companyName}</p>
                      {statusBadge(req.status)}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{req.ownerName} • {req.email}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge>{req.companyCategory}</Badge>
                      <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 lg:w-80 shrink-0">
                    <input
                      placeholder="Motif du rejet (min. 10 caractères)..."
                      value={rejectReason[req.id] || ''}
                      onChange={e => setRejectReason(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-primary-500 transition-colors"
                    />
                    <div className="flex gap-2">
                      <PrimaryButton onClick={() => handleAccept(req.id)} disabled={!!processing} variant="success" className="flex-1 py-2.5 text-xs">
                        {processing === req.id ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Accepter</>}
                      </PrimaryButton>
                      <PrimaryButton onClick={() => handleReject(req.id)} disabled={!!processing || !rejectReason[req.id] || rejectReason[req.id].length < 10} variant="danger" className="flex-1 py-2.5 text-xs">
                        <X size={14} /> Rejeter
                      </PrimaryButton>
                    </div>
                  </div>
                )}
                {req.status !== 'pending' && tab === 'all' && (
                  <div className="lg:w-48 shrink-0">
                    <PrimaryButton onClick={() => handleDeleteRequest(req.id)} disabled={!!processing} variant="danger" className="w-full py-2.5 text-xs">
                      {processing === req.id ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={14} /> Supprimer</>}
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdminEmployeeAccessRequestsPanel />
    </div>
  );
};

const AdminEmployeeAccessRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [acceptedCredentials, setAcceptedCredentials] = useState<{ email: string; tempPassword: string; role: string; companyName: string; emailSent: boolean; previewUrl?: string } | null>(null);
  const [rejectedInfo, setRejectedInfo] = useState<{ email: string; name: string; reason: string; emailSent: boolean; previewUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    setError('');
    RealAPI.getEmployeeAccessRequests()
      .then(setRequests)
      .catch((err) => {
        const { message, solution } = getErrorMessage(err);
        setError(message);
        setErrorSolution(solution);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const pending = requests.filter((r) => r.status === 'pending');
  const displayed = tab === 'pending' ? pending : requests;

  const handleAccept = async (id: string) => {
    setProcessing(id);
    setError('');
    setAcceptedCredentials(null);
    setRejectedInfo(null);
    try {
      const result = await RealAPI.acceptEmployeeAccessRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'accepted' } : r)));
      setAcceptedCredentials({
        ...result.credentials,
        emailSent: result.emailSent,
        previewUrl: result.previewUrl,
      });
    } catch (e) {
      const { message, solution } = getErrorMessage(e);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectReason[id];
    if (!reason || reason.length < 10) {
      setError('Le motif du rejet doit contenir au moins 10 caractères.');
      return;
    }
    setProcessing(id);
    setError('');
    setAcceptedCredentials(null);
    setRejectedInfo(null);
    try {
      const result = await RealAPI.rejectEmployeeAccessRequest(id, reason);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
      setRejectReason((prev) => ({ ...prev, [id]: '' }));
      setRejectedInfo({
        ...result.rejectedUser,
        emailSent: result.emailSent,
        previewUrl: result.previewUrl,
      });
    } catch (e) {
      const { message, solution } = getErrorMessage(e);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setProcessing(null);
    }
  };

  const handleCopyCredentials = () => {
    if (!acceptedCredentials) return;
    const text = `${acceptedCredentials.email}\n${acceptedCredentials.tempPassword}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <Badge variant="success"><CheckCircle2 size={12} /> Acceptée</Badge>;
    if (status === 'rejected') return <Badge variant="danger"><X size={12} /> Rejetée</Badge>;
    return <Badge variant="warning"><Clock size={12} /> En attente</Badge>;
  };

  const roleName = (r: string) =>
    r === 'manager' ? 'Manager' : r === 'accountant' ? 'Comptable' : 'Employé';

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Demandes de comptes employés</h3>
          <p className="text-xs text-gray-500 mt-0.5">Validez ou rejetez les demandes des employés qui veulent rejoindre une entreprise.</p>
        </div>
        <PrimaryButton onClick={loadRequests} variant="outline" className="px-4 py-2 text-xs">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </PrimaryButton>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit mb-4">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          En attente {pending.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-bold">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>
          Toutes ({requests.length})
        </button>
      </div>

      {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}

      {acceptedCredentials && (
        <Card className="p-4 mb-4 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold">Demande employé acceptée</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">{acceptedCredentials.emailSent ? 'Un email avec les identifiants a été envoyé.' : "Email non envoyé (SMTP non configuré). Transmettez les identifiants manuellement."}</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><p className="text-[11px] text-gray-400 uppercase tracking-wider">Email</p><p className="font-mono font-semibold text-sm">{acceptedCredentials.email}</p></div>
            <div><p className="text-[11px] text-gray-400 uppercase tracking-wider">Mot de passe temporaire</p><p className="font-mono font-semibold text-sm text-primary-600">{acceptedCredentials.tempPassword}</p></div>
            <div><p className="text-[11px] text-gray-400 uppercase tracking-wider">Rôle</p><p className="font-semibold text-sm">{acceptedCredentials.role}</p></div>
          </div>
          <div className="mt-3 flex gap-2">
            <PrimaryButton onClick={handleCopyCredentials} variant="outline" className="px-4 py-2 text-xs">
              {copied ? <><CheckCircle2 size={12} /> Copié !</> : <><Copy size={12} /> Copier les identifiants</>}
            </PrimaryButton>
            <PrimaryButton onClick={() => setAcceptedCredentials(null)} variant="outline" className="px-4 py-2 text-xs">Fermer</PrimaryButton>
          </div>
          {acceptedCredentials.previewUrl && (
            <a href={acceptedCredentials.previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 font-semibold hover:underline">
              <Mail size={12} /> 👁️ Voir l'email envoyé (Ethereal)
            </a>
          )}
        </Card>
      )}

      {rejectedInfo && (
        <Card className="p-4 mb-4 border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20">
          <p className="text-sm text-rose-800 dark:text-rose-300 font-semibold">Demande employé rejetée — {rejectedInfo.name}</p>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{rejectedInfo.emailSent ? `Email de rejet envoyé à ${rejectedInfo.email}.` : `Email non envoyé à ${rejectedInfo.email} (SMTP non configuré).`}</p>
          <p className="text-xs text-rose-500 mt-1"><strong>Motif :</strong> {rejectedInfo.reason}</p>
          {rejectedInfo.previewUrl && (
            <a href={rejectedInfo.previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 mt-1">
              <Mail size={12} /> 👁️ Voir l'email de rejet (Ethereal)
            </a>
          )}
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-600" size={28} /></div>
      ) : displayed.length === 0 ? (
        <EmptyState icon={<UserPlus size={26} />} title="Aucune demande employé" description={tab === 'pending' ? "Il n'y a aucune demande employé en attente." : "Aucune demande employé n'a encore été soumise."} />
      ) : (
        <div className="space-y-3">
          {displayed.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white">{req.fullName}</p>
                    {statusBadge(req.status)}
                    <Badge variant="info">{roleName(req.desiredRole)}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{req.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Entreprise: {req.companyName} • {new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 lg:w-80 shrink-0">
                    <input
                      placeholder="Motif du rejet (min. 10 caractères)..."
                      value={rejectReason[req.id] || ''}
                      onChange={(e) => setRejectReason((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      className="px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-primary-500 transition-colors"
                    />
                    <div className="flex gap-2">
                      <PrimaryButton onClick={() => handleAccept(req.id)} disabled={!!processing} variant="success" className="flex-1 py-2.5 text-xs">
                        {processing === req.id ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Accepter</>}
                      </PrimaryButton>
                      <PrimaryButton onClick={() => handleReject(req.id)} disabled={!!processing || !rejectReason[req.id] || rejectReason[req.id].length < 10} variant="danger" className="flex-1 py-2.5 text-xs">
                        <X size={14} /> Rejeter
                      </PrimaryButton>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

const EmployeeCompanyJoinView: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyBackend[]>([]);
  const [myRequests, setMyRequests] = useState<CompanyJoinRequestBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [form, setForm] = useState({
    companyId: '',
    desiredRole: 'employee' as 'manager' | 'employee' | 'accountant',
    profileDetails: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allCompanies, requests] = await Promise.all([
        RealAPI.discoverCompanies(),
        RealAPI.getMyCompanyJoinRequests(),
      ]);
      setCompanies(allCompanies);
      setMyRequests(requests);
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId) {
      setError('Veuillez choisir une entreprise.');
      return;
    }
    if (!form.profileDetails.trim()) {
      setError('Veuillez remplir les détails du profil selon le rôle choisi.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await RealAPI.createCompanyJoinRequest({
        companyId: form.companyId,
        desiredRole: form.desiredRole,
        profileDetails: form.profileDetails.trim(),
      });
      setForm({ companyId: '', desiredRole: 'employee', profileDetails: '' });
      await loadData();
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setSending(false);
    }
  };

  const roleDetailsLabel =
    form.desiredRole === 'manager'
      ? 'Expérience management / équipe'
      : form.desiredRole === 'accountant'
      ? 'Expérience comptable / outils'
      : 'Compétences principales pour le poste';

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <Badge variant="success"><CheckCircle2 size={12} /> Acceptée</Badge>;
    if (status === 'rejected') return <Badge variant="danger"><X size={12} /> Rejetée</Badge>;
    return <Badge variant="warning"><Clock size={12} /> En attente</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rejoindre une entreprise"
        description="Choisissez une entreprise, précisez votre rôle exact et envoyez une demande d'affectation."
        actions={
          <PrimaryButton onClick={loadData} variant="outline" className="px-4 py-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </PrimaryButton>
        }
      />

      {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Formulaire selon le rôle choisi</h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Entreprise"
            value={form.companyId}
            onChange={(v) => setForm({ ...form, companyId: v })}
            options={[
              { value: '', label: 'Sélectionner une entreprise' },
              ...companies.map((c) => ({ value: c.id, label: c.name })),
            ]}
            required
          />
          <SelectField
            label="Rôle demandé"
            value={form.desiredRole}
            onChange={(v) => setForm({ ...form, desiredRole: v as 'manager' | 'employee' | 'accountant' })}
            options={ROLE_OPTIONS}
            required
          />
          <InputField
            label={roleDetailsLabel}
            value={form.profileDetails}
            onChange={(v) => setForm({ ...form, profileDetails: v })}
            placeholder="Décrivez brièvement votre profil"
            required
          />
          <div className="md:col-span-3 flex justify-end">
            <PrimaryButton type="submit" loading={sending} className="px-5 py-2.5 text-sm">
              Envoyer la demande au propriétaire
            </PrimaryButton>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Mes demandes envoyées</h3>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-600" size={28} /></div>
        ) : myRequests.length === 0 ? (
          <EmptyState icon={<Building2 size={28} />} title="Aucune demande" description="Vous n'avez pas encore envoyé de demande d'affectation." />
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{req.company?.name || req.companyId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Rôle demandé: {req.desiredRole}</p>
                    {req.profileDetails && <p className="text-xs text-gray-400 mt-1">{req.profileDetails}</p>}
                    {req.rejectionReason && <p className="text-xs text-rose-500 mt-1">Motif: {req.rejectionReason}</p>}
                  </div>
                  {statusBadge(req.status)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const CompanyJoinRequestsManager: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [requests, setRequests] = useState<CompanyJoinRequestBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await RealAPI.getCompanyJoinRequests(companyId);
      setRequests(data);
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message);
      setErrorSolution(solution);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [companyId]);

  const onAccept = async (id: string) => {
    setProcessing(id);
    setError('');
    try {
      await RealAPI.acceptCompanyJoinRequest(companyId, id);
      await load();
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setProcessing(null);
    }
  };

  const onReject = async (id: string) => {
    const reason = rejectReason[id];
    if (!reason || reason.length < 10) {
      setError('Le motif du rejet doit contenir au moins 10 caractères.');
      return;
    }
    setProcessing(id);
    setError('');
    try {
      await RealAPI.rejectCompanyJoinRequest(companyId, id, reason);
      setRejectReason((prev) => ({ ...prev, [id]: '' }));
      await load();
    } catch (err) {
      const { message, solution } = getErrorMessage(err);
      setError(message);
      setErrorSolution(solution);
    } finally {
      setProcessing(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Demandes de rattachement à l'entreprise</h3>
        <PrimaryButton onClick={load} variant="outline" className="px-4 py-2 text-xs">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </PrimaryButton>
      </div>
      {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-600" size={28} /></div>
      ) : pending.length === 0 ? (
        <EmptyState icon={<UserPlus size={26} />} title="Aucune demande en attente" description="Les demandes de rattachement employé apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {pending.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{req.requesterUser?.name || req.requesterUserId}</p>
                  <p className="text-sm text-gray-500">{req.requesterUser?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Rôle demandé: {req.desiredRole}</p>
                  {req.profileDetails && <p className="text-xs text-gray-500 mt-1">{req.profileDetails}</p>}
                </div>
                <div className="lg:w-80 space-y-2">
                  <input
                    placeholder="Motif de rejet (min. 10 caractères)..."
                    value={rejectReason[req.id] || ''}
                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-primary-500 transition-colors"
                  />
                  <div className="flex gap-2">
                    <PrimaryButton onClick={() => onAccept(req.id)} disabled={!!processing} variant="success" className="flex-1 py-2.5 text-xs">
                      {processing === req.id ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Accepter</>}
                    </PrimaryButton>
                    <PrimaryButton onClick={() => onReject(req.id)} disabled={!!processing || !rejectReason[req.id] || rejectReason[req.id].length < 10} variant="danger" className="flex-1 py-2.5 text-xs">
                      <X size={14} /> Rejeter
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

/* ================================================================
   ADMIN - EMPLOYEES
   ================================================================ */

const AdminEmployeesView: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'employee' as 'manager' | 'employee' | 'accountant' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; role: string; name: string; emailSent: boolean; previewUrl?: string } | null>(null);
  const [copiedEmp, setCopiedEmp] = useState(false);

  const loadEmployees = () => {
    setLoading(true); setError('');
    RealAPI.getEmployees(companyId).then(setEmployees)
      .catch(err => { const { message, solution } = getErrorMessage(err); setError(message); setErrorSolution(solution); setEmployees([]); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadEmployees(); }, [companyId]);

  const validateEmployee = (): string | null => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || name.length < 2) return 'Le nom de l\'employé doit contenir au moins 2 caractères.';
    if (!/^[a-zA-ZÀ-ÿ\s\-\']+$/.test(name)) return 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes.';
    if (!email) return 'L\'email est obligatoire.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Veuillez fournir un email valide (ex: nom@entreprise.com).';
    if (!['manager', 'employee', 'accountant'].includes(form.role)) return 'Veuillez sélectionner un rôle valide.';
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateEmployee();
    if (validationError) { setError(validationError); setErrorSolution(undefined); return; }
    setSubmitting(true); setError(''); setCreatedCredentials(null);
    try {
      const result = await RealAPI.createEmployee(companyId, form);
      loadEmployees();
      setShowForm(false);
      setCreatedCredentials({ email: form.email, tempPassword: result.tempPassword, role: result.role, name: form.name, emailSent: result.emailSent, previewUrl: result.previewUrl });
      setForm({ email: '', name: '', role: 'employee' });
    } catch (err) { const { message, solution } = getErrorMessage(err); setError(message); setErrorSolution(solution); }
    finally { setSubmitting(false); }
  };

  const handleCopyEmpCredentials = () => {
    if (!createdCredentials) return;
    const text = `${createdCredentials.email}\n${createdCredentials.tempPassword}`;
    navigator.clipboard.writeText(text).then(() => { setCopiedEmp(true); setTimeout(() => setCopiedEmp(false), 2000); });
  };

  const roleName = (r: string) => r === 'manager' ? 'Manager' : r === 'accountant' ? 'Comptable' : r === 'owner' ? 'Propriétaire' : 'Employé';
  const roleColor = (r: string): 'info' | 'warning' | 'success' | 'default' => r === 'manager' ? 'info' : r === 'accountant' ? 'warning' : r === 'owner' ? 'success' : 'default';

  return (
    <div className="space-y-6">
      <PageHeader title="Gestion des employés" description="Ajoutez, gérez et invitez vos collaborateurs."
        actions={
          <div className="flex gap-2">
            <PrimaryButton onClick={loadEmployees} variant="outline" className="px-4 py-2 text-sm"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></PrimaryButton>
            <PrimaryButton onClick={() => { setShowForm(!showForm); setError(''); setCreatedCredentials(null); }} className="px-4 py-2.5 text-sm"><UserPlus size={16} /> Ajouter</PrimaryButton>
          </div>
        }
      />

      {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}

      {/* Created employee credentials banner */}
      {createdCredentials && (
        <Card className="p-5 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200">Employé créé — {createdCredentials.name}</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
                {createdCredentials.emailSent
                  ? "Un email d'invitation avec les identifiants a été envoyé."
                  : "⚠ L'email n'a pas pu être envoyé (SMTP non configuré). Communiquez les identifiants manuellement ci-dessous."
                }
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/40">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><KeyRound size={12} /> Identifiants de connexion</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Email</p>
                <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{createdCredentials.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Mot de passe temporaire</p>
                <p className="font-mono font-semibold text-sm text-primary-600">{createdCredentials.tempPassword}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Rôle</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{createdCredentials.role}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <PrimaryButton onClick={handleCopyEmpCredentials} variant="outline" className="px-4 py-2 text-xs">
                {copiedEmp ? <><CheckCircle2 size={12} /> Copié !</> : <><Copy size={12} /> Copier les identifiants</>}
              </PrimaryButton>
              <PrimaryButton onClick={() => setCreatedCredentials(null)} variant="outline" className="px-4 py-2 text-xs">Fermer</PrimaryButton>
            </div>
          </div>
          {createdCredentials.previewUrl && (
            <a href={createdCredentials.previewUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-semibold hover:underline">
              <Mail size={14} /> 👁️ Voir l'email d'invitation (Ethereal)
            </a>
          )}
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1"><Info size={12} /> L'employé devra changer son mot de passe lors de sa première connexion.</p>
        </Card>
      )}

      {showForm && (
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><UserPlus size={18} className="text-primary-600" /> Nouvel employé</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Nom complet" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Marie Martin" required />
            <InputField label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="marie@entreprise.com" required icon={<Mail size={16} />} />
            <SelectField label="Rôle" value={form.role} onChange={v => setForm({ ...form, role: v as any })} options={ROLE_OPTIONS} required />
            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <PrimaryButton onClick={() => setShowForm(false)} variant="outline" className="px-5 py-2.5 text-sm">Annuler</PrimaryButton>
              <PrimaryButton type="submit" loading={submitting} className="px-5 py-2.5 text-sm">Créer et envoyer l'invitation</PrimaryButton>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      ) : employees.length === 0 ? (
        <Card><EmptyState icon={<Users size={32} />} title="Aucun employé" description="Vous n'avez pas encore ajouté d'employés à votre entreprise."
          action={<PrimaryButton onClick={() => setShowForm(true)} className="px-5 py-2.5 text-sm"><UserPlus size={16} /> Ajouter le premier employé</PrimaryButton>}
        /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employé</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-xs font-bold">
                        {emp.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{emp.email}</td>
                  <td className="px-6 py-4"><Badge variant={roleColor(emp.role)}>{roleName(emp.role)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CompanyJoinRequestsManager companyId={companyId} />
    </div>
  );
};

/* ================================================================
   ADMIN DASHBOARD
   ================================================================ */

const AdminDashboardView: React.FC<{ tenant: Tenant | null }> = ({ tenant }) => {
  const handleExport = () => {
    const rows = REVENUE_DATA.map((r) => ({
      month: r.name,
      revenue: r.revenue,
      expenses: r.expenses,
      profit: r.revenue - r.expenses,
    }));
    downloadCsv(`dashboard-${tenant?.name || 'finops'}.csv`, rows);
  };

  return (
  <div className="space-y-6">
    <PageHeader title="Tableau de bord" description={`Vue d'ensemble pour ${tenant?.name || 'votre entreprise'}`}
      actions={<PrimaryButton onClick={handleExport} className="px-5 py-2.5 text-sm"><Download size={16} /> Exporter</PrimaryButton>}
    />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Revenus totaux" value="452 109 €" change="+12.5%" isPositive icon={<TrendingUp size={20} />} />
        <StatCard title="Charges" value="12 890 €" change="-4.2%" isPositive={false} icon={<Wallet size={20} />} />
        <StatCard title="Rétention" value="94.2%" change="+2.1%" isPositive icon={<Users size={20} />} />
        <StatCard title="Bénéfice net" value="38 720 €" change="+8.1%" isPositive icon={<CheckCircle2 size={20} />} />
      </div>
      <SmartInsightCard />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AIForecastPanel />
      <AICostOptimizationPanel />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AIMonthlyReportCard />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-6">Revenus (6 mois)</h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ borderRadius: '12px', background: '#111827', border: 'none', color: '#fff', fontSize: '13px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-6">Dépenses par catégorie</h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_DATA}>
              <Tooltip contentStyle={{ borderRadius: '12px', background: '#111827', border: 'none', color: '#fff', fontSize: '13px' }} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  </div>
  );
};

/* ================================================================
   ADMIN - INVOICES
   ================================================================ */

const AdminInvoicesView: React.FC<{ user: User }> = ({ user }) => {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  useEffect(() => { BackendAPI.getInvoices().then(d => { setData(d); setLoading(false); }); }, []);

  const handleAddInvoice = async () => {
    if (adding) return;
    setAdding(true);
    const ts = Date.now();
    const invoice = await BackendAPI.createInvoice({
      number: `INV-${String(ts).slice(-6)}`,
      clientName: 'Nouveau client',
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      total: 1000,
      status: 'Sent',
    });
    setData((prev) => [invoice, ...prev]);
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Factures" description="Gérez vos factures et suivez les paiements."
        actions={<PrimaryButton onClick={handleAddInvoice} loading={adding} className="px-5 py-2.5 text-sm"><Plus size={16} /> Nouvelle facture</PrimaryButton>}
      />
      <Card className="overflow-hidden">
        {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div> : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Montant</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-primary-600 text-sm">{inv.number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{inv.date}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-sm text-gray-700 dark:text-gray-300">{inv.clientName}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{inv.total.toLocaleString()} €</td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant={inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'danger' : 'warning'}>{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

/* ================================================================
   ADMIN - EXPENSES
   ================================================================ */

const AdminExpensesView: React.FC<{ useRealBackend: boolean }> = ({ useRealBackend }) => {
  const [data, setData] = useState<Expense[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const mapBackendExpenseToUi = (exp: ExpenseBackend): Expense => ({
    id: exp.id,
    description: exp.vendor || exp.notes || 'Expense',
    category: exp.category,
    amount: Number(exp.amount),
    date: exp.expenseDate,
    status: 'Approved',
    reportedBy: 'System',
  });

  useEffect(() => {
    const load = async () => {
      if (!useRealBackend) {
        const mock = await BackendAPI.getExpenses();
        setData(mock);
        return;
      }
      try {
        const rows = await RealAPI.getExpenses();
        setData(rows.map(mapBackendExpenseToUi));
      } catch (e) {
        const { message } = getErrorMessage(e);
        setError(message);
      }
    };
    void load();
  }, [useRealBackend]);

  const handleAddExpense = async () => {
    if (adding) return;
    setAdding(true);
    setError('');
    try {
      if (!useRealBackend) {
        const expense = await BackendAPI.createExpense({
          description: 'Nouvelle dépense',
          category: 'Operations',
          amount: 250,
          date: new Date().toISOString().slice(0, 10),
          status: 'Pending',
          reportedBy: 'Administrator',
        });
        setData((prev) => [expense, ...prev]);
      } else {
        const expense = await RealAPI.createExpense({
          amount: 250,
          expenseDate: new Date().toISOString().slice(0, 10),
          category: 'auto',
          vendor: 'AWS',
          notes: 'Auto generated expense for AI categorization flow',
        });
        setData((prev) => [mapBackendExpenseToUi(expense), ...prev]);
      }
    } catch (e) {
      const { message } = getErrorMessage(e);
      setError(message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dépenses" description="Suivez et catégorisez toutes vos dépenses."
        actions={<PrimaryButton onClick={handleAddExpense} loading={adding} className="px-5 py-2.5 text-sm"><Plus size={16} /> Enregistrer</PrimaryButton>}
      />
      {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(exp => (
          <Card key={exp.id} hover className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-500"><Receipt size={20} /></div>
              <Badge>{exp.category}</Badge>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{exp.description}</h3>
            <p className="text-xs text-gray-500 mb-4">{exp.reportedBy} • {exp.date}</p>
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span className="text-xl font-bold text-rose-500">-{exp.amount} €</span>
              <Badge variant={exp.status === 'Approved' ? 'success' : exp.status === 'Rejected' ? 'danger' : 'warning'}>{exp.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ================================================================
   ADMIN - CLIENTS
   ================================================================ */

const AdminClientsView: React.FC = () => {
  const [data, setData] = useState<Client[]>([]);
  const [adding, setAdding] = useState(false);
  useEffect(() => { BackendAPI.getClients().then(setData); }, []);

  const handleAddClient = async () => {
    if (adding) return;
    setAdding(true);
    const client = await BackendAPI.createClient({
      name: 'Nouveau client',
      email: `client${Date.now().toString().slice(-4)}@example.com`,
      phone: '+216 00 000 000',
      company: 'Nouvelle entreprise',
    });
    setData((prev) => [client, ...prev]);
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Portefeuille clients" description="Gérez vos relations client."
        actions={<PrimaryButton onClick={handleAddClient} loading={adding} className="px-5 py-2.5 text-sm"><UserPlus size={16} /> Ajouter un client</PrimaryButton>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(c => (
          <Card key={c.id} hover className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-primary-600 font-bold text-lg shrink-0">
                {c.company.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{c.company}</h3>
                <p className="text-sm text-gray-500 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{c.email}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => window.alert(`Client: ${c.name}\nEmail: ${c.email}\nTéléphone: ${c.phone}`)} className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Voir les détails <ChevronRight size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ================================================================
   ADMIN - ANALYTICS
   ================================================================ */

const AdminAnalyticsView: React.FC = () => (
  <div className="space-y-6">
    <PageHeader title="Analytiques" description="Performance et tendances financières." />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-6">Revenus vs Dépenses</h2>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.08} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', background: '#111827', border: 'none', color: '#fff', fontSize: '13px', padding: '12px 16px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={0.08} fill="#2563eb" />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={0.08} fill="#f43f5e" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="space-y-6">
        <Card className="p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Efficacité trésorerie</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">82.4%</p>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="w-[82.4%] h-full bg-emerald-500 rounded-full transition-all"></div>
          </div>
          <p className="mt-3 text-xs text-gray-500 font-medium">+12% par rapport au trimestre précédent</p>
        </Card>
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 rounded-2xl text-white shadow-lg shadow-primary-600/15">
          <BarChart3 size={24} className="mb-4 opacity-80" />
          <h3 className="font-bold mb-1">Prévision Automatisée</h3>
          <p className="text-primary-100 text-sm leading-relaxed">Les projections Q3 indiquent un excédent de 14% basé sur les métriques de rétention.</p>
        </div>
      </div>
    </div>
  </div>
);

/* ================================================================
   ADMIN - AUDIT LOG
   ================================================================ */

const AdminAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  useEffect(() => { BackendAPI.getAuditLogs().then(setLogs); }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Journal d'audit" description="Historique des actions et modifications." />
      <Card className="divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {logs.map(log => (
          <div key={log.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
            <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400"><History size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{log.action}</p>
              <p className="text-xs text-gray-400 mt-0.5">Par {log.user} • {log.entity}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-primary-600">{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</p>
              <p className="text-[11px] text-gray-400">{new Date(log.timestamp).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

/* ================================================================
   ADMIN - SETTINGS
   ================================================================ */

const AdminSettingsView: React.FC<{ tenant: Tenant | null; onUpdate: (t: Tenant) => void; companyId?: string }> = ({ tenant, onUpdate, companyId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [errorSolution, setErrorSolution] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState(tenant ? { ...tenant, matriculeFiscal: '' } : { name: '', taxRate: 0, currency: 'USD', matriculeFiscal: '' } as any);

  useEffect(() => {
    if (companyId) {
      RealAPI.getCompany(companyId)
        .then(c => setFormData({ name: c.name, logo: c.logo, taxRate: c.taxRate, currency: c.currency, matriculeFiscal: c.matriculeFiscal || '' } as any))
        .catch(err => { const { message, solution } = getErrorMessage(err); setError(message); setErrorSolution(solution); });
    }
  }, [companyId]);

  const handleSave = async () => {
    setIsSaving(true); setError(''); setSaved(false);
    try {
      if (companyId) {
        const updated = await RealAPI.updateCompany(companyId, { name: formData.name, logo: formData.logo, matriculeFiscal: formData.matriculeFiscal, taxRate: formData.taxRate, currency: formData.currency });
        onUpdate({ id: updated.id, name: updated.name, logo: updated.logo, currency: updated.currency, taxRate: updated.taxRate });
      } else if (tenant) {
        const updated = await BackendAPI.updateTenant(formData);
        onUpdate(updated);
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { const { message, solution } = getErrorMessage(e); setError(message); setErrorSolution(solution); }
    setIsSaving(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Paramètres" description={companyId ? 'Configurez les informations de votre entreprise.' : 'Paramètres de votre profil.'} />
      {error && <ErrorAlert message={error} solution={errorSolution} onDismiss={() => { setError(''); setErrorSolution(undefined); }} />}
      {saved && <SuccessAlert message="Modifications enregistrées avec succès." />}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField label="Nom de l'entreprise" value={formData.name || ''} onChange={v => setFormData({ ...formData, name: v })} icon={<Building2 size={16} />} />
          {companyId && (
            <>
              <InputField label="Logo (URL)" type="url" value={formData.logo || ''} onChange={v => setFormData({ ...formData, logo: v })} placeholder="https://..." />
              <InputField label="Matricule fiscal" value={formData.matriculeFiscal || ''} onChange={v => setFormData({ ...formData, matriculeFiscal: v })} icon={<Hash size={16} />} />
            </>
          )}
          <SelectField label="Langue" value="fr" onChange={() => {}} options={[
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'Français' },
            { value: 'ar', label: 'العربية' },
          ]} />
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <PrimaryButton onClick={handleSave} loading={isSaving} className="px-6 py-3 text-sm">
            <CheckCircle2 size={16} /> Enregistrer les modifications
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
};

/* ================================================================
   CLIENT PAGES
   ================================================================ */

const ClientDashboardView: React.FC<{ user: User }> = ({ user }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => { BackendAPI.getInvoices(user).then(setInvoices); }, [user]);
  const outstanding = invoices.filter(i => i.status !== 'Paid').reduce((a, b) => a + b.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Mon Portail" description={`Bienvenue, ${user.name}`}
        actions={<PrimaryButton onClick={() => window.alert('Support: support@finops.com')} className="px-5 py-2.5 text-sm"><MessageSquare size={16} /> Contacter le support</PrimaryButton>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Solde dû" value={`${outstanding.toLocaleString()} €`} change="En cours" isPositive={false} icon={<CreditCard size={20} />} />
        <StatCard title="Progression projet" value="85%" change="Phase 4/5" isPositive icon={<TrendingUp size={20} />} />
        <StatCard title="Total réglé" value="25 400 €" change="Cumulé" isPositive icon={<CheckCircle2 size={20} />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Dernières factures</h2>
          <div className="space-y-3">
            {invoices.slice(0, 3).map(inv => (
              <div key={inv.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-primary-600 shadow-sm"><FileText size={16} /></div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{inv.number}</p>
                    <p className="text-xs text-gray-400">{inv.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{inv.total.toLocaleString()} €</p>
                  <Badge variant={inv.status === 'Paid' ? 'success' : 'danger'}>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-6">Avancement du projet</h2>
          <div className="space-y-6">
            <TimelineStep title="Design" status="Terminé" done />
            <TimelineStep title="Infrastructure" status="En cours" active />
            <TimelineStep title="Audit conformité" status="À venir" />
          </div>
        </Card>
      </div>
    </div>
  );
};

const TimelineStep: React.FC<{ title: string; status: string; done?: boolean; active?: boolean }> = ({ title, status, done, active }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-3.5 h-3.5 rounded-full border-[3px] ${done ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-900/40' : active ? 'bg-primary-600 border-primary-200 dark:border-primary-900/40 animate-pulse' : 'bg-gray-200 border-gray-100 dark:bg-gray-700 dark:border-gray-800'}`}></div>
      <div className="w-px flex-1 bg-gray-200 dark:bg-gray-800 my-1"></div>
    </div>
    <div className="flex-1 pb-4">
      <p className={`font-semibold text-sm ${done ? 'text-emerald-600' : active ? 'text-primary-600' : 'text-gray-400'}`}>{title}</p>
      <p className="text-xs text-gray-500">{status}</p>
    </div>
  </div>
);

const ClientInvoicesView: React.FC<{ user: User }> = ({ user }) => {
  const [data, setData] = useState<Invoice[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  useEffect(() => { BackendAPI.getInvoices(user).then(setData); }, [user]);

  const onPay = async (id: string) => {
    setPaying(id);
    await BackendAPI.payInvoice(id);
    const d = await BackendAPI.getInvoices(user);
    setData(d); setPaying(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mes Factures" description="Consultez et réglez vos factures." />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Montant</th>
              <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{inv.number}</p>
                  <p className="text-xs text-gray-400">Échéance {inv.dueDate}</p>
                </td>
                <td className="px-6 py-4 font-bold text-right text-gray-900 dark:text-white">{inv.total.toLocaleString()} €</td>
                <td className="px-6 py-4 text-right">
                  {inv.status === 'Paid' ? (
                    <Badge variant="success"><PackageCheck size={12} /> Réglée</Badge>
                  ) : (
                    <PrimaryButton onClick={() => onPay(inv.id)} loading={paying === inv.id} className="px-4 py-2 text-xs">Payer</PrimaryButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const ClientProjectsView: React.FC = () => (
  <div className="space-y-6">
    <PageHeader title="Projets actifs" description="Suivez l'avancement de vos projets." />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} /></div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Phase 1 : Conformité</h2>
        <p className="text-sm text-gray-500 mb-4">Cadres réglementaires établis et vérifiés.</p>
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden"><div className="w-full bg-emerald-500 h-full rounded-full"></div></div>
      </Card>
      <Card className="p-8 text-center">
        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Clock size={28} /></div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Phase 2 : Intégration Cloud</h2>
        <p className="text-sm text-gray-500 mb-4">Connexion des API avec l'environnement FinOps.</p>
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden"><div className="w-[65%] bg-blue-500 h-full rounded-full"></div></div>
      </Card>
    </div>
  </div>
);

const ClientSupportView: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-8 sm:p-10 rounded-2xl text-white shadow-xl shadow-primary-600/15 flex flex-col md:flex-row items-center gap-8">
      <div className="w-24 h-24 bg-white/15 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/20">
        <MessageSquare size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">Support Direct</h1>
        <p className="text-primary-100 mb-6">Nos ingénieurs sont prêts à vous assister. Temps de réponse moyen : 4 min.</p>
        <PrimaryButton onClick={() => {}} variant="outline" className="bg-white text-primary-600 border-0 px-6 py-3 text-sm hover:bg-primary-50">
          Ouvrir un ticket
        </PrimaryButton>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Documentation</h3>
        <div className="space-y-2">
          {['Guide de facturation', 'Conditions SLA', 'Spécifications API'].map(title => (
            <div key={title} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600">{title}</span>
              <ExternalLink size={14} className="text-gray-400 group-hover:text-primary-600" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 text-emerald-500 font-bold mb-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          Tous les systèmes en ligne
        </div>
        <p className="text-xs text-gray-400">Disponibilité : 99.99%</p>
      </Card>
    </div>
  </div>
);

export default App;

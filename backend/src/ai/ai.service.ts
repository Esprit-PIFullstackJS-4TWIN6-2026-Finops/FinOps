import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { Expense } from '../entities/expense.entity';
import { Transaction } from '../entities/transaction.entity';
import { Client } from '../entities/client.entity';
import {
  AnalyzeExpensesDto,
  AnalyzeExpensesResult,
  CategorizeExpenseInput,
  ChatDto,
  ChatResult,
  CostOptimizationResult,
  ForecastDto,
  ForecastPoint,
  ForecastResult,
  MonthlyReportResult,
  ReportDto,
} from './dto/finops-ai.dto';
import {
  BatchTranslateDto,
  BatchTranslateResult,
  TranslateDto,
  TranslateResult,
} from './dto/translate.dto';

type ExpenseSnapshot = {
  amount: number;
  date: string;
  category: string;
  vendor?: string;
  notes?: string;
};

/** Routed FinOps questions (French / English phrasing). */
type ExpenseChatIntent =
  | 'general'
  | 'monthly_analysis_savings'
  | 'anomalies_6m'
  | 'forecast_3m'
  | 'cost_optimization_plan'
  | 'why_expense_increase';

type ChatLang = 'fr' | 'en';

@Injectable()
export class AiService {
  private readonly translationApiBaseUrl =
    process.env.PY_TRANSLATION_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
  private readonly fallbackNllbLanguages = [
    'eng_Latn', 'fra_Latn', 'arb_Arab', 'spa_Latn', 'deu_Latn', 'ita_Latn', 'por_Latn', 'tur_Latn',
    'rus_Cyrl', 'zho_Hans', 'hin_Deva', 'jpn_Jpan', 'kor_Hang', 'nld_Latn', 'pol_Latn', 'ukr_Cyrl',
    'ron_Latn', 'ces_Latn', 'swe_Latn', 'dan_Latn', 'fin_Latn', 'ell_Grek', 'heb_Hebr', 'tha_Thai',
    'ind_Latn', 'msa_Latn', 'vie_Latn',
  ];
  private readonly nllbToGoogleLang: Record<string, string> = {
    eng: 'en',
    fra: 'fr',
    arb: 'ar',
    spa: 'es',
    deu: 'de',
    ita: 'it',
    por: 'pt',
    tur: 'tr',
    rus: 'ru',
    zho: 'zh-CN',
    hin: 'hi',
    jpn: 'ja',
    kor: 'ko',
    nld: 'nl',
    pol: 'pl',
    ukr: 'uk',
    ron: 'ro',
    ces: 'cs',
    swe: 'sv',
    dan: 'da',
    fin: 'fi',
    ell: 'el',
    heb: 'he',
    tha: 'th',
    ind: 'id',
    msa: 'ms',
    vie: 'vi',
    ben: 'bn',
    tel: 'te',
    tam: 'ta',
    mar: 'mr',
    guj: 'gu',
    kan: 'kn',
    mal: 'ml',
    pan: 'pa',
    urd: 'ur',
    fas: 'fa',
    pes: 'fa',
    sqi: 'sq',
    bel: 'be',
    bos: 'bs',
    bul: 'bg',
    cat: 'ca',
    ceb: 'ceb',
    cym: 'cy',
    eus: 'eu',
    gle: 'ga',
    glg: 'gl',
    hat: 'ht',
    hrv: 'hr',
    hun: 'hu',
    hye: 'hy',
    ibo: 'ig',
    isl: 'is',
    jav: 'jv',
    kat: 'ka',
    kaz: 'kk',
    khm: 'km',
    kur: 'ku',
    lao: 'lo',
    lat: 'la',
    lav: 'lv',
    lit: 'lt',
    ltz: 'lb',
    mkd: 'mk',
    mlt: 'mt',
    mri: 'mi',
    mya: 'my',
    nep: 'ne',
    nor: 'no',
    nob: 'nb',
    nno: 'no',
    pus: 'ps',
    slk: 'sk',
    slv: 'sl',
    srp: 'sr',
    sun: 'su',
    swa: 'sw',
    tat: 'tt',
    tgk: 'tg',
    tuk: 'tk',
    uig: 'ug',
    uzb: 'uz',
    bod: 'bo',
    dzo: 'dz',
    mon: 'mn',
    sin: 'si',
    afr: 'af',
    est: 'et',
    amh: 'am',
    asm: 'as',
    aze: 'az',
    bak: 'ba',
    bam: 'bm',
    ori: 'or',
    snd: 'sd',
    som: 'so',
    yor: 'yo',
    zul: 'zu',
    xho: 'xh',
    wol: 'wo',
    hau: 'ha',
    yue: 'zh-TW',
    cmn: 'zh-CN',
  };
  private readonly aiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  private readonly requestCounters = new Map<string, { windowStartMs: number; count: number }>();
  private readonly cache = new Map<string, { expiresAtMs: number; value: unknown }>();

  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async analyzeExpenses(companyId: string, dto: AnalyzeExpensesDto): Promise<AnalyzeExpensesResult> {
    return this.withGuardrails(
      companyId,
      'analyze-expenses',
      dto,
      25,
      3 * 60_000,
      async () => {
        const expenses = await this.loadExpenses(companyId, dto.expenses);
        const fallback = this.buildDeterministicExpenseAnalysis(expenses, dto.lookbackMonths || 6);
        const payload = {
          companyId,
          lookbackMonths: dto.lookbackMonths || 6,
          expenseCount: expenses.length,
          monthlyTotals: this.computeMonthlyTotals(expenses),
          topCategories: this.topCategoryTotals(expenses),
          topVendors: this.topVendorTotals(expenses),
        };
        return this.generateJsonWithGemini<AnalyzeExpensesResult>(
          'expense anomaly analysis',
          payload,
          fallback,
        );
      },
    );
  }

  async forecast(companyId: string, dto: ForecastDto): Promise<ForecastResult> {
    return this.withGuardrails(
      companyId,
      'forecast',
      dto,
      25,
      3 * 60_000,
      async () => {
        const expenses = await this.loadExpenses(companyId, dto.expenses);
        const fallback = this.buildDeterministicForecast(expenses);
        const payload = {
          companyId,
          historyMonths: dto.historyMonths || 12,
          monthlyTotals: this.computeMonthlyTotals(expenses),
          expenseCount: expenses.length,
        };
        return this.generateJsonWithGemini<ForecastResult>('financial expense forecast', payload, fallback);
      },
    );
  }

  async optimizeCosts(companyId: string): Promise<CostOptimizationResult> {
    return this.withGuardrails(
      companyId,
      'optimize-costs',
      {},
      20,
      5 * 60_000,
      async () => {
        const expenses = await this.loadExpenses(companyId);
        const fallback = this.buildDeterministicOptimization(expenses);
        const payload = {
          companyId,
          topCategories: this.topCategoryTotals(expenses),
          topVendors: this.topVendorTotals(expenses),
          recurringVendors: this.findRecurringVendors(expenses),
        };
        return this.generateJsonWithGemini<CostOptimizationResult>(
          'cost optimization recommendations',
          payload,
          fallback,
        );
      },
    );
  }

  async chat(companyId: string, dto: ChatDto): Promise<ChatResult> {
    this.checkRateLimit(companyId, 'chat', 60);
    const expenses = await this.loadExpenses(companyId);
    const transactions = await this.txRepo.find({ where: { companyId }, order: { txDate: 'DESC' }, take: 120 });
    const clientsCount = await this.clientRepo.count({ where: { companyId } });
    const lang = this.inferChatLang(dto.message);
    const intent = this.detectExpenseChatIntent(dto.message);

    if (intent !== 'general') {
      return this.buildStructuredExpenseChatAnswer(intent, expenses, lang);
    }

    const fallback = this.buildDeterministicChatAnswer(dto.message, expenses, transactions, clientsCount, lang);

    return this.generateJsonWithGemini<ChatResult>(
      'finops assistant answer',
      {
        companyId,
        question: dto.message,
        answerLanguage: lang === 'fr' ? 'French' : 'English',
        expenseSummary: this.computeMonthlyTotals(expenses).slice(-6),
        topExpenseCategories: this.topCategoryTotals(expenses),
        topVendors: this.topVendorTotals(expenses),
        precomputedAnomalies: this.buildDeterministicExpenseAnalysis(expenses, 6).anomalies.slice(0, 8),
        precomputedForecast: this.buildDeterministicForecast(expenses).timeline,
        precomputedOptimizationTitles: this.buildDeterministicOptimization(expenses).recommendations
          .sort((a, b) => this.priorityRank(b.priority) - this.priorityRank(a.priority))
          .slice(0, 6)
          .map((r) => ({ title: r.title, priority: r.priority, estimatedSavings: r.estimatedSavings })),
        recentTransactions: transactions.slice(0, 25).map((t) => ({
          date: t.txDate,
          type: t.type,
          amount: Number(t.amount),
          description: t.description || '',
        })),
        clientsCount,
        instructions:
          lang === 'fr'
            ? 'Réponds en français. Cite les chiffres du contexte. Sois concret (catégories, fournisseurs, mois). JSON: answer (markdown léger autorisé avec tirets), followUps (2-4 suggestions courtes en français).'
            : 'Answer in English. Use context figures. Be specific. JSON: answer, followUps (2-4 short suggestions).',
      },
      fallback,
    );
  }

  async generateMonthlyReport(companyId: string, dto: ReportDto): Promise<MonthlyReportResult> {
    return this.withGuardrails(
      companyId,
      'monthly-report',
      dto,
      10,
      5 * 60_000,
      async () => {
        const expenses = await this.loadExpenses(companyId);
        const fallback = this.buildDeterministicReport(expenses, dto.month);
        const payload = {
          companyId,
          month: dto.month || new Date().toISOString().slice(0, 7),
          monthlyTotals: this.computeMonthlyTotals(expenses),
          topCategories: this.topCategoryTotals(expenses),
          topVendors: this.topVendorTotals(expenses),
        };
        return this.generateJsonWithGemini<MonthlyReportResult>('monthly finops report', payload, fallback);
      },
    );
  }

  async categorizeExpense(input: CategorizeExpenseInput): Promise<string> {
    const fallback = this.ruleBasedCategory(input);
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return fallback;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: this.aiModel,
        contents: `Classify this expense into exactly one category from: Cloud, Software, Marketing, Infrastructure, HR, Operations.
Return JSON only: {"category":"<one-category>"}.
Expense: ${JSON.stringify(input)}`,
      });
      const parsed = this.extractJson<{ category?: string }>(response.text || '');
      const category = String(parsed?.category || '').trim();
      if (['Cloud', 'Software', 'Marketing', 'Infrastructure', 'HR', 'Operations'].includes(category)) {
        return category;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  async translate(payload: TranslateDto): Promise<TranslateResult> {
    try {
      return await this.callTranslationApi<TranslateResult>('/translate', payload);
    } catch {
      const translatedText = await this.translateWithGoogleFallback(
        payload.text,
        payload.source_lang,
        payload.target_lang,
      );
      return {
        translated_text: translatedText,
        source_lang: payload.source_lang,
        target_lang: payload.target_lang,
        model_name: 'google-translate-fallback',
      };
    }
  }

  async translateBatch(payload: BatchTranslateDto): Promise<BatchTranslateResult> {
    const n = payload.texts.length;
    const runGoogleFallback = async (): Promise<BatchTranslateResult> => ({
      translations: await Promise.all(
        payload.texts.map(async (text) => {
          try {
            return await this.translateWithGoogleFallback(
              text,
              payload.source_lang,
              payload.target_lang,
            );
          } catch {
            return text;
          }
        }),
      ),
      source_lang: payload.source_lang,
      target_lang: payload.target_lang,
      model_name: 'google-translate-fallback',
    });

    try {
      const raw = await this.callTranslationApi<BatchTranslateResult>('/translate/batch', payload);
      const tr = Array.isArray(raw?.translations) ? raw.translations : [];
      if (tr.length !== n) return runGoogleFallback();
      const out = tr.map((x, i) => {
        const piece = x == null ? '' : String(x).trim();
        return piece !== '' ? String(x) : (payload.texts[i] ?? '');
      });
      const missing = out.some(
        (s, i) => !(s && String(s).trim()) && Boolean(payload.texts[i]?.trim()),
      );
      if (missing) return runGoogleFallback();
      return {
        translations: out.map((x) => String(x)),
        source_lang: raw.source_lang,
        target_lang: raw.target_lang,
        model_name: raw.model_name ?? 'nllb',
      };
    } catch {
      return runGoogleFallback();
    }
  }

  async listLanguages(): Promise<{ languages: string[] }> {
    const base = [...this.fallbackNllbLanguages];
    try {
      const api = await this.callTranslationApi<{ languages: string[] }>('/languages');
      const extra = Array.isArray(api?.languages) ? api.languages : [];
      return { languages: [...new Set([...base, ...extra])].sort() };
    } catch {
      return { languages: base };
    }
  }

  private async withGuardrails<T>(
    companyId: string,
    action: string,
    payload: unknown,
    maxPerMinute: number,
    ttlMs: number,
    task: () => Promise<T>,
  ): Promise<T> {
    this.checkRateLimit(companyId, action, maxPerMinute);
    const cacheKey = this.buildCacheKey(companyId, action, payload);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now()) {
      return cached.value as T;
    }
    const result = await task();
    this.cache.set(cacheKey, { value: result, expiresAtMs: Date.now() + ttlMs });
    return result;
  }

  private checkRateLimit(companyId: string, action: string, maxPerMinute: number): void {
    const now = Date.now();
    const key = `${companyId}:${action}`;
    const current = this.requestCounters.get(key);
    if (!current || now - current.windowStartMs >= 60_000) {
      this.requestCounters.set(key, { windowStartMs: now, count: 1 });
      return;
    }
    if (current.count >= maxPerMinute) {
      throw new HttpException(
        'AI request limit reached for this company. Please retry shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
    this.requestCounters.set(key, current);
  }

  private buildCacheKey(companyId: string, action: string, payload: unknown): string {
    const hash = createHash('sha256')
      .update(JSON.stringify({ companyId, action, payload }))
      .digest('hex');
    return `${companyId}:${action}:${hash}`;
  }

  private async loadExpenses(companyId: string, override?: AnalyzeExpensesDto['expenses']): Promise<ExpenseSnapshot[]> {
    if (override?.length) {
      return override.map((e) => ({
        amount: Number(e.amount),
        date: e.date,
        category: e.category || 'Operations',
        vendor: e.vendor,
        notes: e.notes,
      }));
    }
    const rows = await this.expenseRepo.find({ where: { companyId }, order: { expenseDate: 'ASC' } });
    return rows.map((e) => ({
      amount: Number(e.amount),
      date: e.expenseDate,
      category: e.category || 'Operations',
      vendor: e.vendor,
      notes: e.notes,
    }));
  }

  private computeMonthlyTotals(expenses: ExpenseSnapshot[]): Array<{ month: string; total: number }> {
    const byMonth = new Map<string, number>();
    for (const exp of expenses) {
      const month = exp.date.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) || 0) + Number(exp.amount));
    }
    return [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));
  }

  private topCategoryTotals(expenses: ExpenseSnapshot[]): Array<{ category: string; amount: number }> {
    const map = new Map<string, number>();
    for (const exp of expenses) {
      map.set(exp.category, (map.get(exp.category) || 0) + Number(exp.amount));
    }
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }

  private topVendorTotals(expenses: ExpenseSnapshot[]): Array<{ vendor: string; amount: number; occurrences: number }> {
    const map = new Map<string, { amount: number; occurrences: number }>();
    for (const exp of expenses) {
      const vendor = (exp.vendor || '').trim() || 'Unknown';
      const current = map.get(vendor) || { amount: 0, occurrences: 0 };
      current.amount += Number(exp.amount);
      current.occurrences += 1;
      map.set(vendor, current);
    }
    return [...map.entries()]
      .map(([vendor, value]) => ({
        vendor,
        amount: Number(value.amount.toFixed(2)),
        occurrences: value.occurrences,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }

  private findRecurringVendors(expenses: ExpenseSnapshot[]): Array<{ vendor: string; amount: number; occurrences: number }> {
    return this.topVendorTotals(expenses).filter((x) => x.occurrences >= 2 && x.vendor !== 'Unknown');
  }

  private buildDeterministicExpenseAnalysis(expenses: ExpenseSnapshot[], lookbackMonths: number): AnalyzeExpensesResult {
    const monthly = this.computeMonthlyTotals(expenses).slice(-lookbackMonths);
    const totals = monthly.map((m) => m.total);
    const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const variance = totals.length
      ? totals.reduce((acc, value) => acc + (value - mean) ** 2, 0) / totals.length
      : 0;
    const stdev = Math.sqrt(variance);
    const last = monthly.at(-1);
    const prev = monthly.at(-2);
    const anomalies: AnalyzeExpensesResult['anomalies'] = [];
    if (last && stdev > 0 && last.total > mean + 1.8 * stdev) {
      anomalies.push({
        title: 'Monthly spending spike',
        severity: 'high',
        detail: `${last.month} is significantly above historical baseline.`,
      });
    }
    if (last && prev && prev.total > 0) {
      const growth = ((last.total - prev.total) / prev.total) * 100;
      if (growth > 35) {
        anomalies.push({
          title: 'Sudden month-over-month growth',
          severity: 'medium',
          detail: `Expenses increased by ${growth.toFixed(1)}% compared with previous month.`,
        });
      }
    }

    return {
      summary: anomalies.length
        ? `Detected ${anomalies.length} anomaly signal(s) over the latest ${lookbackMonths} month(s).`
        : `No critical anomaly detected over the latest ${lookbackMonths} month(s).`,
      anomalies,
      alerts: anomalies.map((a) => `${a.title}: ${a.detail}`),
      recommendations: this.buildDeterministicOptimization(expenses).recommendations
        .slice(0, 3)
        .map((r) => r.description),
      generatedAt: new Date().toISOString(),
    };
  }

  private buildDeterministicForecast(expenses: ExpenseSnapshot[]): ForecastResult {
    const monthly = this.computeMonthlyTotals(expenses);
    const recent = monthly.slice(-12);
    const values = recent.map((m) => m.total);
    const fallbackBase = values.length ? values[values.length - 1] : 0;
    const slope =
      values.length > 1 ? (values[values.length - 1] - values[0]) / (values.length - 1) : 0;

    const n1 = Math.max(0, fallbackBase + slope);
    const n2 = Math.max(0, n1 + slope);
    const n3 = Math.max(0, n2 + slope);
    const trend: ForecastResult['growthTrend'] =
      slope > 5 ? 'increasing' : slope < -5 ? 'decreasing' : 'stable';

    const timeline: ForecastPoint[] = [
      { period: 'M+1', predictedExpense: Number(n1.toFixed(2)) },
      { period: 'M+2', predictedExpense: Number(n2.toFixed(2)) },
      { period: 'M+3', predictedExpense: Number(n3.toFixed(2)) },
    ];

    return {
      nextMonthExpense: Number(n1.toFixed(2)),
      next3MonthsTotal: Number((n1 + n2 + n3).toFixed(2)),
      growthTrend: trend,
      confidence: values.length >= 6 ? 0.78 : 0.62,
      timeline,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildDeterministicOptimization(expenses: ExpenseSnapshot[]): CostOptimizationResult {
    const recurring = this.findRecurringVendors(expenses);
    const recommendations: CostOptimizationResult['recommendations'] = [];
    for (const rec of recurring.slice(0, 3)) {
      const estimated = Number((rec.amount * 0.15).toFixed(2));
      recommendations.push({
        title: `Review recurring vendor: ${rec.vendor}`,
        description: `Potentially reduce ${rec.vendor} spend by rightsizing or renegotiating contracts.`,
        estimatedSavings: estimated,
        priority: rec.amount > 1000 ? 'high' : rec.amount > 500 ? 'medium' : 'low',
      });
    }
    if (!recommendations.length) {
      recommendations.push({
        title: 'No recurring vendor hotspot detected',
        description: 'Track subscription usage per team to identify upcoming optimization opportunities.',
        estimatedSavings: 0,
        priority: 'low',
      });
    }
    const estimatedMonthlySavings = Number(
      recommendations.reduce((sum, item) => sum + item.estimatedSavings, 0).toFixed(2),
    );

    return {
      summary: `Generated ${recommendations.length} optimization recommendation(s).`,
      estimatedMonthlySavings,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  private priorityRank(p: 'low' | 'medium' | 'high'): number {
    return p === 'high' ? 3 : p === 'medium' ? 2 : 1;
  }

  private inferChatLang(message: string): ChatLang {
    const fr =
      /[àâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ]|\b(quelles|quelle|quoi|analyse|analys|dépenses|depenses|mois|prévision|prevision|anomal|optimisation|pourquoi|économiser|economiser|économies|economies|prochaines|derniers|mois-ci|fais|dis-moi|dis moi|où|ou)\b/i;
    return fr.test(message) ? 'fr' : 'en';
  }

  private detectExpenseChatIntent(message: string): ExpenseChatIntent {
    const l = message.toLowerCase();
    const norm = l.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (/anomal/i.test(l)) {
      return 'anomalies_6m';
    }
    if (
      (/prévision|prevision|forecast|predic|prevoi/i.test(norm) || /forecast/i.test(l)) &&
      (/3|trois|three|prochain|next/.test(l) || /mois/.test(l))
    ) {
      return 'forecast_3m';
    }
    if (
      /optimi[sz]|optimisation|optimization/i.test(l) ||
      (/plan/i.test(l) && /co[uû]t|cout|cost/i.test(l)) ||
      (/priorit|priority/i.test(l) && /haute|high|co[uû]t|cout|cost/i.test(l))
    ) {
      return 'cost_optimization_plan';
    }
    if (
      /pourquoi|why|explain/i.test(l) &&
      (/augment|increase|hausse|élev|elev|higher|went up|gone up/i.test(norm) ||
        /ce mois|this month|du mois|ce mois-ci/i.test(norm))
    ) {
      return 'why_expense_increase';
    }
    if (
      (/analys/i.test(norm) && /mois|month/i.test(l)) ||
      /économiser|economiser|economies|économies/i.test(norm) ||
      /where.*(can|could|should).*(save|cut|reduce)/i.test(l) ||
      /o[uù].*econom|save.*money|cut.*cost/i.test(norm)
    ) {
      return 'monthly_analysis_savings';
    }

    return 'general';
  }

  private expensesInMonth(expenses: ExpenseSnapshot[], monthPrefix: string): ExpenseSnapshot[] {
    return expenses.filter((e) => e.date.startsWith(monthPrefix));
  }

  private categoryBreakdownInList(list: ExpenseSnapshot[]): Array<{ category: string; amount: number }> {
    const map = new Map<string, number>();
    for (const exp of list) {
      const c = exp.category || 'Operations';
      map.set(c, (map.get(c) || 0) + Number(exp.amount));
    }
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount);
  }

  private formatMoney(amount: number, lang: ChatLang): string {
    const n = Number(amount.toFixed(2));
    return lang === 'fr' ? `${n.toLocaleString('fr-FR')} €` : `€${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private buildStructuredExpenseChatAnswer(
    intent: Exclude<ExpenseChatIntent, 'general'>,
    expenses: ExpenseSnapshot[],
    lang: ChatLang,
  ): ChatResult {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const emptyMsg =
      lang === 'fr'
        ? "Aucune dépense enregistrée pour cette entreprise. Ajoutez des dépenses pour activer l'analyse."
        : 'No expenses recorded for this company yet. Add expenses to enable analysis.';

    if (!expenses.length) {
      return {
        answer: emptyMsg,
        followUps:
          lang === 'fr'
            ? ['Comment saisir une dépense ?', 'Montre-moi les anomalies sur 6 mois quand j’aurai des données.']
            : ['How do I add an expense?', 'Show anomalies for 6 months once I have data.'],
        generatedAt: new Date().toISOString(),
      };
    }

    const follow = (fr: string[], en: string[]) => (lang === 'fr' ? fr : en);

    if (intent === 'anomalies_6m') {
      const analysis = this.buildDeterministicExpenseAnalysis(expenses, 6);
      const lines: string[] = [];
      if (lang === 'fr') {
        lines.push(`**Anomalies (6 derniers mois)**`, '', analysis.summary);
        if (analysis.anomalies.length) {
          lines.push('', '**Signaux détectés :**');
          for (const a of analysis.anomalies) {
            lines.push(`- **${a.title}** (${a.severity}) — ${a.detail}`);
          }
        } else {
          lines.push('', 'Aucune anomalie statistique forte sur cette période.');
        }
        if (analysis.recommendations.length) {
          lines.push('', '**Pistes d’action :**');
          analysis.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
        }
      } else {
        lines.push(`**Expense anomalies (last 6 months)**`, '', analysis.summary);
        if (analysis.anomalies.length) {
          lines.push('', '**Signals:**');
          for (const a of analysis.anomalies) {
            lines.push(`- **${a.title}** (${a.severity}) — ${a.detail}`);
          }
        } else {
          lines.push('', 'No strong statistical anomalies in this window.');
        }
        if (analysis.recommendations.length) {
          lines.push('', '**Next steps:**');
          analysis.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
        }
      }
      return {
        answer: lines.join('\n'),
        followUps: follow(
          [
            'Fais une prévision sur 3 mois.',
            'Propose un plan d’optimisation des coûts.',
            'Explique pourquoi les dépenses ont augmenté ce mois-ci.',
          ],
          ['Forecast the next 3 months.', 'Propose a cost optimization plan.', 'Why did expenses rise this month?'],
        ),
        generatedAt: new Date().toISOString(),
      };
    }

    if (intent === 'forecast_3m') {
      const f = this.buildDeterministicForecast(expenses);
      const lines: string[] = [];
      if (lang === 'fr') {
        lines.push(
          '**Prévision des dépenses (3 prochains mois)**',
          '',
          `Tendance : **${f.growthTrend}** (confiance indicative : ${(f.confidence * 100).toFixed(0)} %).`,
          `Total estimé sur 3 mois : **${this.formatMoney(f.next3MonthsTotal, lang)}**.`,
          '',
          '**Détail par période :**',
        );
        f.timeline.forEach((p) => {
          lines.push(`- ${p.period} : **${this.formatMoney(p.predictedExpense, lang)}**`);
        });
        lines.push(
          '',
          '_Méthode : extrapolation à partir de l’historique mensuel (lissage tendanciel). À affiner avec votre contexte métier._',
        );
      } else {
        lines.push(
          '**Expense forecast (next 3 months)**',
          '',
          `Trend: **${f.growthTrend}** (indicative confidence: ${(f.confidence * 100).toFixed(0)}%).`,
          `Estimated 3-month total: **${this.formatMoney(f.next3MonthsTotal, lang)}**.`,
          '',
          '**By period:**',
        );
        f.timeline.forEach((p) => {
          lines.push(`- ${p.period}: **${this.formatMoney(p.predictedExpense, lang)}**`);
        });
        lines.push('', '_Based on monthly history (trend extrapolation)._');
      }
      return {
        answer: lines.join('\n'),
        followUps: follow(
          ['Analyse les anomalies sur 6 mois.', 'Où puis-je économiser ce mois-ci ?', 'Plan d’optimisation des coûts.'],
          ['Show 6-month anomalies.', 'Where can I save this month?', 'Cost optimization plan.'],
        ),
        generatedAt: new Date().toISOString(),
      };
    }

    if (intent === 'cost_optimization_plan') {
      const opt = this.buildDeterministicOptimization(expenses);
      const sorted = [...opt.recommendations].sort(
        (a, b) => this.priorityRank(b.priority) - this.priorityRank(a.priority),
      );
      const lines: string[] = [];
      if (lang === 'fr') {
        lines.push(
          '**Plan d’optimisation des coûts** (priorité haute en premier)',
          '',
          `Économies mensuelles estimées (ordre de grandeur) : **${this.formatMoney(opt.estimatedMonthlySavings, lang)}**.`,
          '',
        );
        sorted.forEach((r, i) => {
          const pr =
            r.priority === 'high' ? '🔴 Haute' : r.priority === 'medium' ? '🟠 Moyenne' : '🟢 Basse';
          lines.push(`### ${i + 1}. ${r.title} (${pr})`);
          lines.push(r.description);
          if (r.estimatedSavings > 0) {
            lines.push(`_Économie indicative : ${this.formatMoney(r.estimatedSavings, lang)} / mois_`, '');
          } else {
            lines.push('');
          }
        });
      } else {
        lines.push('**Cost optimization plan** (high priority first)', '', `Estimated monthly savings: **${this.formatMoney(opt.estimatedMonthlySavings, lang)}**.`, '');
        sorted.forEach((r, i) => {
          lines.push(`### ${i + 1}. ${r.title} (**${r.priority}**)`);
          lines.push(r.description);
          if (r.estimatedSavings > 0) {
            lines.push(`_Indicative savings: ${this.formatMoney(r.estimatedSavings, lang)}/mo_`, '');
          } else {
            lines.push('');
          }
        });
      }
      return {
        answer: lines.join('\n'),
        followUps: follow(
          ['Analyse mes dépenses du mois.', 'Quelles anomalies sur 6 mois ?', 'Prévision 3 mois.'],
          ['Analyze this month’s expenses.', '6-month anomalies?', '3-month forecast.'],
        ),
        generatedAt: new Date().toISOString(),
      };
    }

    if (intent === 'why_expense_increase') {
      const totals = this.computeMonthlyTotals(expenses);
      const last = totals.at(-1);
      const prev = totals.at(-2);
      const lines: string[] = [];

      if (!last) {
        return {
          answer: lang === 'fr' ? 'Pas assez de données mensuelles.' : 'Not enough monthly data.',
          followUps: follow(['Ajoute des dépenses datées.'], ['Add dated expenses.']),
          generatedAt: new Date().toISOString(),
        };
      }

      const lastExp = this.expensesInMonth(expenses, last.month);
      const prevExp = prev ? this.expensesInMonth(expenses, prev.month) : [];
      const catLast = this.categoryBreakdownInList(lastExp);
      const catPrev = this.categoryBreakdownInList(prevExp);

      const catDelta = new Map<string, number>();
      for (const c of catLast) catDelta.set(c.category, (catDelta.get(c.category) || 0) + c.amount);
      for (const c of catPrev) catDelta.set(c.category, (catDelta.get(c.category) || 0) - c.amount);
      const topDeltas = [...catDelta.entries()]
        .map(([category, delta]) => ({ category, delta }))
        .filter((x) => Math.abs(x.delta) > 0.01)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 6);

      const growthPct =
        prev && prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : null;

      if (lang === 'fr') {
        lines.push(`**Pourquoi les dépenses ont évolué ?** (mois **${last.month}** vs **${prev?.month || 'N/A'}**)`, '');
        if (!prev) {
          lines.push(`Total **${last.month}** : **${this.formatMoney(last.total, lang)}** (pas de mois précédent pour comparaison).`);
        } else if (last.total <= prev.total) {
          const pct =
            growthPct !== null ? `${growthPct.toFixed(1)} %` : 'variation non calculable (mois précédent à 0 €)';
          lines.push(
            `Les dépenses **n’ont pas augmenté** : **${this.formatMoney(last.total, lang)}** en **${last.month}** vs **${this.formatMoney(prev.total, lang)}** en **${prev.month}** (${pct}).`,
            '',
            '_Si vous attendiez une hausse perçue, vérifiez les encaissements ou les factures non encore saisies._',
          );
        } else {
          const pctText =
            growthPct !== null ? `${growthPct.toFixed(1)} %` : 'forte variation (mois précédent très bas)';
          lines.push(
            `Hausse d’environ **${pctText}** : **${this.formatMoney(last.total, lang)}** (**${last.month}**) contre **${this.formatMoney(prev.total, lang)}** (**${prev.month}**).`,
            '',
            '**Catégories qui expliquent le plus l’écart :**',
          );
          for (const d of topDeltas) {
            const sign = d.delta > 0 ? '+' : '';
            lines.push(`- **${d.category}** : ${sign}${this.formatMoney(d.delta, lang)}`);
          }
          const topV = this.topVendorTotals(lastExp)[0];
          if (topV) {
            lines.push('', `Fournisseur le plus visible ce mois-ci : **${topV.vendor}** (${this.formatMoney(topV.amount, lang)}).`);
          }
        }
      } else {
        lines.push(`**Why did expenses change?** (**${last.month}** vs **${prev?.month || 'n/a'}**)`, '');
        if (!prev) {
          lines.push(`Total **${last.month}**: **${this.formatMoney(last.total, lang)}** (no prior month).`);
        } else if (last.total <= prev.total) {
          lines.push(
            `Expenses **did not increase**: **${this.formatMoney(last.total, lang)}** in **${last.month}** vs **${this.formatMoney(prev.total, lang)}** in **${prev.month}**${
              growthPct !== null ? ` (${growthPct.toFixed(1)}%)` : ''
            }.`,
          );
        } else {
          lines.push(
            `Up about **${growthPct !== null ? `${growthPct.toFixed(1)}%` : 'n/a'}**: **${this.formatMoney(last.total, lang)}** vs **${this.formatMoney(prev.total, lang)}**.`,
            '',
            '**Largest category deltas:**',
          );
          for (const d of topDeltas) {
            lines.push(`- **${d.category}**: ${d.delta > 0 ? '+' : ''}${this.formatMoney(d.delta, lang)}`);
          }
          const topV = this.topVendorTotals(lastExp)[0];
          if (topV) {
            lines.push('', `Top vendor this month: **${topV.vendor}** (${this.formatMoney(topV.amount, lang)}).`);
          }
        }
      }

      return {
        answer: lines.join('\n'),
        followUps: follow(
          ['Propose un plan d’optimisation.', 'Montre les anomalies 6 mois.', 'Prévision 3 mois.'],
          ['Optimization plan?', '6-month anomalies?', '3-month forecast?'],
        ),
        generatedAt: new Date().toISOString(),
      };
    }

    /* monthly_analysis_savings */
    const monthExp = this.expensesInMonth(expenses, currentMonth);
    const totalM = monthExp.reduce((s, e) => s + Number(e.amount), 0);
    const cats = this.categoryBreakdownInList(monthExp);
    const vendors = this.topVendorTotals(monthExp).slice(0, 5);
    const opt = this.buildDeterministicOptimization(expenses);
    const lines: string[] = [];

    if (lang === 'fr') {
      lines.push(`**Analyse des dépenses — ${currentMonth}**`, '');
      lines.push(`**Total du mois : ${this.formatMoney(totalM, lang)}** (${monthExp.length} ligne(s)).`, '');
      if (cats.length) {
        lines.push('**Répartition par catégorie :**');
        cats.slice(0, 8).forEach((c) => lines.push(`- ${c.category} : **${this.formatMoney(c.amount, lang)}**`));
        lines.push('');
      }
      if (vendors.length) {
        lines.push('**Principaux fournisseurs (ce mois) :**');
        vendors.forEach((v) =>
          lines.push(`- ${v.vendor} : **${this.formatMoney(v.amount, lang)}** (${v.occurrences}×)`),
        );
        lines.push('');
      }
      lines.push('**Où vous pouvez économiser (pistes concrètes) :**');
      opt.recommendations.slice(0, 5).forEach((r, i) => {
        lines.push(`${i + 1}. **${r.title}** — ${r.description}`);
        if (r.estimatedSavings > 0) lines.push(`   _≈ ${this.formatMoney(r.estimatedSavings, lang)} / mois possible_`);
      });
      if (!opt.recommendations.length) {
        lines.push('- Renégocier les abonnements récurrents et supprimer les licences inutilisées.');
      }
    } else {
      lines.push(`**Expense analysis — ${currentMonth}**`, '');
      lines.push(`**Month total: ${this.formatMoney(totalM, lang)}** (${monthExp.length} line(s)).`, '');
      if (cats.length) {
        lines.push('**By category:**');
        cats.slice(0, 8).forEach((c) => lines.push(`- ${c.category}: **${this.formatMoney(c.amount, lang)}**`));
        lines.push('');
      }
      if (vendors.length) {
        lines.push('**Top vendors (this month):**');
        vendors.forEach((v) =>
          lines.push(`- ${v.vendor}: **${this.formatMoney(v.amount, lang)}** (${v.occurrences}×)`),
        );
        lines.push('');
      }
      lines.push('**Where to save:**');
      opt.recommendations.slice(0, 5).forEach((r, i) => {
        lines.push(`${i + 1}. **${r.title}** — ${r.description}`);
        if (r.estimatedSavings > 0) lines.push(`   _~${this.formatMoney(r.estimatedSavings, lang)}/mo_`);
      });
    }

    return {
      answer: lines.join('\n'),
      followUps: follow(
        ['Quelles anomalies sur les 6 derniers mois ?', 'Prévision 3 mois.', 'Plan d’optimisation des coûts.'],
        ['Any anomalies in the last 6 months?', '3-month forecast.', 'Cost optimization plan.'],
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  private buildDeterministicChatAnswer(
    message: string,
    expenses: ExpenseSnapshot[],
    transactions: Transaction[],
    clientsCount: number,
    lang: ChatLang,
  ): ChatResult {
    const lower = message.toLowerCase();
    const topVendor = this.topVendorTotals(expenses)[0];
    const totals = this.computeMonthlyTotals(expenses);
    const latest = totals.at(-1)?.total || 0;
    const previous = totals.at(-2)?.total || 0;
    const growth = previous > 0 ? ((latest - previous) / previous) * 100 : 0;

    let answer: string;
    if (lang === 'fr') {
      answer = `Dernière base connue : **${this.formatMoney(latest, lang)}** de dépenses (mois le plus récent), ${transactions.length} mouvements récents, **${clientsCount}** clients. Posez une question précise : analyse du mois, anomalies, prévision ou optimisation.`;
      if (lower.includes('increase') || lower.includes('augment') || lower.includes('pourquoi')) {
        answer = `Sur les données enregistrées, la variation récente est d’environ **${growth.toFixed(1)} %** entre les deux derniers mois. Impact fournisseur principal : **${topVendor?.vendor || 'N/A'}**. Demandez : « Explique pourquoi les dépenses ont augmenté ce mois-ci » pour le détail par catégorie.`;
      } else if (lower.includes('subscription') || lower.includes('cost') || lower.includes('most')) {
        answer = `Plus gros poste récurrent observé : **${topVendor?.vendor || 'N/A'}** (~ **${this.formatMoney(topVendor?.amount || 0, lang)}**).`;
      } else if (lower.includes('reduce') || lower.includes('save') || lower.includes('optimiz') || lower.includes('économ')) {
        const opt = this.buildDeterministicOptimization(expenses);
        answer = `Piste principale : **${opt.recommendations[0]?.title || 'revoir les fournisseurs'}**, économies indicatives ~ **${this.formatMoney(opt.estimatedMonthlySavings, lang)}** / mois. Demandez un **plan d’optimisation** pour la liste priorisée.`;
      }
    } else {
      answer = `Latest expense baseline: **${this.formatMoney(latest, lang)}** (most recent month), ${transactions.length} recent movements, **${clientsCount}** clients. Ask for: monthly analysis, anomalies, forecast, or optimization.`;
      if (lower.includes('increase') || lower.includes('why')) {
        answer = `Roughly **${growth.toFixed(1)}%** change between the last two months. Top vendor: **${topVendor?.vendor || 'N/A'}**. Ask: "Why did expenses increase this month?" for category breakdown.`;
      } else if (lower.includes('subscription') || lower.includes('cost') || lower.includes('most')) {
        answer = `Largest recurring spend: **${topVendor?.vendor || 'N/A'}** (~ **${this.formatMoney(topVendor?.amount || 0, lang)}**).`;
      } else if (lower.includes('reduce') || lower.includes('save') || lower.includes('optimiz')) {
        const opt = this.buildDeterministicOptimization(expenses);
        answer = `Top idea: **${opt.recommendations[0]?.title || 'review vendor spend'}**, indicative savings ~ **${this.formatMoney(opt.estimatedMonthlySavings, lang)}**/mo. Ask for a full **optimization plan**.`;
      }
    }

    return {
      answer,
      followUps:
        lang === 'fr'
          ? [
              'Analyse mes dépenses du mois et dis-moi où je peux économiser.',
              'Quelles sont les anomalies de dépenses sur les 6 derniers mois ?',
              'Fais une prévision des dépenses pour les 3 prochains mois.',
            ]
          : [
              'Analyze my expenses this month and where I can save.',
              'What expense anomalies occurred in the last 6 months?',
              'Forecast expenses for the next 3 months.',
            ],
      generatedAt: new Date().toISOString(),
    };
  }

  private buildDeterministicReport(expenses: ExpenseSnapshot[], month?: string): MonthlyReportResult {
    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));
    const totalExpenses = Number(
      monthExpenses.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2),
    );
    const biggestCostSources = this.topCategoryTotals(monthExpenses).slice(0, 4).map((c) => ({
      label: c.category,
      amount: c.amount,
    }));
    const monthly = this.computeMonthlyTotals(expenses);
    const idx = monthly.findIndex((x) => x.month === selectedMonth);
    const prev = idx > 0 ? monthly[idx - 1] : undefined;
    const increaseText =
      prev && prev.total > 0
        ? `Month-over-month change is ${(((totalExpenses - prev.total) / prev.total) * 100).toFixed(1)}%.`
        : 'Insufficient previous-month data for precise trend.';
    const optimizationSuggestions = this.buildDeterministicOptimization(expenses).recommendations
      .slice(0, 3)
      .map((x) => x.description);

    return {
      month: selectedMonth,
      totalExpenses,
      biggestCostSources,
      costIncreaseAnalysis: increaseText,
      optimizationSuggestions,
      executiveSummary: `Total expenses for ${selectedMonth} are ${totalExpenses.toFixed(2)}. Focus on top cost categories and recurring vendors for next-month savings.`,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateJsonWithGemini<T>(
    taskName: string,
    context: unknown,
    fallback: T,
  ): Promise<T> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return fallback;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: this.aiModel,
        contents:
          `You are a FinOps analyst. Generate a concise and production-safe ${taskName} response as valid JSON only.` +
          `\nDo not include markdown, code fences, or extra commentary.` +
          `\nContext JSON:\n${JSON.stringify(context)}` +
          `\nExpected JSON shape example:\n${JSON.stringify(fallback)}`,
      });

      const parsed = this.extractJson<T>(response.text || '');
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  private extractJson<T>(text: string): T | null {
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // keep searching
    }
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }

  private ruleBasedCategory(input: CategorizeExpenseInput): string {
    const source = `${input.vendor || ''} ${input.notes || ''}`.toLowerCase();
    if (/(aws|azure|gcp|cloud|digitalocean|ovh|hosting|kubernetes)/.test(source)) return 'Cloud';
    if (/(slack|notion|jira|github|software|license|saas|figma)/.test(source)) return 'Software';
    if (/(ads|campaign|seo|marketing|facebook|google ads|linkedin)/.test(source)) return 'Marketing';
    if (/(server|infra|datacenter|network|firewall|vpn)/.test(source)) return 'Infrastructure';
    if (/(salary|payroll|recruit|training|hr|hiring)/.test(source)) return 'HR';
    return 'Operations';
  }

  private async callTranslationApi<T>(path: string, payload?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.translationApiBaseUrl}${path}`, payload ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      } : { method: 'GET' });
    } catch {
      throw new ServiceUnavailableException(
        'Translation service is unavailable. Start Python API on port 8000 or set PY_TRANSLATION_API_URL.',
      );
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // If service returns non-JSON, keep null and fall back to generic error.
    }

    if (!response.ok) {
      const detail =
        typeof data === 'object' && data !== null && 'detail' in data
          ? String((data as { detail: unknown }).detail)
          : 'Translation request failed.';
      throw new ServiceUnavailableException(detail);
    }

    return data as T;
  }

  /** Code Google Translate (client=gtx) ou null si inconnu — ne lance pas. */
  private tryGoogleLangCode(nllbCode: string): string | null {
    const root = nllbCode.split('_')[0]?.toLowerCase();
    if (!root) return null;
    return this.nllbToGoogleLang[root] ?? null;
  }

  private async translateWithGoogleFallback(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    try {
      if (sourceLang === targetLang) return text;
      const sl = this.tryGoogleLangCode(sourceLang);
      const tl = this.tryGoogleLangCode(targetLang);
      if (!sl || !tl) return text;

      const params = new URLSearchParams({
        client: 'gtx',
        sl,
        tl,
        dt: 't',
        q: text,
      });

      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
        { method: 'GET' },
      );
      if (!response.ok) return text;
      const data = (await response.json()) as unknown;
      if (!Array.isArray(data) || !Array.isArray(data[0])) return text;

      const segments = data[0] as unknown[];
      const translated = segments
        .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
        .join('');
      return translated || text;
    } catch {
      return text;
    }
  }
}


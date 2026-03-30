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
    const fallback = this.buildDeterministicChatAnswer(dto.message, expenses, transactions, clientsCount);

    return this.generateJsonWithGemini<ChatResult>(
      'finops assistant answer',
      {
        companyId,
        question: dto.message,
        expenseSummary: this.computeMonthlyTotals(expenses).slice(-6),
        topExpenseCategories: this.topCategoryTotals(expenses),
        topVendors: this.topVendorTotals(expenses),
        recentTransactions: transactions.slice(0, 25).map((t) => ({
          date: t.txDate,
          type: t.type,
          amount: Number(t.amount),
          description: t.description || '',
        })),
        clientsCount,
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
    try {
      return await this.callTranslationApi<BatchTranslateResult>('/translate/batch', payload);
    } catch {
      const translations = await Promise.all(
        payload.texts.map((text) =>
          this.translateWithGoogleFallback(text, payload.source_lang, payload.target_lang),
        ),
      );
      return {
        translations,
        source_lang: payload.source_lang,
        target_lang: payload.target_lang,
        model_name: 'google-translate-fallback',
      };
    }
  }

  async listLanguages(): Promise<{ languages: string[] }> {
    try {
      return await this.callTranslationApi<{ languages: string[] }>('/languages');
    } catch {
      return { languages: this.fallbackNllbLanguages };
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

  private buildDeterministicChatAnswer(
    message: string,
    expenses: ExpenseSnapshot[],
    transactions: Transaction[],
    clientsCount: number,
  ): ChatResult {
    const lower = message.toLowerCase();
    const topVendor = this.topVendorTotals(expenses)[0];
    const totals = this.computeMonthlyTotals(expenses);
    const latest = totals.at(-1)?.total || 0;
    const previous = totals.at(-2)?.total || 0;
    const growth = previous > 0 ? ((latest - previous) / previous) * 100 : 0;

    let answer =
      `Current expense baseline is ${latest.toFixed(2)} with ${transactions.length} tracked transactions and ${clientsCount} clients. I can also answer broader operational questions and guide next actions.`;
    if (lower.includes('increase') || lower.includes('augment') || lower.includes('pourquoi')) {
      answer = `Expenses increased by ${growth.toFixed(1)}% in the latest month. Top vendor impact comes from ${topVendor?.vendor || 'N/A'}.`;
    } else if (lower.includes('subscription') || lower.includes('cost') || lower.includes('most')) {
      answer = `Largest recurring spend appears on ${topVendor?.vendor || 'N/A'} at approximately ${(topVendor?.amount || 0).toFixed(2)}.`;
    } else if (lower.includes('reduce') || lower.includes('save') || lower.includes('optimiz')) {
      const opt = this.buildDeterministicOptimization(expenses);
      answer = `Primary saving opportunity is ${opt.recommendations[0]?.title || 'review vendor spend'}, with estimated savings around ${opt.estimatedMonthlySavings.toFixed(2)} per month.`;
    } else {
      answer = `I can help with this question. Based on your tenant context, recent expenses are ${latest.toFixed(2)} and top vendor is ${topVendor?.vendor || 'N/A'}. Ask for details (anomalies, forecast, savings, subscriptions, teams, or action plan).`;
    }

    return {
      answer,
      followUps: [
        'Show me anomalies for the last 3 months.',
        'What are the top categories by spend?',
        'Which vendors should I optimize first?',
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

  private toGoogleLangCode(nllbCode: string): string {
    const root = nllbCode.split('_')[0]?.toLowerCase();
    const mapped = this.nllbToGoogleLang[root];
    if (!mapped) {
      throw new ServiceUnavailableException(
        `Unsupported fallback language code '${nllbCode}'.`,
      );
    }
    return mapped;
  }

  private async translateWithGoogleFallback(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    if (sourceLang === targetLang) return text;

    let sl: string;
    let tl: string;
    try {
      sl = this.toGoogleLangCode(sourceLang);
      tl = this.toGoogleLangCode(targetLang);
    } catch {
      return text;
    }
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
    if (!response.ok) {
      throw new ServiceUnavailableException('Translation fallback request failed.');
    }
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new ServiceUnavailableException('Invalid translation fallback response.');
    }

    const segments = data[0] as unknown[];
    const translated = segments
      .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
      .join('');
    return translated || text;
  }
}


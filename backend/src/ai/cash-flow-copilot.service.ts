import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { trainDenseTimeSeriesRegressor } from './ml-time-series.util';
import {
  CashFlowCopilotAction,
  CashFlowCopilotDto,
  CashFlowCopilotDriver,
  CashFlowCopilotPoint,
  CashFlowCopilotResult,
} from './dto/finops-ai.dto';

type HistoricalPoint = {
  period: string;
  inflows: number;
  outflows: number;
  net: number;
};

@Injectable()
export class CashFlowCopilotService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(InvoiceRecord)
    private readonly invoiceRepo: Repository<InvoiceRecord>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async generate(companyId: string, dto: CashFlowCopilotDto): Promise<CashFlowCopilotResult> {
    const historyMonths = dto.historyMonths || 12;
    const horizonMonths = dto.horizonMonths || 3;

    const [expenses, invoices, transactions] = await Promise.all([
      this.expenseRepo.find({ where: { companyId }, order: { expenseDate: 'ASC' } }),
      this.invoiceRepo.find({ where: { companyId }, order: { date: 'ASC' } }),
      this.txRepo.find({ where: { companyId }, order: { txDate: 'ASC' } }),
    ]);

    const expenseByPeriod = this.sumByPeriod(
      expenses.map((expense) => ({
        period: expense.expenseDate.slice(0, 7),
        amount: Number(expense.amount),
      })),
    );

    const hasIncomeTransactions = transactions.some((tx) => tx.type === TransactionType.INCOME);
    const inflowByPeriod = hasIncomeTransactions
      ? this.sumByPeriod(
          transactions
            .filter((tx) => tx.type === TransactionType.INCOME)
            .map((tx) => ({
              period: tx.txDate.slice(0, 7),
              amount: Number(tx.amount),
            })),
        )
      : this.sumByPeriod(
          invoices
            .filter((invoice) => invoice.status === 'Paid')
            .map((invoice) => ({
              period: invoice.date.slice(0, 7),
              amount: Number(invoice.total),
            })),
        );

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const historyPeriods = this.buildPeriods(historyMonths, 0, currentPeriod);
    const historical: HistoricalPoint[] = historyPeriods.map((period) => {
      const inflows = inflowByPeriod.get(period) ?? 0;
      const outflows = expenseByPeriod.get(period) ?? 0;
      return {
        period,
        inflows,
        outflows,
        net: Number((inflows - outflows).toFixed(2)),
      };
    });

    const inflowSeries = historical.map((point) => point.inflows);
    const outflowSeries = historical.map((point) => point.outflows);
    const avgInflow = this.average(historical.slice(-3).map((point) => point.inflows));
    const avgOutflow = this.average(historical.slice(-3).map((point) => point.outflows));
    const inflowSlope = this.slope(inflowSeries);
    const outflowSlope = this.slope(outflowSeries);

    const outstandingWeights = new Map<string, number>();
    let overdueReceivables = 0;
    for (const invoice of invoices) {
      if (invoice.status === 'Draft' || invoice.status === 'Paid') continue;
      const period = (invoice.dueDate || invoice.date).slice(0, 7);
      const amount = Number(invoice.total) || 0;
      const weight = invoice.status === 'Overdue' ? 0.45 : 0.8;
      if (period < currentPeriod) {
        overdueReceivables += Number((amount * weight).toFixed(2));
      } else {
        outstandingWeights.set(
          period,
          Number(((outstandingWeights.get(period) || 0) + amount * weight).toFixed(2)),
        );
      }
    }

    const openingCashEstimate = Number(
      Math.max(
        0,
        historical
          .slice(-3)
          .reduce((sum, point) => sum + point.net, 0),
      ).toFixed(2),
    );

    const inflowModel = await trainDenseTimeSeriesRegressor(inflowSeries, {
      horizon: horizonMonths,
      requestedWindowSize: Math.min(4, Math.max(3, inflowSeries.length - 1)),
      minimumWindowSize: 3,
      epochs: 55,
    });
    const outflowModel = await trainDenseTimeSeriesRegressor(outflowSeries, {
      horizon: horizonMonths,
      requestedWindowSize: Math.min(4, Math.max(3, outflowSeries.length - 1)),
      minimumWindowSize: 3,
      epochs: 55,
    });

    const baseProjectedInflows =
      inflowModel.status === 'trained'
        ? inflowModel.predictedValues
        : this.buildFallbackSeriesProjection(inflowSeries, horizonMonths, avgInflow, inflowSlope);
    const baseProjectedOutflows =
      outflowModel.status === 'trained'
        ? outflowModel.predictedValues
        : this.buildFallbackSeriesProjection(outflowSeries, horizonMonths, avgOutflow, outflowSlope);

    let runningCash = openingCashEstimate;
    const futurePeriods = this.buildFuturePeriods(horizonMonths, currentPeriod);
    const timeline: CashFlowCopilotPoint[] = futurePeriods.map((period, index) => {
      const projectedInflows = Number(
        Math.max(0, baseProjectedInflows[index] + (outstandingWeights.get(period) || 0)).toFixed(2),
      );
      const projectedOutflows = Number(
        Math.max(0, baseProjectedOutflows[index]).toFixed(2),
      );
      const netCashFlow = Number((projectedInflows - projectedOutflows).toFixed(2));
      runningCash = Number((runningCash + netCashFlow).toFixed(2));
      return {
        period,
        projectedInflows,
        projectedOutflows,
        netCashFlow,
        endingCash: runningCash,
      };
    });

    const projectedEndingCash = timeline.at(-1)?.endingCash ?? openingCashEstimate;
    const projectedNetTotal = timeline.reduce((sum, point) => sum + point.netCashFlow, 0);
    const netTrend: CashFlowCopilotResult['netTrend'] =
      projectedNetTotal > avgOutflow * 0.15
        ? 'improving'
        : projectedNetTotal < -avgOutflow * 0.15
          ? 'deteriorating'
          : 'stable';

    const topExpenseCategory = this.topExpenseCategory(expenses);
    const drivers: CashFlowCopilotDriver[] = [
      {
        label: 'Expected receivables from open invoices',
        impact: Number(
          (
            [...outstandingWeights.values()].reduce((sum, amount) => sum + amount, 0) +
            overdueReceivables
          ).toFixed(2),
        ),
        direction: 'positive' as const,
      },
      {
        label: topExpenseCategory
          ? `Largest recurring outflow: ${topExpenseCategory.category}`
          : 'Recurring operating expenses',
        impact: Number((topExpenseCategory?.amount || avgOutflow).toFixed(2)),
        direction: 'negative' as const,
      },
      {
        label: outflowSlope > inflowSlope ? 'Outflows are growing faster than inflows' : 'Inflows are holding pace with costs',
        impact: Number(Math.abs((outflowSlope - inflowSlope) * horizonMonths).toFixed(2)),
        direction: (outflowSlope > inflowSlope ? 'negative' : 'positive') as 'positive' | 'negative',
      },
    ]
      .filter((driver) => driver.impact > 0)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 4);

    const actions: CashFlowCopilotAction[] = [];
    if (overdueReceivables > 0) {
      actions.push({
        title: 'Chase overdue invoices first',
        detail: `Prioritize collections on approximately ${overdueReceivables.toFixed(2)} in overdue receivables before the next cycle.`,
        priority: 'high',
      });
    }
    if (timeline.some((point) => point.netCashFlow < 0)) {
      actions.push({
        title: 'Build a 30-day cash buffer',
        detail: 'One or more projected months turn cash-flow negative. Delay discretionary spend or bring collections forward.',
        priority: 'high',
      });
    }
    if (topExpenseCategory) {
      actions.push({
        title: `Review ${topExpenseCategory.category} spend`,
        detail: `This category is your biggest expense driver at about ${topExpenseCategory.amount.toFixed(2)} over the observed history.`,
        priority: topExpenseCategory.amount > avgOutflow * 1.1 ? 'medium' : 'low',
      });
    }
    if (!actions.length) {
      actions.push({
        title: 'Maintain collection and spending discipline',
        detail: 'Projected cash flow stays broadly stable. Keep invoice follow-up tight and monitor new spending commitments.',
        priority: 'low',
      });
    }

    const monthsWithSignals = historical.filter(
      (point) => point.inflows > 0 || point.outflows > 0,
    ).length;
    const structuralConfidence = Math.max(
      0.35,
      Math.min(
        0.92,
        0.42 +
          monthsWithSignals * 0.03 +
          (hasIncomeTransactions ? 0.08 : 0.03) +
          (invoices.some((invoice) => invoice.status !== 'Draft') ? 0.05 : 0),
      ),
    );
    const modelConfidence =
      inflowModel.status === 'trained' && outflowModel.status === 'trained'
        ? (inflowModel.confidence + outflowModel.confidence) / 2
        : inflowModel.status === 'trained'
          ? inflowModel.confidence
          : outflowModel.status === 'trained'
            ? outflowModel.confidence
            : 0;
    const confidence = Number(
      (modelConfidence > 0
        ? Math.min(0.95, (structuralConfidence + modelConfidence) / 2)
        : structuralConfidence).toFixed(2),
    );

    const strongestMonth = [...timeline].sort((a, b) => b.netCashFlow - a.netCashFlow)[0];
    const weakestMonth = [...timeline].sort((a, b) => a.netCashFlow - b.netCashFlow)[0];

    return {
      openingCashEstimate,
      projectedEndingCash: Number(projectedEndingCash.toFixed(2)),
      netTrend,
      confidence,
      summary:
        `${inflowModel.status === 'trained' || outflowModel.status === 'trained' ? 'Internal ML cash-flow models trained on recent monthly series. ' : ''}` +
        `Projected ${horizonMonths}-month cash flow is ${netTrend}. ` +
        `Best month: ${strongestMonth?.period || 'n/a'} (${strongestMonth?.netCashFlow.toFixed(2) || '0.00'}). ` +
        `Most constrained month: ${weakestMonth?.period || 'n/a'} (${weakestMonth?.netCashFlow.toFixed(2) || '0.00'}).`,
      drivers,
      actions: actions.slice(0, 4),
      timeline,
      generatedAt: new Date().toISOString(),
    };
  }

  private sumByPeriod(rows: Array<{ period: string; amount: number }>): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.period, Number(((map.get(row.period) || 0) + row.amount).toFixed(2)));
    }
    return map;
  }

  private buildPeriods(count: number, offsetFromCurrent: number, currentPeriod: string): string[] {
    const [year, month] = currentPeriod.split('-').map((value) => Number(value));
    const base = new Date(Date.UTC(year, month - 1, 1));
    base.setUTCMonth(base.getUTCMonth() + offsetFromCurrent);

    const periods: string[] = [];
    for (let index = count - 1; index >= 0; index -= 1) {
      const cursor = new Date(base);
      cursor.setUTCMonth(base.getUTCMonth() - index);
      periods.push(cursor.toISOString().slice(0, 7));
    }
    return periods;
  }

  private buildFuturePeriods(count: number, currentPeriod: string): string[] {
    const [year, month] = currentPeriod.split('-').map((value) => Number(value));
    const base = new Date(Date.UTC(year, month - 1, 1));
    const periods: string[] = [];

    for (let index = 1; index <= count; index += 1) {
      const cursor = new Date(base);
      cursor.setUTCMonth(base.getUTCMonth() + index);
      periods.push(cursor.toISOString().slice(0, 7));
    }

    return periods;
  }

  private buildFallbackSeriesProjection(
    series: number[],
    horizon: number,
    averageValue: number,
    slope: number,
  ): number[] {
    if (!series.length) {
      return Array.from({ length: horizon }, () => 0);
    }

    return Array.from({ length: horizon }, (_, index) =>
      Number(Math.max(0, averageValue + slope * (index + 1) * 0.6).toFixed(2)),
    );
  }

  private average(values: number[]): number {
    const filtered = values.filter((value) => Number.isFinite(value));
    if (!filtered.length) return 0;
    return Number((filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(2));
  }

  private slope(values: number[]): number {
    if (values.length <= 1) return 0;
    return Number(((values[values.length - 1] - values[0]) / (values.length - 1)).toFixed(2));
  }

  private topExpenseCategory(expenses: Expense[]): { category: string; amount: number } | null {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      totals.set(
        expense.category,
        Number(((totals.get(expense.category) || 0) + Number(expense.amount)).toFixed(2)),
      );
    }

    const top = [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)[0];

    return top || null;
  }
}

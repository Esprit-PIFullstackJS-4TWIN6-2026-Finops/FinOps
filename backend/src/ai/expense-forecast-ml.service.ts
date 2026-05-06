import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { ForecastDto, ForecastPoint, ForecastResult } from './dto/finops-ai.dto';
import { trainDenseTimeSeriesRegressor } from './ml-time-series.util';

type ExpenseSnapshot = {
  amount: number;
  date: string;
};

@Injectable()
export class ExpenseForecastMlService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async generate(companyId: string, dto: ForecastDto): Promise<ForecastResult> {
    const historyMonths = dto.historyMonths ?? 12;
    const expenses = await this.loadExpenses(companyId, dto.expenses);
    const monthlySeries = this.buildMonthlySeries(expenses, historyMonths);
    const monthlyValues = monthlySeries.map((point) => point.total);
    const model = await trainDenseTimeSeriesRegressor(monthlyValues, {
      horizon: 3,
      requestedWindowSize: Math.min(4, Math.max(3, historyMonths - 1)),
      minimumWindowSize: 3,
      epochs: 55,
    });

    const predictedValues =
      model.status === 'trained'
        ? model.predictedValues
        : this.buildFallbackProjection(monthlyValues, 3);
    const timeline = this.buildTimeline(
      monthlySeries.at(-1)?.month ?? new Date().toISOString().slice(0, 7),
      predictedValues,
    );
    const nextMonthExpense = Number((timeline[0]?.predictedExpense ?? 0).toFixed(2));
    const next3MonthsTotal = Number(
      timeline.reduce((sum, point) => sum + point.predictedExpense, 0).toFixed(2),
    );

    return {
      nextMonthExpense,
      next3MonthsTotal,
      growthTrend: this.detectTrend(predictedValues, monthlyValues.at(-1) ?? 0),
      confidence:
        model.status === 'trained'
          ? model.confidence
          : Number(Math.max(0.25, Math.min(0.45, monthlyValues.length * 0.08)).toFixed(2)),
      timeline,
      generatedAt: new Date().toISOString(),
    };
  }

  private async loadExpenses(companyId: string, override?: ForecastDto['expenses']): Promise<ExpenseSnapshot[]> {
    if (override?.length) {
      return override.map((expense) => ({
        amount: Number(expense.amount),
        date: expense.date,
      }));
    }

    const rows = await this.expenseRepo.find({
      where: { companyId },
      order: { expenseDate: 'ASC' },
    });

    return rows.map((expense) => ({
      amount: Number(expense.amount),
      date: expense.expenseDate,
    }));
  }

  private buildMonthlySeries(
    expenses: ExpenseSnapshot[],
    historyMonths: number,
  ): Array<{ month: string; total: number }> {
    if (!expenses.length) return [];

    const byMonth = new Map<string, number>();
    for (const expense of expenses) {
      const month = expense.date.slice(0, 7);
      byMonth.set(month, Number(((byMonth.get(month) || 0) + expense.amount).toFixed(2)));
    }

    const anchorMonth = [...byMonth.keys()].sort().at(-1)!;
    const months = this.buildPreviousMonths(anchorMonth, historyMonths);

    return months.map((month) => ({
      month,
      total: Number((byMonth.get(month) || 0).toFixed(2)),
    }));
  }

  private buildPreviousMonths(anchorMonth: string, count: number): string[] {
    const [year, month] = anchorMonth.split('-').map((value) => Number(value));
    const anchorDate = new Date(Date.UTC(year, month - 1, 1));
    const months: string[] = [];

    for (let index = count - 1; index >= 0; index -= 1) {
      const cursor = new Date(anchorDate);
      cursor.setUTCMonth(anchorDate.getUTCMonth() - index);
      months.push(cursor.toISOString().slice(0, 7));
    }

    return months;
  }

  private buildTimeline(lastObservedMonth: string, predictedValues: number[]): ForecastPoint[] {
    const [year, month] = lastObservedMonth.split('-').map((value) => Number(value));
    const base = new Date(Date.UTC(year, month - 1, 1));

    return predictedValues.map((predictedExpense, index) => {
      const cursor = new Date(base);
      cursor.setUTCMonth(base.getUTCMonth() + index + 1);
      return {
        period: cursor.toISOString().slice(0, 7),
        predictedExpense: Number(Math.max(0, predictedExpense).toFixed(2)),
      };
    });
  }

  private buildFallbackProjection(monthlyValues: number[], horizon: number): number[] {
    if (!monthlyValues.length) {
      return Array.from({ length: horizon }, () => 0);
    }

    const trailing = monthlyValues.slice(-Math.min(3, monthlyValues.length));
    const average = trailing.reduce((sum, value) => sum + value, 0) / trailing.length;
    const slope =
      trailing.length > 1 ? (trailing[trailing.length - 1] - trailing[0]) / (trailing.length - 1) : 0;

    return Array.from({ length: horizon }, (_, index) =>
      Number(Math.max(0, average + slope * (index + 1)).toFixed(2)),
    );
  }

  private detectTrend(
    predictedValues: number[],
    lastObserved: number,
  ): ForecastResult['growthTrend'] {
    if (!predictedValues.length) return 'stable';

    const start = predictedValues[0];
    const end = predictedValues[predictedValues.length - 1];
    const baseline = Math.max(1, lastObserved || start || 1);
    const delta = (end - start) / baseline;

    if (delta > 0.05) return 'increasing';
    if (delta < -0.05) return 'decreasing';
    return 'stable';
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { Expense } from '../entities/expense.entity';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { User } from '../entities/user.entity';
import { requireActiveCompanyId } from '../common/utils/active-company.util';

export type DashboardMonthlyPoint = {
  period: string;
  revenue: number;
  expenses: number;
};

export type DashboardSummaryDto = {
  invoicedTotal: number;
  paidTotal: number;
  outstandingTotal: number;
  expenseTotal: number;
  netPaidMinusExpenses: number;
  invoiceCount: number;
  expenseCount: number;
  clientCount: number;
  monthly: DashboardMonthlyPoint[];
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(InvoiceRecord)
    private readonly invoiceRepo: Repository<InvoiceRecord>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async getSummary(user: User): Promise<DashboardSummaryDto> {
    const companyId = requireActiveCompanyId(user);

    const amt = (v: string | number | null | undefined): number => {
      if (v === null || v === undefined) return 0;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : 0;
    };

    const invoices = await this.invoiceRepo.find({
      where: { companyId },
      select: ['id', 'date', 'total', 'status'],
    });

    let invoicedTotal = 0;
    let paidTotal = 0;
    let outstandingTotal = 0;
    const revByPeriod = new Map<string, number>();

    for (const inv of invoices) {
      const t = amt(inv.total);
      if (inv.status === 'Draft') continue;
      invoicedTotal += t;
      if (inv.status === 'Paid') paidTotal += t;
      else if (inv.status === 'Sent' || inv.status === 'Overdue') outstandingTotal += t;
      const period = (inv.date || '').slice(0, 7);
      if (period.length === 7) {
        revByPeriod.set(period, (revByPeriod.get(period) ?? 0) + t);
      }
    }

    const expenses = await this.expenseRepo.find({
      where: { companyId },
      select: ['amount', 'expenseDate'],
    });

    let expenseTotal = 0;
    const expByPeriod = new Map<string, number>();
    for (const e of expenses) {
      const a = amt(e.amount);
      expenseTotal += a;
      const period = (e.expenseDate || '').slice(0, 7);
      if (period.length === 7) {
        expByPeriod.set(period, (expByPeriod.get(period) ?? 0) + a);
      }
    }

    const clientCount = await this.clientRepo.count({ where: { companyId } });

    const allPeriods = new Set([...revByPeriod.keys(), ...expByPeriod.keys()]);
    const sorted = [...allPeriods].sort();
    const last6 = sorted.slice(-6);

    const monthly: DashboardMonthlyPoint[] = last6.map((period) => ({
      period,
      revenue: revByPeriod.get(period) ?? 0,
      expenses: expByPeriod.get(period) ?? 0,
    }));

    return {
      invoicedTotal,
      paidTotal,
      outstandingTotal,
      expenseTotal,
      netPaidMinusExpenses: paidTotal - expenseTotal,
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
      clientCount,
      monthly,
    };
  }
}

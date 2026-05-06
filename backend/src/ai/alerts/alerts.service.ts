import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Expense } from '../../entities/expense.entity';
import { AlertRequestDto } from './dto/alert-request.dto';
import { AlertResponseDto } from './dto/alert-response.dto';

interface ExpenseAlert extends AlertResponseDto {
  amount: number;
  category: string;
  vendor?: string;
  expenseDate: string;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async getAlerts(request: AlertRequestDto): Promise<ExpenseAlert[]> {
    const { companyId, category } = request;

    // Récupérer les dépenses des 6 derniers mois pour établir une baseline
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const whereCondition: any = {
      companyId,
      expenseDate: MoreThanOrEqual(sixMonthsAgo.toISOString().split('T')[0]),
    };

    if (category) {
      whereCondition.category = category;
    }

    const expenses = await this.expenseRepository.find({
      where: whereCondition,
      order: { expenseDate: 'DESC' },
    });

    if (expenses.length === 0) {
      return []; // Aucune dépense
    }

    // Séparer les données historiques (avant le dernier mois) des données récentes
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const historicalExpenses = expenses.filter(
      (expense) => new Date(expense.expenseDate) < oneMonthAgo,
    );

    const recentExpenses = expenses.filter(
      (expense) => new Date(expense.expenseDate) >= oneMonthAgo,
    );

    // Calculer les statistiques de base par catégorie sur les données historiques
    const categoryStats = this.calculateCategoryStats(historicalExpenses);

    // Analyser chaque dépense récente pour détecter des anomalies
    const alerts: ExpenseAlert[] = [];

    recentExpenses.forEach((expense) => {
      const expenseAlerts = this.analyzeExpense(expense, categoryStats, historicalExpenses, recentExpenses);
      alerts.push(...expenseAlerts);
    });

    // Supprimer les doublons (même dépense, plusieurs règles)
    const uniqueAlerts = this.deduplicateAlerts(alerts);

    // Trier par niveau d'alerte (critical > high > medium > low)
    return uniqueAlerts.sort((a, b) => {
      const levels = { critical: 4, high: 3, medium: 2, low: 1 };
      return levels[b.alertLevel] - levels[a.alertLevel];
    });
  }

  private calculateCategoryStats(expenses: Expense[]): Map<string, { avgAmount: number; count: number; vendors: Set<string> }> {
    const categoryData = new Map<string, { amounts: number[]; vendors: Set<string> }>();

    expenses.forEach((expense) => {
      const absAmount = Math.abs(Number(expense.amount));
      const category = expense.category;
      const vendor = expense.vendor || 'Unknown';

      if (!categoryData.has(category)) {
        categoryData.set(category, { amounts: [], vendors: new Set() });
      }

      const data = categoryData.get(category)!;
      data.amounts.push(absAmount);
      data.vendors.add(vendor);
    });

    const stats = new Map<string, { avgAmount: number; count: number; vendors: Set<string> }>();

    categoryData.forEach((data, category) => {
      const avgAmount = data.amounts.reduce((sum, val) => sum + val, 0) / data.amounts.length;
      stats.set(category, {
        avgAmount,
        count: data.amounts.length,
        vendors: data.vendors,
      });
    });

    return stats;
  }

  private analyzeExpense(
    expense: Expense,
    categoryStats: Map<string, { avgAmount: number; count: number; vendors: Set<string> }>,
    historicalExpenses: Expense[],
    recentExpenses: Expense[],
  ): ExpenseAlert[] {
    const alerts: ExpenseAlert[] = [];
    const absAmount = Math.abs(Number(expense.amount));
    const category = expense.category;
    const vendor = expense.vendor;
    const expenseDate = expense.expenseDate;

    const stats = categoryStats.get(category);

    // RULE 1 — HIGH AMOUNT ANOMALY
    if (stats && stats.count >= 1) {
      const avgAmount = stats.avgAmount;
      if (absAmount > avgAmount * 2.5) {
        alerts.push({
          expenseId: expense.id,
          alertLevel: 'high',
          riskScore: Math.min(90, 60 + (absAmount / avgAmount - 2.5) * 10),
          reason: `Montant élevé détecté: ${absAmount.toFixed(2)}€ (${(absAmount / avgAmount).toFixed(1)}x la moyenne de la catégorie '${category}')`,
          recommendation: 'Vérifiez la légitimité de cette dépense. Considérez une approbation supplémentaire.',
          amount: absAmount,
          category,
          vendor,
          expenseDate,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // RULE 2 — EXTREME EXPENSE (threshold-based, works even without history)
    if (absAmount >= 1000) {
      const existingAlert = alerts.find(a => a.expenseId === expense.id && a.alertLevel === 'critical');
      if (!existingAlert) {
        alerts.push({
          expenseId: expense.id,
          alertLevel: 'critical',
          riskScore: Math.min(100, 80 + (absAmount - 1000) / 100),
          reason: `Dépense extrême détectée: ${absAmount.toFixed(2)}€ dépasse le seuil d'urgence de 1000€`,
          recommendation: 'Révision immédiate requise. Contactez le responsable pour validation.',
          amount: absAmount,
          category,
          vendor,
          expenseDate,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // RULE 3 — CATEGORY SPIKE
    if (stats && stats.count >= 3) {
      // Calculer la moyenne des 3 derniers mois de dépenses récentes dans cette catégorie
      const recentCategoryExpenses = recentExpenses
        .filter(e => e.category === category)
        .map(e => Math.abs(Number(e.amount)));

      if (recentCategoryExpenses.length >= 2) {
        const recentAvg = recentCategoryExpenses.reduce((sum, val) => sum + val, 0) / recentCategoryExpenses.length;
        if (recentAvg > stats.avgAmount * 2) {
          alerts.push({
            expenseId: expense.id,
            alertLevel: 'medium',
            riskScore: 70,
            reason: `Pic de catégorie détecté: dépenses récentes dans '${category}' sont ${(recentAvg / stats.avgAmount).toFixed(1)}x plus élevées que la moyenne historique`,
            recommendation: 'Surveillez les dépenses de cette catégorie. Vérifiez les changements budgétaires.',
            amount: absAmount,
            category,
            vendor,
            expenseDate,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    // RULE 4 — RAPID SUCCESSIVE LARGE EXPENSES
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const recentLargeExpenses = recentExpenses.filter(e =>
      new Date(e.expenseDate) >= twoDaysAgo &&
      Math.abs(Number(e.amount)) >= 500 // seuil pour "large"
    );

    if (recentLargeExpenses.length >= 3) {
      alerts.push({
        expenseId: expense.id,
        alertLevel: 'high',
        riskScore: 85,
        reason: `${recentLargeExpenses.length} grandes dépenses détectées en 48h (≥500€ chacune)`,
        recommendation: 'Série de dépenses importantes détectée. Vérifiez les autorisations et la trésorerie.',
        amount: absAmount,
        category,
        vendor,
        expenseDate,
        detectedAt: new Date().toISOString(),
      });
    }

    // RULE 5 — FIRST-TIME LARGE VENDOR EXPENSE
    if (stats && absAmount >= 300) {
      const isNewVendor = vendor && !stats.vendors.has(vendor);
      if (isNewVendor) {
        alerts.push({
          expenseId: expense.id,
          alertLevel: 'medium',
          riskScore: 65,
          reason: `Nouveau fournisseur détecté: '${vendor}' avec un montant élevé de ${absAmount.toFixed(2)}€`,
          recommendation: 'Vérifiez la légitimité du nouveau fournisseur. Confirmez les termes contractuels.',
          amount: absAmount,
          category,
          vendor,
          expenseDate,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Fallback: simple threshold alert if no other rules triggered and amount is significant
    if (alerts.length === 0 && absAmount >= 200 && (!stats || stats.count < 3)) {
      alerts.push({
        expenseId: expense.id,
        alertLevel: 'low',
        riskScore: 40,
        reason: `Dépense notable détectée: ${absAmount.toFixed(2)}€ (données historiques limitées)`,
        recommendation: 'Surveillez cette dépense. Établissez des seuils budgétaires pour cette catégorie.',
        amount: absAmount,
        category,
        vendor,
        expenseDate,
        detectedAt: new Date().toISOString(),
      });
    }

    return alerts;
  }

  private deduplicateAlerts(alerts: ExpenseAlert[]): ExpenseAlert[] {
    const seen = new Set<string>();
    return alerts.filter(alert => {
      const key = `${alert.expenseId}-${alert.alertLevel}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
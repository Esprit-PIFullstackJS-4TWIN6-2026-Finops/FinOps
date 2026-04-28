import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Expense } from '../../entities/expense.entity';
import { ForecastRequestDto } from './dto/forecast-request.dto';
import { ForecastResponseDto } from './dto/forecast-response.dto';

@Injectable()
export class ForecastingService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async generateForecast(request: ForecastRequestDto): Promise<ForecastResponseDto> {
    const { companyId, category, periodMonths = 3 } = request;

    // Récupérer l'historique des 12 derniers mois
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const whereCondition: any = {
      companyId,
      expenseDate: MoreThanOrEqual(twelveMonthsAgo.toISOString().split('T')[0]), // Format YYYY-MM-DD
    };

    if (category) {
      whereCondition.category = category;
    }

    const expenses = await this.expenseRepository.find({
      where: whereCondition,
      order: { expenseDate: 'ASC' },
    });

    if (expenses.length < 3) {
      // Pas assez de données pour une prédiction fiable
      return {
        companyId,
        category,
        predictedAmount: 0,
        confidenceScore: 0,
        trend: 'stable',
        explanation: 'Insufficient historical data for forecasting (need at least 3 months of expenses)',
        generatedAt: new Date().toISOString(),
      };
    }

    // Calculer les totaux mensuels
    const monthlyTotals = this.calculateMonthlyTotals(expenses);

    // Calculer la tendance et prédiction
    const { predictedAmount, trend, confidenceScore, explanation } = this.calculatePrediction(
      monthlyTotals,
      periodMonths,
    );

    return {
      companyId,
      category,
      predictedAmount,
      confidenceScore,
      trend,
      explanation,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateMonthlyTotals(expenses: Expense[]): Map<string, number> {
    const monthlyTotals = new Map<string, number>();

    expenses.forEach((expense) => {
      const monthKey = expense.expenseDate.substring(0, 7); // YYYY-MM
      const current = monthlyTotals.get(monthKey) || 0;
      monthlyTotals.set(monthKey, current + Number(expense.amount));
    });

    return monthlyTotals;
  }

  private calculatePrediction(
    monthlyTotals: Map<string, number>,
    periodMonths: number,
  ): { predictedAmount: number; trend: 'increasing' | 'stable' | 'decreasing'; confidenceScore: number; explanation: string } {
    const sortedMonths = Array.from(monthlyTotals.keys()).sort();
    const amounts = sortedMonths.map((month) => monthlyTotals.get(month)!);

    if (amounts.length < 2) {
      return {
        predictedAmount: amounts[0] || 0,
        trend: 'stable',
        confidenceScore: 20,
        explanation: 'Limited data available',
      };
    }

    // Calcul de tendance linéaire simple
    const n = amounts.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = amounts.reduce((sum, val) => sum + val, 0);
    const sumXY = amounts.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Prédiction pour les prochains mois
    const lastMonthIndex = n - 1;
    let predictedAmount = 0;
    for (let i = 1; i <= periodMonths; i++) {
      const futureIndex = lastMonthIndex + i;
      predictedAmount += slope * futureIndex + intercept;
    }

    // Déterminer la tendance
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (slope > amounts[n - 1] * 0.05) { // Augmentation > 5%
      trend = 'increasing';
    } else if (slope < -amounts[n - 1] * 0.05) { // Diminution > 5%
      trend = 'decreasing';
    }

    // Score de confiance basé sur la variance et le nombre de points
    const mean = sumY / n;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient de variation
    const confidenceScore = Math.max(0, Math.min(100, 100 - cv * 100)); // Plus la variance est faible, plus la confiance est haute

    // Ajuster la confiance basée sur le nombre de points de données
    const dataConfidence = Math.min(100, n * 10); // 10 points = 100% confiance de données
    const finalConfidence = Math.round((confidenceScore + dataConfidence) / 2);

    const explanation = `Based on ${n} months of historical data. ${
      trend === 'increasing' ? 'Expenses are trending upward' :
      trend === 'decreasing' ? 'Expenses are trending downward' :
      'Expenses are relatively stable'
    }. Prediction for next ${periodMonths} months: $${predictedAmount.toFixed(2)}.`;

    return {
      predictedAmount: Math.max(0, predictedAmount), // Pas de prédictions négatives
      trend,
      confidenceScore: finalConfidence,
      explanation,
    };
  }
}
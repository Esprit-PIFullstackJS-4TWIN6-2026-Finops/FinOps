export interface AlertResponseDto {
  expenseId: string;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // Score de risque (0-100)
  reason: string; // Raison de l'alerte
  recommendation: string; // Recommandation d'action
  amount: number;
  category: string;
  vendor?: string;
  expenseDate: string;
  detectedAt: string; // Timestamp ISO
}
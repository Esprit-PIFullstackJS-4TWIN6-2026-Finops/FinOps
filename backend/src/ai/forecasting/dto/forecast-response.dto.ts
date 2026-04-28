export interface ForecastResponseDto {
  companyId: string;
  category?: string;
  predictedAmount: number; // Montant prédit pour la période
  confidenceScore: number; // Score de confiance (0-100)
  trend: 'increasing' | 'stable' | 'decreasing';
  explanation: string; // Explication textuelle de la prédiction
  generatedAt: string; // Timestamp ISO
}
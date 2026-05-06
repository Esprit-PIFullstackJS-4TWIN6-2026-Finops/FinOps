import { IsOptional, IsString, IsUUID, IsInt, Min, Max } from 'class-validator';

export class ForecastRequestDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsString()
  category?: string; // Optionnel : forecasting pour une catégorie spécifique ou toutes

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonths?: number = 3; // Période de prédiction (1-12 mois)
}
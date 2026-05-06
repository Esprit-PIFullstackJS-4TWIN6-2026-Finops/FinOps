import { IsOptional, IsUUID, IsString } from 'class-validator';

export class AlertRequestDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsString()
  category?: string; // Optionnel : analyser pour une catégorie spécifique
}
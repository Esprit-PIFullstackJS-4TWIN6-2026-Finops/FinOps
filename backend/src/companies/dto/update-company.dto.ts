import { IsOptional, IsString, IsNumber, Min, Max, MinLength, MaxLength, Matches, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { CompanyCategory } from '../../entities/company.entity';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom de l\'entreprise doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom de l\'entreprise ne doit pas dépasser 100 caractères' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsEnum(CompanyCategory, { message: 'Catégorie invalide' })
  category?: CompanyCategory;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString({ message: 'La matricule fiscale doit être une chaîne de caractères' })
  @MinLength(3, { message: 'La matricule fiscale doit contenir au moins 3 caractères' })
  @MaxLength(50, { message: 'La matricule fiscale ne doit pas dépasser 50 caractères' })
  @Transform(({ value }) => value?.trim())
  matriculeFiscal?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Le taux de TVA doit être un nombre' })
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100%' })
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Le code devise ne doit pas dépasser 10 caractères' })
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'L\'adresse ne doit pas dépasser 255 caractères' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9\s\-\(\)]{6,20}$/, { message: 'Numéro de téléphone invalide' })
  @Transform(({ value }) => value?.trim())
  phone?: string;
}

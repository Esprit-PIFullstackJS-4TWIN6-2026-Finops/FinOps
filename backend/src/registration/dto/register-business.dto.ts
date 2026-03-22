import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CompanyCategory } from '../../entities/company.entity';

export class RegisterBusinessDto {
  @IsString({ message: 'Le nom de l\'entreprise doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom de l\'entreprise est obligatoire' })
  @MinLength(2, { message: 'Le nom de l\'entreprise doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom de l\'entreprise ne doit pas dépasser 100 caractères' })
  @Transform(({ value }) => value?.trim())
  companyName: string;

  @IsEnum(CompanyCategory, {
    message: `Catégorie invalide. Valeurs autorisées : ${Object.values(CompanyCategory).join(', ')}`,
  })
  companyCategory: CompanyCategory;

  @IsEmail({}, { message: 'Veuillez fournir un email valide (ex: nom@entreprise.com)' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  @MaxLength(255, { message: 'L\'email ne doit pas dépasser 255 caractères' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'Le nom du propriétaire doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du propriétaire est obligatoire' })
  @MinLength(2, { message: 'Le nom du propriétaire doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom du propriétaire ne doit pas dépasser 100 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, { message: 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes' })
  @Transform(({ value }) => value?.trim())
  ownerName: string;

  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @IsOptional()
  @Matches(/^[\+]?[0-9\s\-\(\)]{6,20}$/, { message: 'Numéro de téléphone invalide (ex: +216 XX XXX XXX)' })
  @Transform(({ value }) => value?.trim())
  phone?: string;
}

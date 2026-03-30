import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CompanyCategory } from '../../entities/company.entity';

export class CreateCompanyDto {
  @IsString({ message: 'Le nom doit etre une chaine de caracteres' })
  @IsNotEmpty({ message: "Le nom de l'entreprise est obligatoire" })
  @MinLength(2, {
    message: "Le nom de l'entreprise doit contenir au moins 2 caracteres",
  })
  @MaxLength(100, {
    message: "Le nom de l'entreprise ne doit pas depasser 100 caracteres",
  })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEnum(CompanyCategory, { message: 'Categorie invalide' })
  category: CompanyCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "L'adresse ne doit pas depasser 255 caracteres" })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code devise ne doit pas depasser 20 caracteres' })
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  currency?: string;
}

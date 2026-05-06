import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../entities/user.entity';

const EMPLOYEE_REQUEST_ROLES = [
  UserRole.MANAGER,
  UserRole.EMPLOYEE,
  UserRole.ACCOUNTANT,
] as const;

export class RequestEmployeeAccessDto {
  @IsString({ message: 'Le nom complet doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom complet est obligatoire' })
  @MinLength(2, { message: 'Le nom complet doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom complet ne doit pas dépasser 100 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsEmail(
    {},
    { message: 'Veuillez fournir un email valide (ex: nom@entreprise.com)' },
  )
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @MaxLength(255, { message: "L'email ne doit pas dépasser 255 caractères" })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: "Le nom de l'entreprise doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "Le nom de l'entreprise est obligatoire" })
  @MinLength(2, {
    message: "Le nom de l'entreprise doit contenir au moins 2 caractères",
  })
  @MaxLength(100, {
    message: "Le nom de l'entreprise ne doit pas dépasser 100 caractères",
  })
  @Transform(({ value }) => value?.trim())
  companyName: string;

  @IsEnum(EMPLOYEE_REQUEST_ROLES, {
    message:
      'Rôle demandé invalide. Valeurs autorisées : manager, employee, accountant',
  })
  desiredRole: (typeof EMPLOYEE_REQUEST_ROLES)[number];
}

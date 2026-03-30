import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../entities/user.entity';

const EMPLOYEE_ROLES = [
  UserRole.MANAGER,
  UserRole.EMPLOYEE,
  UserRole.ACCOUNTANT,
] as const;

export class CreateEmployeeDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide (ex: nom@entreprise.com)' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  @MaxLength(255, { message: 'L\'email ne doit pas dépasser 255 caractères' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom de l\'employé est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom ne doit pas dépasser 100 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, { message: 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEnum(EMPLOYEE_ROLES, {
    message: 'Rôle invalide. Valeurs autorisées : manager, employee, accountant',
  })
  role: (typeof EMPLOYEE_ROLES)[number];
}

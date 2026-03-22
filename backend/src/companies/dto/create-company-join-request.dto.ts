import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

const JOIN_REQUEST_ROLES = [
  UserRole.MANAGER,
  UserRole.EMPLOYEE,
  UserRole.ACCOUNTANT,
] as const;

export class CreateCompanyJoinRequestDto {
  @IsString()
  @IsNotEmpty({ message: "L'entreprise est obligatoire" })
  companyId: string;

  @IsEnum(JOIN_REQUEST_ROLES, {
    message: 'Rôle invalide. Valeurs autorisées : manager, employee, accountant',
  })
  desiredRole: (typeof JOIN_REQUEST_ROLES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Le détail de profil ne doit pas dépasser 1000 caractères',
  })
  profileDetails?: string;
}

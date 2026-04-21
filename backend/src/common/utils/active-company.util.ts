import { ForbiddenException } from '@nestjs/common';
import { User } from '../../entities/user.entity';

export function requireActiveCompanyId(user: User): string {
  const id = user.activeCompanyId || user.companyId;
  if (!id) {
    throw new ForbiddenException('Aucune entreprise active');
  }
  return id;
}

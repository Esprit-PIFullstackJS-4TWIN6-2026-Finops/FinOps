import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Unauthorized tenant context');
    }

    const routeCompanyId = req.params?.companyId || req.body?.companyId;
    if (!routeCompanyId) {
      return true;
    }

    if (user.role === 'platform_admin') {
      return true;
    }

    if (user.companyId && user.companyId === routeCompanyId) {
      return true;
    }

    throw new ForbiddenException('Tenant access denied');
  }
}

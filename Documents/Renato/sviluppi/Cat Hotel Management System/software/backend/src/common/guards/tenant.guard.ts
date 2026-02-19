import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RoleType, GLOBAL_ROLES } from '../constants/roles.constant';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.params.tenantId || request.query.tenantId || request.tenant?.id;

    if (!user) {
      throw new ForbiddenException('Utente non autenticato');
    }

    if (GLOBAL_ROLES.includes(user.role as RoleType)) {
      return true;
    }

    if (!tenantId) {
      return true;
    }

    const userTenantIds = user.tenantIds || [];
    if (!userTenantIds.includes(tenantId)) {
      throw new ForbiddenException('Non hai accesso a questo tenant');
    }

    return true;
  }
}

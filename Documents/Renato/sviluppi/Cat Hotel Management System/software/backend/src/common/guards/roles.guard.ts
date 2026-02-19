import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleType, ROLE_HIERARCHY } from '../constants/roles.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Ruolo utente non disponibile');
    }

    const userRoleHierarchy = ROLE_HIERARCHY[user.role as RoleType] || 0;

    const hasRole = requiredRoles.some((role) => {
      const requiredHierarchy = ROLE_HIERARCHY[role] || 0;
      return userRoleHierarchy >= requiredHierarchy;
    });

    if (!hasRole) {
      throw new ForbiddenException('Permessi insufficienti per questa operazione');
    }

    return true;
  }
}

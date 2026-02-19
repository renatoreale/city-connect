import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export const AUDIT_CONTEXT_KEY = '__auditContext';

export interface AuditContext {
  userId: string;
  userRole: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const auditContext: AuditContext = {
      userId: request.user?.id || 'system',
      userRole: request.user?.role || 'system',
      tenantId: request.tenant?.id || request.user?.currentTenantId,
      ipAddress: this.getIpAddress(request),
      userAgent: request.headers['user-agent'] || '',
    };

    request[AUDIT_CONTEXT_KEY] = auditContext;

    return next.handle();
  }

  private getIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      ''
    );
  }
}

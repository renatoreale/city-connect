import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { AUDIT_CONTEXT_KEY, AuditContext } from '../../common/interceptors/audit.interceptor';

@Injectable({ scope: Scope.REQUEST })
export class AuditContextService {
  constructor(@Inject(REQUEST) private request: Request) {}

  private get context(): AuditContext {
    return (this.request as any)[AUDIT_CONTEXT_KEY] || {
      userId: 'system',
      userRole: 'system',
    };
  }

  getContext(): AuditContext {
    return this.context;
  }

  getUserId(): string {
    return this.context.userId;
  }

  getUserRole(): string {
    return this.context.userRole;
  }

  getTenantId(): string | undefined {
    return this.context.tenantId;
  }

  getIpAddress(): string | undefined {
    return this.context.ipAddress;
  }

  getUserAgent(): string | undefined {
    return this.context.userAgent;
  }
}

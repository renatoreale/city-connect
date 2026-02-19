import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
      };
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerTenantId = req.headers['x-tenant-id'];
    let tenantId: string | undefined;

    if (Array.isArray(headerTenantId)) {
      tenantId = headerTenantId[0];
    } else if (typeof headerTenantId === 'string') {
      tenantId = headerTenantId;
    } else if (typeof req.query.tenantId === 'string') {
      tenantId = req.query.tenantId;
    } else if (typeof req.params.tenantId === 'string') {
      tenantId = req.params.tenantId;
    }

    if (tenantId) {
      req.tenant = { id: tenantId };
    }

    next();
  }
}

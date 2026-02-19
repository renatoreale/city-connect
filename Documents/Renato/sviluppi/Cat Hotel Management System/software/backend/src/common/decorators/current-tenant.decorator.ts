import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (data) {
      return tenant?.[data];
    }

    // Restituisce l'ID del tenant se disponibile
    return tenant?.id || tenant;
  },
);

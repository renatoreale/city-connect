import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType, GLOBAL_ROLES } from '../../common/constants/roles.constant';
import { AuditOperation } from './entities/audit-log.entity';

@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ─── Query e storia ────────────────────────────────────────────────

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async query(
    @CurrentUser() currentUser: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('operation') operation?: AuditOperation,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (!GLOBAL_ROLES.includes(currentUser.role)) {
      if (tenantId && !currentUser.tenantIds?.includes(tenantId)) {
        throw new ForbiddenException('Non hai accesso a questo tenant');
      }
      if (!tenantId && currentUser.tenantIds?.length > 0) {
        tenantId = currentUser.tenantIds[0];
      }
    }

    return this.auditService.query({
      entityType,
      entityId,
      operation,
      tenantId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('entity/:type/:id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getEntityHistory(
    @Param('type') entityType: string,
    @Param('id', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }

  @Get('recent')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async getRecentLogs(
    @CurrentUser() currentUser: any,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!GLOBAL_ROLES.includes(currentUser.role)) {
      if (tenantId && !currentUser.tenantIds?.includes(tenantId)) {
        throw new ForbiddenException('Non hai accesso a questo tenant');
      }
      tenantId = tenantId || currentUser.tenantIds?.[0];
    }

    return this.auditService.getRecentLogs(
      tenantId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('user/:userId')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async getUserActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getUserActivity(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ─── Block 12: Confronto versioni ─────────────────────────────────

  /**
   * Restituisce il diff strutturato di una singola voce di audit
   * (stato prima → dopo la modifica).
   *
   * GET /api/v1/audit/:logId/diff
   */
  @Get(':logId/diff')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getDiff(
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() currentUser: any,
  ) {
    const tenantId = GLOBAL_ROLES.includes(currentUser.role)
      ? undefined
      : currentUser.tenantIds?.[0];

    return this.auditService.getDiff(logId, tenantId);
  }

  /**
   * Confronta due voci di audit arbitrarie per la stessa entità,
   * mostrando le differenze di stato tra i due momenti.
   *
   * GET /api/v1/audit/compare?fromLog=:logId1&toLog=:logId2
   */
  @Get('compare')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async compareVersions(
    @Query('fromLog') fromLog: string,
    @Query('toLog') toLog: string,
    @CurrentUser() currentUser: any,
  ) {
    if (!fromLog || !toLog) {
      throw new BadRequestException('I parametri "fromLog" e "toLog" sono obbligatori.');
    }

    const tenantId = GLOBAL_ROLES.includes(currentUser.role)
      ? undefined
      : currentUser.tenantIds?.[0];

    return this.auditService.compareVersions(fromLog, toLog, tenantId);
  }

  // ─── Block 12: Ripristino versione precedente ─────────────────────

  /**
   * Ripristina un'entità allo stato precedente a una specifica modifica (UPDATE).
   * Vengono ripristinati solo i campi effettivamente modificati in quell'operazione,
   * escludendo campi di sistema (id, tenantId, createdAt, updatedAt, ecc.).
   *
   * Accessibile solo ad Admin e Titolare.
   *
   * POST /api/v1/audit/:logId/restore
   */
  @Post(':logId/restore')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async restoreVersion(
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() currentUser: any,
  ) {
    // I ruoli globali (Admin, CEO) non hanno un singolo tenant — richiedono tenantId esplicito
    // Per Admin operiamo senza filtro tenant; per Titolare usiamo il suo tenant
    const tenantId = GLOBAL_ROLES.includes(currentUser.role)
      ? currentUser.tenantIds?.[0] // Admin deve avere almeno un tenant nel contesto
      : currentUser.tenantIds?.[0];

    if (!tenantId) {
      throw new BadRequestException(
        'Impossibile determinare il tenant per il ripristino. ' +
        'Assicurati di inviare l\'header x-tenant-id.',
      );
    }

    return this.auditService.restoreVersion(logId, tenantId, currentUser.id);
  }
}

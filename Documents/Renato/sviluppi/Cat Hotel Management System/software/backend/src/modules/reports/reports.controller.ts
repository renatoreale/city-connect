import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType, GLOBAL_ROLES } from '../../common/constants/roles.constant';

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Risolve il tenantId effettivo in base al ruolo:
   * - Ruoli globali (ADMIN, CEO): devono passare ?tenantId=
   * - Ruoli tenant (TITOLARE, MANAGER): usano il proprio tenant
   */
  private resolveTenantId(currentUser: any, queryTenantId?: string): string {
    if (GLOBAL_ROLES.includes(currentUser.role)) {
      if (!queryTenantId) {
        throw new BadRequestException(
          'I ruoli globali devono specificare il parametro "tenantId".',
        );
      }
      return queryTenantId;
    }

    if (queryTenantId && !currentUser.tenantIds?.includes(queryTenantId)) {
      throw new ForbiddenException('Non hai accesso a questo tenant.');
    }

    const resolved = queryTenantId || currentUser.tenantIds?.[0];
    if (!resolved) {
      throw new BadRequestException('Impossibile determinare il tenant corrente.');
    }
    return resolved;
  }

  /**
   * GET /api/v1/reports/overview
   * KPI del giorno corrente + mese corrente.
   */
  @Get('overview')
  async getOverview(
    @CurrentUser() currentUser: any,
    @Query('tenantId') tenantId?: string,
  ) {
    const resolvedTenantId = this.resolveTenantId(currentUser, tenantId);
    return this.reportsService.getOverview(resolvedTenantId);
  }

  /**
   * GET /api/v1/reports/occupancy?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Occupazione giornaliera (gatti ospitati per giorno).
   */
  @Get('occupancy')
  async getOccupancy(
    @CurrentUser() currentUser: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('tenantId') tenantId?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('I parametri "from" e "to" sono obbligatori (YYYY-MM-DD).');
    }
    const resolvedTenantId = this.resolveTenantId(currentUser, tenantId);
    return this.reportsService.getOccupancy(resolvedTenantId, from, to);
  }

  /**
   * GET /api/v1/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Entrate per tipo di pagamento e andamento mensile.
   */
  @Get('revenue')
  async getRevenue(
    @CurrentUser() currentUser: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('tenantId') tenantId?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('I parametri "from" e "to" sono obbligatori (YYYY-MM-DD).');
    }
    const resolvedTenantId = this.resolveTenantId(currentUser, tenantId);
    return this.reportsService.getRevenue(resolvedTenantId, from, to);
  }

  /**
   * GET /api/v1/reports/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Statistiche prenotazioni: per stato, trend mensile, medie.
   */
  @Get('bookings')
  async getBookings(
    @CurrentUser() currentUser: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('tenantId') tenantId?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('I parametri "from" e "to" sono obbligatori (YYYY-MM-DD).');
    }
    const resolvedTenantId = this.resolveTenantId(currentUser, tenantId);
    return this.reportsService.getBookings(resolvedTenantId, from, to);
  }

  /**
   * GET /api/v1/reports/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Sommario compiti staff: tasso completamento, per stato, per tipo.
   */
  @Get('tasks')
  async getTasks(
    @CurrentUser() currentUser: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('tenantId') tenantId?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('I parametri "from" e "to" sono obbligatori (YYYY-MM-DD).');
    }
    const resolvedTenantId = this.resolveTenantId(currentUser, tenantId);
    return this.reportsService.getTasks(resolvedTenantId, from, to);
  }
}

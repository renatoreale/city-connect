import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StaffTasksService } from './staff-tasks.service';
import { StaffTaskStatus } from './entities/staff-task.entity';
import {
  CreateStaffTaskTypeDto,
  UpdateStaffTaskTypeDto,
  CreateStaffTaskDto,
  UpdateStaffTaskDto,
  CompleteTaskDto,
  CancelTaskDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

// ─── Task Types ─────────────────────────────────────────────────────────────

@Controller('api/v1/staff-task-types')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class StaffTaskTypesController {
  constructor(private readonly staffTasksService: StaffTasksService) {}

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.staffTasksService.findAllTaskTypes(tenantId, includeInactive === 'true');
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.findTaskTypeById(id, tenantId);
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async create(
    @Body() dto: CreateStaffTaskTypeDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.createTaskType(tenantId, dto, user.id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffTaskTypeDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.updateTaskType(id, tenantId, dto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.staffTasksService.deleteTaskType(id, tenantId);
    return { message: 'Tipo di compito eliminato' };
  }
}

// ─── Staff Tasks ─────────────────────────────────────────────────────────────

@Controller('api/v1/staff-tasks')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class StaffTasksController {
  constructor(private readonly staffTasksService: StaffTasksService) {}

  /**
   * Calendario operativo: restituisce i compiti raggruppati per data.
   * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), assignedToUserId (opzionale)
   */
  @Get('calendar')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getCalendar(
    @CurrentTenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('assignedToUserId') assignedToUserId?: string,
  ) {
    return this.staffTasksService.getCalendar(tenantId, from, to, assignedToUserId);
  }

  /**
   * Compiti del giorno corrente.
   * Query param: assignedToUserId (opzionale - per filtrare i compiti di un singolo operatore)
   */
  @Get('today')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getToday(
    @CurrentTenant() tenantId: string,
    @Query('assignedToUserId') assignedToUserId?: string,
  ) {
    return this.staffTasksService.getToday(tenantId, assignedToUserId);
  }

  /**
   * Lista compiti con filtri.
   * Query params: date, from, to, assignedToUserId, status, bookingId
   */
  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('status') status?: StaffTaskStatus,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.staffTasksService.findAll(tenantId, { date, from, to, assignedToUserId, status, bookingId });
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.findById(id, tenantId);
  }

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async create(
    @Body() dto: CreateStaffTaskDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.create(tenantId, dto, user.id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffTaskDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.update(id, tenantId, dto, user.id);
  }

  /**
   * Marca il compito come completato. Accessibile a tutti i ruoli operativi.
   */
  @Post(':id/complete')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.completeTask(id, tenantId, dto, user.id);
  }

  /**
   * Cancella un compito (Admin, Titolare, Manager).
   */
  @Post(':id/cancel')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTaskDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.staffTasksService.cancelTask(id, tenantId, dto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.staffTasksService.delete(id, tenantId);
    return { message: 'Compito eliminato' };
  }
}

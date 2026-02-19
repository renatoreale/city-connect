import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  UpsertWeeklyScheduleDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto';
import { ScheduleType } from './entities/appointment-weekly-schedule.entity';
import { AppointmentStatus } from './entities/appointment.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/appointments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ─── Weekly Schedule ────────────────────────────────────────

  @Put('weekly-schedule')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async upsertWeeklySchedule(
    @Body() dto: UpsertWeeklyScheduleDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.upsertWeeklySchedule(
      tenantId,
      dto,
      user.id,
    );
  }

  @Get('weekly-schedule')
  @Roles(
    RoleType.ADMIN,
    RoleType.CEO,
    RoleType.TITOLARE,
    RoleType.MANAGER,
    RoleType.OPERATORE,
  )
  async getWeeklySchedule(@CurrentTenant() tenantId: string) {
    return this.appointmentsService.getWeeklySchedule(tenantId);
  }

  @Delete('weekly-schedule/:id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async deleteScheduleEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.appointmentsService.deleteScheduleEntry(tenantId, id);
    return { message: 'Configurazione schedule eliminata' };
  }

  // ─── Available Slots ────────────────────────────────────────

  @Get('available-slots')
  @Roles(
    RoleType.ADMIN,
    RoleType.CEO,
    RoleType.TITOLARE,
    RoleType.MANAGER,
    RoleType.OPERATORE,
  )
  async getAvailableSlots(
    @Query('date') date: string,
    @Query('appointmentType') appointmentType: ScheduleType,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      tenantId,
      date,
      appointmentType,
    );
  }

  // ─── CRUD Appointments ─────────────────────────────────────

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async createAppointment(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.createAppointment(
      tenantId,
      dto,
      user.id,
    );
  }

  @Get()
  @Roles(
    RoleType.ADMIN,
    RoleType.CEO,
    RoleType.TITOLARE,
    RoleType.MANAGER,
    RoleType.OPERATORE,
  )
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('appointmentType') appointmentType?: ScheduleType,
    @Query('status') status?: AppointmentStatus,
    @Query('bookingId') bookingId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.appointmentsService.findAll(tenantId, {
      fromDate,
      toDate,
      appointmentType,
      status,
      bookingId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('calendar/:date')
  @Roles(
    RoleType.ADMIN,
    RoleType.CEO,
    RoleType.TITOLARE,
    RoleType.MANAGER,
    RoleType.OPERATORE,
  )
  async getCalendar(
    @Param('date') date: string,
    @CurrentTenant() tenantId: string,
    @Query('appointmentType') appointmentType?: ScheduleType,
  ) {
    return this.appointmentsService.findByDate(
      tenantId,
      date,
      appointmentType,
    );
  }

  @Get('booking/:bookingId')
  @Roles(
    RoleType.ADMIN,
    RoleType.CEO,
    RoleType.TITOLARE,
    RoleType.MANAGER,
    RoleType.OPERATORE,
  )
  async findByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.findByBooking(bookingId, tenantId);
  }

  @Get(':id')
  @Roles(
    RoleType.ADMIN,
    RoleType.CEO,
    RoleType.TITOLARE,
    RoleType.MANAGER,
    RoleType.OPERATORE,
  )
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async updateAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.updateAppointment(
      tenantId,
      id,
      dto,
      user.id,
    );
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async cancelAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    await this.appointmentsService.cancelAppointment(tenantId, id, user.id);
    return { message: 'Appuntamento cancellato' };
  }

  @Patch(':id/complete')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async completeAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.completeAppointment(
      tenantId,
      id,
      user.id,
    );
  }

  @Patch(':id/no-show')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.appointmentsService.markNoShow(tenantId, id, user.id);
  }
}

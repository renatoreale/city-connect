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
import { BookingsService } from './bookings.service';
import { BookingStatus } from './entities/booking.entity';
import {
  ConvertQuoteDto,
  UpdateBookingDto,
  ChangeStatusDto,
  AddExtraDto,
  CreateDailyOverrideDto,
  PerformCheckInDto,
  PerformCheckOutDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('convert')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async convertFromQuote(
    @Body() dto: ConvertQuoteDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.convertFromQuote(tenantId, dto, user.id);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: BookingStatus,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.bookingsService.findAll(tenantId, {
      status,
      clientId,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('today-arrivals')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getTodayArrivals(@CurrentTenant() tenantId: string) {
    return this.bookingsService.getTodayArrivals(tenantId);
  }

  @Get('today-departures')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getTodayDepartures(@CurrentTenant() tenantId: string) {
    return this.bookingsService.getTodayDepartures(tenantId);
  }

  @Get('in-stay')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getInStay(@CurrentTenant() tenantId: string) {
    return this.bookingsService.getInStay(tenantId);
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.findById(id, tenantId);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.update(id, tenantId, dto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.bookingsService.delete(id, tenantId);
    return { message: 'Prenotazione eliminata' };
  }

  @Patch(':id/status')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.changeStatus(id, tenantId, dto, user.id);
  }

  @Post(':id/check-in')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async performCheckIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerformCheckInDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.performCheckIn(id, tenantId, dto, user.id);
  }

  @Post(':id/check-out')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async performCheckOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerformCheckOutDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.performCheckOut(id, tenantId, dto, user.id);
  }

  @Post(':id/extras')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async addExtra(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddExtraDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.addExtra(id, tenantId, dto, user.id);
  }

  @Delete(':id/extras/:lineItemId')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async removeExtra(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineItemId', ParseUUIDPipe) lineItemId: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.removeExtra(id, lineItemId, tenantId, user.id);
  }

  @Post(':id/daily-overrides')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async createDailyOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDailyOverrideDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.createDailyOverride(id, tenantId, dto, user.id);
  }

  @Get(':id/daily-overrides')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getDailyOverrides(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.bookingsService.getDailyOverrides(id, tenantId);
  }

  @Delete(':id/daily-overrides/:overrideId')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async removeDailyOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.bookingsService.removeDailyOverride(id, overrideId, tenantId);
    return { message: 'Forzatura rimossa' };
  }

  @Get(':id/payments-summary')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getPaymentsSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    // Verify booking belongs to tenant
    await this.bookingsService.findById(id, tenantId);
    return this.bookingsService.getPaymentsSummary(id);
  }

  @Get(':id/status-history')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getStatusHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const booking = await this.bookingsService.findById(id, tenantId);
    return booking.statusHistory;
  }
}

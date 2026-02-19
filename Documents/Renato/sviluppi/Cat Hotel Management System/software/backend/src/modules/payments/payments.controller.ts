import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentType } from './entities/payment.entity';
import { CreatePaymentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.paymentsService.create(tenantId, dto, user.id);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('bookingId') bookingId?: string,
    @Query('paymentType') paymentType?: PaymentType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.paymentsService.findAll(tenantId, {
      bookingId,
      paymentType,
      fromDate,
      toDate,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('summary')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getTenantSummary(
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.paymentsService.getTenantSummary(tenantId, fromDate, toDate);
  }

  @Get('booking/:bookingId')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.paymentsService.findByBooking(bookingId, tenantId);
  }

  @Get('booking/:bookingId/balance')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getBookingBalance(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.paymentsService.getBookingBalance(bookingId);
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.paymentsService.findById(id, tenantId);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.paymentsService.delete(id, tenantId);
    return { message: 'Pagamento eliminato' };
  }
}

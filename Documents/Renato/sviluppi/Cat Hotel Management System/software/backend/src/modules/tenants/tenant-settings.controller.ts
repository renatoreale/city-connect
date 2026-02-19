import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TenantSettingsService } from './tenant-settings.service';
import { UpdateTenantSettingsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/tenant-settings')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getSettings(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.findByTenantId(tenantId);
  }

  @Patch()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async updateSettings(
    @Body() updateDto: UpdateTenantSettingsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tenantSettingsService.update(tenantId, updateDto);
  }

  @Get('health')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getHealthConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getHealthValidityConfig(tenantId);
  }

  @Get('booking')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getBookingConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getBookingConfig(tenantId);
  }

  @Get('quote')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getQuoteConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getQuoteConfig(tenantId);
  }

  @Get('cage-pool')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getCagePoolConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getCagePoolConfig(tenantId);
  }

  @Get('appointment')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getAppointmentConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getAppointmentConfig(tenantId);
  }

  @Get('checkin-checkout')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getCheckinCheckoutConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getCheckinCheckoutConfig(tenantId);
  }

  @Get('notification')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getNotificationConfig(@CurrentTenant() tenantId: string) {
    return this.tenantSettingsService.getNotificationConfig(tenantId);
  }
}

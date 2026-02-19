import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/availability')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getDailyAvailability(
    @CurrentTenant() tenantId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.availabilityService.getDailyAvailability(tenantId, checkInDate, checkOutDate);
  }

  @Get('check')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async checkAvailability(
    @CurrentTenant() tenantId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('catIds') catIdsParam: string,
  ) {
    const catIds = catIdsParam ? catIdsParam.split(',').map(id => id.trim()) : [];
    return this.availabilityService.checkAvailabilityForCats(
      tenantId,
      checkInDate,
      checkOutDate,
      catIds,
    );
  }
}

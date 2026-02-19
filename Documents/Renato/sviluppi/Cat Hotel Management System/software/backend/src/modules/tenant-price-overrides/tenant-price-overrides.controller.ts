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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';
import { TenantPriceOverridesService } from './tenant-price-overrides.service';
import { CreateTenantPriceOverrideDto, UpdateTenantPriceOverrideDto } from './dto';

@Controller('api/v1/tenant-price-overrides')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TenantPriceOverridesController {
  constructor(
    private readonly overridesService: TenantPriceOverridesService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async create(
    @CurrentTenant() tenantId: string,
    @Body() createDto: CreateTenantPriceOverrideDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.overridesService.create(tenantId, createDto, userId);
  }

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.overridesService.findAll(tenantId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.overridesService.findById(id, tenantId);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() updateDto: UpdateTenantPriceOverrideDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.overridesService.update(id, tenantId, updateDto, userId);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.overridesService.delete(id, tenantId);
    return { message: 'Override eliminato con successo' };
  }
}

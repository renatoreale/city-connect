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
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType, GLOBAL_ROLES } from '../../common/constants/roles.constant';

@Controller('api/v1/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.tenantsService.findAll({
      isActive: isActive ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post()
  @Roles(RoleType.ADMIN)
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    if (
      !GLOBAL_ROLES.includes(currentUser.role) &&
      !currentUser.tenantIds?.includes(id)
    ) {
      throw new ForbiddenException('Non hai accesso a questo tenant');
    }

    const tenant = await this.tenantsService.findById(id);
    if (!tenant) {
      return { message: 'Tenant non trovato' };
    }

    return tenant;
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() currentUser: any,
  ) {
    if (
      currentUser.role !== RoleType.ADMIN &&
      !currentUser.tenantIds?.includes(id)
    ) {
      throw new ForbiddenException('Non hai accesso a questo tenant');
    }

    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.tenantsService.delete(id);
    return { message: 'Tenant eliminato' };
  }

  @Get(':id/users')
  async getTenantUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    if (
      !GLOBAL_ROLES.includes(currentUser.role) &&
      !currentUser.tenantIds?.includes(id)
    ) {
      throw new ForbiddenException('Non hai accesso a questo tenant');
    }

    return this.tenantsService.getTenantUsers(id);
  }
}

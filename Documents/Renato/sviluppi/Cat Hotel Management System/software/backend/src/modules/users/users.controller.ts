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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignTenantDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.usersService.findAll({
      tenantId,
      isActive: isActive ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post()
  @Roles(RoleType.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    if (
      currentUser.role !== RoleType.ADMIN &&
      currentUser.role !== RoleType.CEO &&
      currentUser.id !== id
    ) {
      const user = await this.usersService.findById(id);
      if (user) {
        const userTenantIds = user.userTenants.map((ut) => ut.tenantId);
        const hasCommonTenant = currentUser.tenantIds.some((tid: string) =>
          userTenantIds.includes(tid),
        );
        if (!hasCommonTenant) {
          return { message: 'Accesso negato' };
        }
      }
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      return { message: 'Utente non trovato' };
    }

    return user;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    if (
      currentUser.role !== RoleType.ADMIN &&
      currentUser.id !== id
    ) {
      return { message: 'Non autorizzato a modificare questo utente' };
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.delete(id);
    return { message: 'Utente eliminato' };
  }

  @Post(':id/tenants')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async assignToTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignTenantDto: AssignTenantDto,
  ) {
    return this.usersService.assignToTenant(id, assignTenantDto);
  }

  @Delete(':id/tenants/:tenantId')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE)
  async removeFromTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    await this.usersService.removeFromTenant(id, tenantId);
    return { message: 'Utente rimosso dal tenant' };
  }

  @Get(':id/tenants')
  async getUserTenants(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserTenants(id);
  }
}

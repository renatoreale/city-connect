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
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, BlacklistClientDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/clients')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    // Override tenantId con quello corrente per sicurezza
    createClientDto.tenantId = tenantId;
    return this.clientsService.create(createClientDto, user.id);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isBlacklisted') isBlacklisted?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.clientsService.findAll(tenantId, {
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isBlacklisted: isBlacklisted !== undefined ? isBlacklisted === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('check-blacklist/:fiscalCode')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async checkBlacklist(@Param('fiscalCode') fiscalCode: string) {
    return this.clientsService.checkBlacklistStatus(fiscalCode);
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.findById(id, tenantId);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.update(id, tenantId, updateClientDto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.clientsService.delete(id, tenantId);
    return { message: 'Cliente eliminato' };
  }

  @Post(':id/blacklist')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async addToBlacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() blacklistDto: BlacklistClientDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.addToBlacklist(id, tenantId, blacklistDto, user.id);
  }

  @Delete(':id/blacklist')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async removeFromBlacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.removeFromBlacklist(id, tenantId, user.id);
  }
}

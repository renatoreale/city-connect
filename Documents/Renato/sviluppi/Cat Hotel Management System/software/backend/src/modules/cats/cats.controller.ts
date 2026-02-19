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
import { CatsService } from './cats.service';
import { CreateCatDto, UpdateCatDto, BlacklistCatDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/cats')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async create(
    @Body() createCatDto: CreateCatDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    createCatDto.tenantId = tenantId;
    return this.catsService.create(createCatDto, user.id);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isBlacklisted') isBlacklisted?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.catsService.findAll(tenantId, {
      clientId,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isBlacklisted: isBlacklisted !== undefined ? isBlacklisted === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('with-health-alerts')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getCatsWithHealthAlerts(
    @CurrentTenant() tenantId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.catsService.getCatsWithHealthAlerts(tenantId, { clientId });
  }

  @Get('check-blacklist/:microchipNumber')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async checkBlacklist(@Param('microchipNumber') microchipNumber: string) {
    return this.catsService.checkBlacklistStatus(microchipNumber);
  }

  @Get('client/:clientId')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findByClient(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.catsService.findByClientId(clientId, tenantId);
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.catsService.findById(id, tenantId);
  }

  @Get(':id/health-status')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async getHealthStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.catsService.getHealthStatus(id, tenantId);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCatDto: UpdateCatDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.catsService.update(id, tenantId, updateCatDto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.catsService.delete(id, tenantId);
    return { message: 'Gatto eliminato' };
  }

  @Post(':id/blacklist')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async addToBlacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() blacklistDto: BlacklistCatDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.catsService.addToBlacklist(id, tenantId, blacklistDto, user.id);
  }

  @Delete(':id/blacklist')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async removeFromBlacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.catsService.removeFromBlacklist(id, tenantId, user.id);
  }
}

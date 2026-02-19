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
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/email-templates')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class EmailTemplatesController {
  constructor(private readonly templatesService: EmailTemplatesService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  async create(
    @Body() createDto: CreateEmailTemplateDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    // Global templates have no tenantId, tenant-specific templates have tenantId
    // For now, creating tenant-specific templates
    return this.templatesService.create(createDto, user.id, tenantId);
  }

  @Post('global')
  @Roles(RoleType.ADMIN)
  async createGlobal(
    @Body() createDto: CreateEmailTemplateDto,
    @CurrentUser() user: any,
  ) {
    // Create global template (no tenantId)
    return this.templatesService.create(createDto, user.id);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('includeGlobal') includeGlobal?: string,
    @Query('isActive') isActive?: string,
    @Query('code') code?: string,
  ) {
    return this.templatesService.findAll({
      tenantId,
      includeGlobal: includeGlobal !== 'false',
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      code,
    });
  }

  @Get('variables')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  getAvailableVariables() {
    return this.templatesService.getAvailableVariables();
  }

  @Get('by-code/:code')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findByCode(
    @Param('code') code: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.templatesService.findByCode(code, tenantId);
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEmailTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.delete(id);
    return { message: 'Template eliminato' };
  }
}

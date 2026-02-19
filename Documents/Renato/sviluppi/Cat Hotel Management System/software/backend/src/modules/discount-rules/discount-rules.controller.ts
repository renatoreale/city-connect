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
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';
import { DiscountRulesService } from './discount-rules.service';
import { CreateDiscountRuleDto, UpdateDiscountRuleDto } from './dto';
import { DiscountType } from './entities/discount-rule.entity';

@Controller('api/v1/discount-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountRulesController {
  constructor(private readonly discountRulesService: DiscountRulesService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async create(
    @Body() createDto: CreateDiscountRuleDto,
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Query('global') global?: string,
  ) {
    // Se global=true e l'utente ha i permessi, crea una regola globale
    const isGlobal = global === 'true';
    return this.discountRulesService.create(
      createDto,
      userId,
      isGlobal ? undefined : tenantId,
    );
  }

  @Post('global')
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async createGlobal(
    @Body() createDto: CreateDiscountRuleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.discountRulesService.create(createDto, userId);
  }

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('includeGlobal') includeGlobal?: string,
    @Query('isActive') isActive?: string,
    @Query('discountType') discountType?: DiscountType,
  ) {
    return this.discountRulesService.findAll({
      tenantId,
      includeGlobal: includeGlobal !== 'false',
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      discountType,
    });
  }

  @Get('global')
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async findAllGlobal(
    @Query('isActive') isActive?: string,
    @Query('discountType') discountType?: DiscountType,
  ) {
    return this.discountRulesService.findAll({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      discountType,
    });
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountRulesService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDiscountRuleDto,
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.discountRulesService.update(id, updateDto, userId, tenantId);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.discountRulesService.delete(id, tenantId);
    return { message: 'Regola sconto eliminata con successo' };
  }
}

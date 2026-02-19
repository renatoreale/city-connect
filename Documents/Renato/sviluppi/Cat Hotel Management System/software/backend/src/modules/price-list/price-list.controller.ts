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
import { RoleType } from '../../common/constants/roles.constant';
import { PriceListService } from './price-list.service';
import { CreatePriceListItemDto, UpdatePriceListItemDto } from './dto';
import { PriceListCategory } from './entities/price-list-item.entity';

@Controller('api/v1/price-list')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceListController {
  constructor(private readonly priceListService: PriceListService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async create(
    @Body() createDto: CreatePriceListItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.priceListService.create(createDto, userId);
  }

  @Get()
  async findAll(
    @Query('category') category?: PriceListCategory,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.priceListService.findAll({
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceListService.findById(id);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.priceListService.findByCode(code);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePriceListItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.priceListService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.priceListService.delete(id);
    return { message: 'Item eliminato con successo' };
  }
}

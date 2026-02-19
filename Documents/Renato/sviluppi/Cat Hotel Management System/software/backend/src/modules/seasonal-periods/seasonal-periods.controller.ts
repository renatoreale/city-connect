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
import { SeasonalPeriodsService } from './seasonal-periods.service';
import { CreateSeasonalPeriodDto, UpdateSeasonalPeriodDto } from './dto';

@Controller('api/v1/seasonal-periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeasonalPeriodsController {
  constructor(private readonly seasonalPeriodsService: SeasonalPeriodsService) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async create(
    @Body() createDto: CreateSeasonalPeriodDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.seasonalPeriodsService.create(createDto, userId);
  }

  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('year') year?: string,
  ) {
    return this.seasonalPeriodsService.findAll({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Get('check-date')
  async checkDate(@Query('date') date: string) {
    const checkDate = date ? new Date(date) : new Date();
    const seasonType = await this.seasonalPeriodsService.getSeasonType(checkDate);
    return {
      date: checkDate.toISOString().split('T')[0],
      seasonType,
      isHighSeason: seasonType === 'high',
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.seasonalPeriodsService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSeasonalPeriodDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.seasonalPeriodsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.seasonalPeriodsService.delete(id);
    return { message: 'Periodo eliminato con successo' };
  }
}

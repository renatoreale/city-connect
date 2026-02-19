import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { PriceCalculationService } from './price-calculation.service';
import { CalculatePriceDto } from './dto';

@Controller('api/v1/price-calculation')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PriceCalculationController {
  constructor(
    private readonly priceCalculationService: PriceCalculationService,
  ) {}

  @Post('calculate')
  async calculatePrice(
    @CurrentTenant() tenantId: string,
    @Body() dto: CalculatePriceDto,
  ) {
    return this.priceCalculationService.calculatePrice(tenantId, dto);
  }

  @Get('single-item')
  async calculateSingleItem(
    @CurrentTenant() tenantId: string,
    @Query('itemCode') itemCode: string,
    @Query('date') date?: string,
    @Query('quantity') quantity?: string,
  ) {
    return this.priceCalculationService.calculateSingleItem(
      tenantId,
      itemCode,
      date ? new Date(date) : new Date(),
      quantity ? parseInt(quantity, 10) : 1,
    );
  }
}

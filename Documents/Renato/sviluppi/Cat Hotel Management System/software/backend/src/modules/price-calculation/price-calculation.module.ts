import { Module } from '@nestjs/common';
import { PriceListModule } from '../price-list/price-list.module';
import { TenantPriceOverridesModule } from '../tenant-price-overrides/tenant-price-overrides.module';
import { SeasonalPeriodsModule } from '../seasonal-periods/seasonal-periods.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { PriceCalculationController } from './price-calculation.controller';
import { PriceCalculationService } from './price-calculation.service';

@Module({
  imports: [
    PriceListModule,
    TenantPriceOverridesModule,
    SeasonalPeriodsModule,
    DiscountRulesModule,
  ],
  controllers: [PriceCalculationController],
  providers: [PriceCalculationService],
  exports: [PriceCalculationService],
})
export class PriceCalculationModule {}

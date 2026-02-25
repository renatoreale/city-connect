import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { Quote } from './entities/quote.entity';
import { QuoteLineItem } from './entities/quote-line-item.entity';
import { QuoteCat } from './entities/quote-cat.entity';
import { PriceListModule } from '../price-list/price-list.module';
import { TenantPriceOverridesModule } from '../tenant-price-overrides/tenant-price-overrides.module';
import { SeasonalPeriodsModule } from '../seasonal-periods/seasonal-periods.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { CatsModule } from '../cats/cats.module';
import { PdfModule } from '../pdf/pdf.module';
import { EmailModule } from '../email/email.module';
import { TenantSettingsModule } from '../tenants/tenant-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, QuoteLineItem, QuoteCat]),
    PriceListModule,
    TenantPriceOverridesModule,
    SeasonalPeriodsModule,
    DiscountRulesModule,
    CatsModule,
    PdfModule,
    EmailModule,
    TenantSettingsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}

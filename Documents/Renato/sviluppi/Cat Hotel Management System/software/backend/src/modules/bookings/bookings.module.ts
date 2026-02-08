import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { BookingLineItem } from './entities/booking-line-item.entity';
import { BookingCat } from './entities/booking-cat.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { BookingDailyOverride } from './entities/booking-daily-override.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Payment } from '../payments/entities/payment.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { Cat } from '../cats/entities/cat.entity';
import { PriceListModule } from '../price-list/price-list.module';
import { TenantPriceOverridesModule } from '../tenant-price-overrides/tenant-price-overrides.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingLineItem,
      BookingCat,
      BookingStatusHistory,
      BookingDailyOverride,
      Quote,
      Payment,
      TenantSettings,
      Cat,
    ]),
    PriceListModule,
    TenantPriceOverridesModule,
    AvailabilityModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}

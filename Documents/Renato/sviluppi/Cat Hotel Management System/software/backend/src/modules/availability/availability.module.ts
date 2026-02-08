import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingCat } from '../bookings/entities/booking-cat.entity';
import { Cat } from '../cats/entities/cat.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { BookingDailyOverride } from '../bookings/entities/booking-daily-override.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingCat, Cat, TenantSettings, BookingDailyOverride]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

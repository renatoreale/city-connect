import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonalPeriod } from './entities/seasonal-period.entity';
import { SeasonalPeriodsController } from './seasonal-periods.controller';
import { SeasonalPeriodsService } from './seasonal-periods.service';

@Module({
  imports: [TypeOrmModule.forFeature([SeasonalPeriod])],
  controllers: [SeasonalPeriodsController],
  providers: [SeasonalPeriodsService],
  exports: [SeasonalPeriodsService],
})
export class SeasonalPeriodsModule {}

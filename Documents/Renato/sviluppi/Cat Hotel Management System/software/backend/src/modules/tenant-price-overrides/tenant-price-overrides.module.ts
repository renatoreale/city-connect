import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantPriceOverride } from './entities/tenant-price-override.entity';
import { TenantPriceOverridesController } from './tenant-price-overrides.controller';
import { TenantPriceOverridesService } from './tenant-price-overrides.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantPriceOverride])],
  controllers: [TenantPriceOverridesController],
  providers: [TenantPriceOverridesService],
  exports: [TenantPriceOverridesService],
})
export class TenantPriceOverridesModule {}

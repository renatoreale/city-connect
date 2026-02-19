import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceListItem } from './entities/price-list-item.entity';
import { PriceListController } from './price-list.controller';
import { PriceListService } from './price-list.service';

@Module({
  imports: [TypeOrmModule.forFeature([PriceListItem])],
  controllers: [PriceListController],
  providers: [PriceListService],
  exports: [PriceListService],
})
export class PriceListModule {}

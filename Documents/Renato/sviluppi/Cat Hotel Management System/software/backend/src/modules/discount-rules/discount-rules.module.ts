import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountRule } from './entities/discount-rule.entity';
import { DiscountRulesController } from './discount-rules.controller';
import { DiscountRulesService } from './discount-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscountRule])],
  controllers: [DiscountRulesController],
  providers: [DiscountRulesService],
  exports: [DiscountRulesService],
})
export class DiscountRulesModule {}

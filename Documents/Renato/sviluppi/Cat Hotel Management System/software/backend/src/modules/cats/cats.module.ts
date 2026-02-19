import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { Cat } from './entities/cat.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cat, TenantSettings])],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}

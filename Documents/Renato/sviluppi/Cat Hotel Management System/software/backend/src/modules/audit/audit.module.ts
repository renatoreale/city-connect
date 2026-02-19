import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditContextService } from './audit-context.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditSubscriber } from './subscribers/audit.subscriber';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditContextService, AuditSubscriber],
  exports: [AuditService, AuditContextService],
})
export class AuditModule {}

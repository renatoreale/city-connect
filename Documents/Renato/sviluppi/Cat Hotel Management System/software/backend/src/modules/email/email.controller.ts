import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailStatus } from './entities/email-log.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/email-logs')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('quoteId') quoteId?: string,
    @Query('appointmentId') appointmentId?: string,
    @Query('status') status?: EmailStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.emailService.findAllLogs(tenantId, {
      quoteId,
      appointmentId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailService.findLogById(id);
  }
}

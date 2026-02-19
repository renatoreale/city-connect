import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentWeeklySchedule } from './entities/appointment-weekly-schedule.entity';
import { Appointment } from './entities/appointment.entity';
import { AppointmentReminder } from './entities/appointment-reminder.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentEmailService } from './appointment-email.service';
import { AppointmentsController } from './appointments.controller';
import { TenantSettingsModule } from '../tenants/tenant-settings.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentWeeklySchedule,
      Appointment,
      AppointmentReminder,
      Booking,
      Tenant,
    ]),
    TenantSettingsModule,
    EmailModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentEmailService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

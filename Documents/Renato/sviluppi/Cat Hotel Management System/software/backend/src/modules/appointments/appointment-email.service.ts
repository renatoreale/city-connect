import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import {
  AppointmentReminder,
  ReminderStatus,
} from './entities/appointment-reminder.entity';
import { ScheduleType } from './entities/appointment-weekly-schedule.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailService } from '../email/email.service';
import { TenantSettingsService } from '../tenants/tenant-settings.service';

@Injectable()
export class AppointmentEmailService {
  private readonly logger = new Logger(AppointmentEmailService.name);

  constructor(
    @InjectRepository(AppointmentReminder)
    private reminderRepository: Repository<AppointmentReminder>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private emailService: EmailService,
    private tenantSettingsService: TenantSettingsService,
  ) {}

  // ─── Confirmation Email ───────────────────────────────────

  async sendConfirmationEmail(
    appointment: Appointment,
    userId: string,
  ): Promise<void> {
    try {
      const config = await this.tenantSettingsService.getNotificationConfig(
        appointment.tenantId,
      );

      if (!config.sendAppointmentConfirmation) {
        return;
      }

      const booking = await this.bookingRepository.findOne({
        where: { id: appointment.bookingId },
        relations: ['client'],
      });

      if (!booking || !booking.client?.email) {
        this.logger.warn(
          `Nessun client o email per booking ${appointment.bookingId}, skip conferma email`,
        );
        return;
      }

      const tenant = await this.tenantRepository.findOne({
        where: { id: appointment.tenantId },
      });

      const variables = this.emailService.buildAppointmentVariables(
        appointment,
        booking,
        tenant,
      );

      const templateCode =
        appointment.appointmentType === ScheduleType.CHECK_IN
          ? 'APPOINTMENT_CHECKIN_CONFIRMATION'
          : 'APPOINTMENT_CHECKOUT_CONFIRMATION';

      const clientName = `${booking.client.firstName} ${booking.client.lastName}`;

      await this.emailService.sendTemplatedEmail({
        tenantId: appointment.tenantId,
        templateCode,
        recipientEmail: booking.client.email,
        recipientName: clientName,
        variables,
        appointmentId: appointment.id,
        userId,
      });
    } catch (error) {
      this.logger.error(
        `Errore invio conferma appuntamento ${appointment.id}: ${error.message}`,
      );
    }
  }

  // ─── Reminder Scheduling ──────────────────────────────────

  async scheduleReminder(appointment: Appointment): Promise<void> {
    try {
      const config = await this.tenantSettingsService.getNotificationConfig(
        appointment.tenantId,
      );

      if (!config.sendAppointmentReminder) {
        return;
      }

      // Calculate scheduledFor = appointment datetime - reminderHours
      const appointmentDate = new Date(appointment.appointmentDate);
      const [h, m] = appointment.startTime.split(':').map(Number);
      appointmentDate.setHours(h, m, 0, 0);

      const scheduledFor = new Date(
        appointmentDate.getTime() - config.appointmentReminderHours * 60 * 60 * 1000,
      );

      // If scheduledFor is in the past, skip
      if (scheduledFor <= new Date()) {
        this.logger.warn(
          `Promemoria per appuntamento ${appointment.id} nel passato (${scheduledFor.toISOString()}), skip`,
        );
        return;
      }

      const reminder = this.reminderRepository.create({
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        scheduledFor,
        status: ReminderStatus.PENDING,
      });

      await this.reminderRepository.save(reminder);
    } catch (error) {
      this.logger.error(
        `Errore schedulazione promemoria per appuntamento ${appointment.id}: ${error.message}`,
      );
    }
  }

  async cancelReminder(appointmentId: string): Promise<void> {
    try {
      await this.reminderRepository.update(
        {
          appointmentId,
          status: ReminderStatus.PENDING,
        },
        {
          status: ReminderStatus.CANCELLED,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errore cancellazione promemoria per appuntamento ${appointmentId}: ${error.message}`,
      );
    }
  }

  async rescheduleReminder(appointment: Appointment): Promise<void> {
    await this.cancelReminder(appointment.id);
    await this.scheduleReminder(appointment);
  }

  // ─── Cron Job ─────────────────────────────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async processReminders(): Promise<void> {
    const now = new Date();

    const pendingReminders = await this.reminderRepository.find({
      where: {
        status: ReminderStatus.PENDING,
        scheduledFor: LessThanOrEqual(now),
      },
      take: 50,
      order: { scheduledFor: 'ASC' },
    });

    if (pendingReminders.length === 0) {
      return;
    }

    this.logger.log(
      `Processamento ${pendingReminders.length} promemoria in coda`,
    );

    for (const reminder of pendingReminders) {
      await this.processOneReminder(reminder);
    }
  }

  private async processOneReminder(
    reminder: AppointmentReminder,
  ): Promise<void> {
    try {
      reminder.attempts += 1;

      // Load appointment with relations
      const appointment = await this.appointmentRepository.findOne({
        where: { id: reminder.appointmentId },
      });

      if (!appointment || appointment.status !== AppointmentStatus.SCHEDULED) {
        reminder.status = ReminderStatus.CANCELLED;
        await this.reminderRepository.save(reminder);
        return;
      }

      const booking = await this.bookingRepository.findOne({
        where: { id: appointment.bookingId },
        relations: ['client'],
      });

      if (!booking || !booking.client?.email) {
        reminder.status = ReminderStatus.FAILED;
        reminder.errorMessage = 'Client o email non trovati';
        await this.reminderRepository.save(reminder);
        return;
      }

      const tenant = await this.tenantRepository.findOne({
        where: { id: appointment.tenantId },
      });

      const variables = this.emailService.buildAppointmentVariables(
        appointment,
        booking,
        tenant,
      );

      const templateCode =
        appointment.appointmentType === ScheduleType.CHECK_IN
          ? 'APPOINTMENT_CHECKIN_REMINDER'
          : 'APPOINTMENT_CHECKOUT_REMINDER';

      const clientName = `${booking.client.firstName} ${booking.client.lastName}`;

      const emailLog = await this.emailService.sendTemplatedEmail({
        tenantId: appointment.tenantId,
        templateCode,
        recipientEmail: booking.client.email,
        recipientName: clientName,
        variables,
        appointmentId: appointment.id,
      });

      reminder.emailLogId = emailLog.id;
      reminder.status = ReminderStatus.SENT;
      await this.reminderRepository.save(reminder);
    } catch (error) {
      reminder.status = ReminderStatus.FAILED;
      reminder.errorMessage = error.message;
      await this.reminderRepository.save(reminder);
      this.logger.error(
        `Errore processamento promemoria ${reminder.id}: ${error.message}`,
      );
    }
  }
}

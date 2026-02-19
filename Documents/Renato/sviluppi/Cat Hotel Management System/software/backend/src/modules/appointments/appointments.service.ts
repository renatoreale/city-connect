import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  AppointmentWeeklySchedule,
  DayOfWeek,
  ScheduleType,
} from './entities/appointment-weekly-schedule.entity';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { TenantSettingsService } from '../tenants/tenant-settings.service';
import {
  UpsertWeeklyScheduleDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto';
import { AppointmentEmailService } from './appointment-email.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(AppointmentWeeklySchedule)
    private scheduleRepository: Repository<AppointmentWeeklySchedule>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private tenantSettingsService: TenantSettingsService,
    private appointmentEmailService: AppointmentEmailService,
  ) {}

  // ─── Schedule Configuration ─────────────────────────────────

  async upsertWeeklySchedule(
    tenantId: string,
    dto: UpsertWeeklyScheduleDto,
    userId: string,
  ): Promise<AppointmentWeeklySchedule[]> {
    for (const entry of dto.entries) {
      if (entry.startTime >= entry.endTime) {
        throw new BadRequestException(
          `startTime (${entry.startTime}) deve essere precedente a endTime (${entry.endTime})`,
        );
      }

      const existing = await this.scheduleRepository.findOne({
        where: {
          tenantId,
          dayOfWeek: entry.dayOfWeek,
          scheduleType: entry.scheduleType,
        },
      });

      if (existing) {
        existing.startTime = entry.startTime;
        existing.endTime = entry.endTime;
        existing.isActive = entry.isActive ?? existing.isActive;
        await this.scheduleRepository.save(existing);
      } else {
        const newEntry = this.scheduleRepository.create({
          tenantId,
          dayOfWeek: entry.dayOfWeek,
          scheduleType: entry.scheduleType,
          startTime: entry.startTime,
          endTime: entry.endTime,
          isActive: entry.isActive ?? true,
        });
        await this.scheduleRepository.save(newEntry);
      }
    }

    return this.getWeeklySchedule(tenantId);
  }

  async getWeeklySchedule(
    tenantId: string,
  ): Promise<AppointmentWeeklySchedule[]> {
    return this.scheduleRepository.find({
      where: { tenantId },
      order: { dayOfWeek: 'ASC', scheduleType: 'ASC' },
    });
  }

  async deleteScheduleEntry(tenantId: string, id: string): Promise<void> {
    const entry = await this.scheduleRepository.findOne({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundException('Configurazione schedule non trovata');
    }

    await this.scheduleRepository.remove(entry);
  }

  // ─── Available Slots ────────────────────────────────────────

  async getAvailableSlots(
    tenantId: string,
    date: string,
    appointmentType: ScheduleType,
  ): Promise<
    {
      startTime: string;
      endTime: string;
      capacity: number;
      booked: number;
      available: number;
    }[]
  > {
    const dateObj = new Date(date);
    // getDay() returns 0=Sunday, we need 0=Monday
    const jsDay = dateObj.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

    const schedule = await this.scheduleRepository.findOne({
      where: {
        tenantId,
        dayOfWeek: dayOfWeek as DayOfWeek,
        scheduleType: appointmentType,
        isActive: true,
      },
    });

    if (!schedule) {
      return [];
    }

    const config = await this.tenantSettingsService.getAppointmentConfig(tenantId);
    const slotDuration = config.appointmentSlotDuration;
    const maxPerSlot =
      appointmentType === ScheduleType.CHECK_IN
        ? config.checkInMaxPerSlot
        : config.checkOutMaxPerSlot;

    const slots = this.generateSlots(
      schedule.startTime,
      schedule.endTime,
      slotDuration,
    );

    const result: {
      startTime: string;
      endTime: string;
      capacity: number;
      booked: number;
      available: number;
    }[] = [];

    for (const slot of slots) {
      const booked = await this.appointmentRepository.count({
        where: {
          tenantId,
          appointmentDate: date as any,
          startTime: slot.startTime,
          appointmentType,
          status: Not(AppointmentStatus.CANCELLED),
        },
      });

      result.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: maxPerSlot,
        booked,
        available: Math.max(0, maxPerSlot - booked),
      });
    }

    return result;
  }

  private generateSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
  ): { startTime: string; endTime: string }[] {
    const slots: { startTime: string; endTime: string }[] = [];

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let current = startMinutes;
    while (current + slotDuration <= endMinutes) {
      const slotStart = this.minutesToTime(current);
      const slotEnd = this.minutesToTime(current + slotDuration);
      slots.push({ startTime: slotStart, endTime: slotEnd });
      current += slotDuration;
    }

    return slots;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // ─── CRUD Appuntamenti ──────────────────────────────────────

  async createAppointment(
    tenantId: string,
    dto: CreateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    // 1. Validate booking exists and belongs to tenant
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException('Prenotazione non trovata');
    }

    // 2. Validate booking status
    if (dto.appointmentType === ScheduleType.CHECK_IN) {
      if (booking.status !== BookingStatus.CONFERMATA) {
        throw new BadRequestException(
          'Per creare un appuntamento check-in la prenotazione deve essere in stato "confermata"',
        );
      }
    } else {
      if (
        booking.status !== BookingStatus.CHECK_IN &&
        booking.status !== BookingStatus.IN_CORSO
      ) {
        throw new BadRequestException(
          'Per creare un appuntamento check-out la prenotazione deve essere in stato "check_in" o "in_corso"',
        );
      }
    }

    // 3. Validate no duplicate appointment type for this booking
    const existing = await this.appointmentRepository.findOne({
      where: {
        bookingId: dto.bookingId,
        appointmentType: dto.appointmentType,
        status: Not(AppointmentStatus.CANCELLED),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Esiste gia un appuntamento di tipo "${dto.appointmentType}" per questa prenotazione`,
      );
    }

    // 4. Validate date matches booking
    const appointmentDate = dto.appointmentDate.substring(0, 10);
    const bookingCheckIn = this.formatDate(booking.checkInDate);
    const bookingCheckOut = this.formatDate(booking.checkOutDate);

    if (dto.appointmentType === ScheduleType.CHECK_IN) {
      if (appointmentDate !== bookingCheckIn) {
        throw new BadRequestException(
          `La data dell'appuntamento check-in (${appointmentDate}) deve coincidere con la data di check-in della prenotazione (${bookingCheckIn})`,
        );
      }
    } else {
      if (appointmentDate !== bookingCheckOut) {
        throw new BadRequestException(
          `La data dell'appuntamento check-out (${appointmentDate}) deve coincidere con la data di check-out della prenotazione (${bookingCheckOut})`,
        );
      }
    }

    // 5. Validate slot availability
    await this.validateSlotAvailability(
      tenantId,
      appointmentDate,
      dto.startTime,
      dto.appointmentType,
    );

    // 6. Calculate end time
    const config = await this.tenantSettingsService.getAppointmentConfig(tenantId);
    const [h, m] = dto.startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + config.appointmentSlotDuration;
    const endTime = this.minutesToTime(endMinutes);

    // 7. Create appointment
    const appointment = this.appointmentRepository.create({
      tenantId,
      bookingId: dto.bookingId,
      appointmentType: dto.appointmentType,
      appointmentDate: appointmentDate as any,
      startTime: dto.startTime,
      endTime,
      notes: dto.notes || null,
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.appointmentRepository.save(appointment);

    // Fire-and-forget: send confirmation email and schedule reminder
    this.appointmentEmailService.sendConfirmationEmail(saved, userId);
    this.appointmentEmailService.scheduleReminder(saved);

    return saved;
  }

  async updateAppointment(
    tenantId: string,
    appointmentId: string,
    dto: UpdateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['booking'],
    });

    if (!appointment) {
      throw new NotFoundException('Appuntamento non trovato');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Solo gli appuntamenti in stato "scheduled" possono essere modificati',
      );
    }

    // If changing date or time, re-validate
    if (dto.appointmentDate || dto.startTime) {
      const newDate = dto.appointmentDate
        ? dto.appointmentDate.substring(0, 10)
        : this.formatDate(appointment.appointmentDate);
      const newStartTime = dto.startTime || appointment.startTime;

      // Validate date still matches booking
      const booking = appointment.booking;
      const bookingCheckIn = this.formatDate(booking.checkInDate);
      const bookingCheckOut = this.formatDate(booking.checkOutDate);

      if (appointment.appointmentType === ScheduleType.CHECK_IN) {
        if (newDate !== bookingCheckIn) {
          throw new BadRequestException(
            `La data dell'appuntamento check-in deve coincidere con la data di check-in della prenotazione (${bookingCheckIn})`,
          );
        }
      } else {
        if (newDate !== bookingCheckOut) {
          throw new BadRequestException(
            `La data dell'appuntamento check-out deve coincidere con la data di check-out della prenotazione (${bookingCheckOut})`,
          );
        }
      }

      await this.validateSlotAvailability(
        tenantId,
        newDate,
        newStartTime,
        appointment.appointmentType,
        appointmentId,
      );

      if (dto.appointmentDate) {
        appointment.appointmentDate = newDate as any;
      }

      if (dto.startTime) {
        appointment.startTime = dto.startTime;
        const config =
          await this.tenantSettingsService.getAppointmentConfig(tenantId);
        const [h, m] = dto.startTime.split(':').map(Number);
        const endMinutes = h * 60 + m + config.appointmentSlotDuration;
        appointment.endTime = this.minutesToTime(endMinutes);
      }
    }

    if (dto.notes !== undefined) {
      appointment.notes = dto.notes || null;
    }

    appointment.updatedBy = userId;

    const saved = await this.appointmentRepository.save(appointment);

    // Reschedule reminder if date or time changed
    if (dto.appointmentDate || dto.startTime) {
      this.appointmentEmailService.rescheduleReminder(saved);
    }

    return saved;
  }

  async cancelAppointment(
    tenantId: string,
    appointmentId: string,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Appuntamento non trovato');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appuntamento gia cancellato');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.updatedBy = userId;

    const saved = await this.appointmentRepository.save(appointment);

    // Cancel any pending reminders
    this.appointmentEmailService.cancelReminder(appointmentId);

    return saved;
  }

  async completeAppointment(
    tenantId: string,
    appointmentId: string,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Appuntamento non trovato');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Solo gli appuntamenti in stato "scheduled" possono essere completati',
      );
    }

    appointment.status = AppointmentStatus.COMPLETED;
    appointment.updatedBy = userId;

    return this.appointmentRepository.save(appointment);
  }

  async markNoShow(
    tenantId: string,
    appointmentId: string,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Appuntamento non trovato');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Solo gli appuntamenti in stato "scheduled" possono essere segnati come no-show',
      );
    }

    appointment.status = AppointmentStatus.NO_SHOW;
    appointment.updatedBy = userId;

    return this.appointmentRepository.save(appointment);
  }

  async findByBooking(
    bookingId: string,
    tenantId: string,
  ): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { bookingId, tenantId },
      relations: ['booking', 'booking.client'],
      order: { appointmentType: 'ASC' },
    });
  }

  async findByDate(
    tenantId: string,
    date: string,
    appointmentType?: ScheduleType,
  ): Promise<Appointment[]> {
    const where: any = {
      tenantId,
      appointmentDate: date as any,
    };

    if (appointmentType) {
      where.appointmentType = appointmentType;
    }

    return this.appointmentRepository.find({
      where,
      relations: ['booking', 'booking.client'],
      order: { startTime: 'ASC', appointmentType: 'ASC' },
    });
  }

  async findOne(
    tenantId: string,
    appointmentId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['booking', 'booking.client'],
    });

    if (!appointment) {
      throw new NotFoundException('Appuntamento non trovato');
    }

    return appointment;
  }

  async findAll(
    tenantId: string,
    options: {
      fromDate?: string;
      toDate?: string;
      appointmentType?: ScheduleType;
      status?: AppointmentStatus;
      bookingId?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: Appointment[]; total: number }> {
    const qb = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.booking', 'booking')
      .leftJoinAndSelect('booking.client', 'client')
      .where('appointment.tenantId = :tenantId', { tenantId })
      .andWhere('appointment.deletedAt IS NULL');

    if (options.fromDate) {
      qb.andWhere('appointment.appointmentDate >= :fromDate', {
        fromDate: options.fromDate,
      });
    }

    if (options.toDate) {
      qb.andWhere('appointment.appointmentDate <= :toDate', {
        toDate: options.toDate,
      });
    }

    if (options.appointmentType) {
      qb.andWhere('appointment.appointmentType = :appointmentType', {
        appointmentType: options.appointmentType,
      });
    }

    if (options.status) {
      qb.andWhere('appointment.status = :status', {
        status: options.status,
      });
    }

    if (options.bookingId) {
      qb.andWhere('appointment.bookingId = :bookingId', {
        bookingId: options.bookingId,
      });
    }

    qb.orderBy('appointment.appointmentDate', 'ASC').addOrderBy(
      'appointment.startTime',
      'ASC',
    );

    const total = await qb.getCount();

    if (options.skip !== undefined) {
      qb.skip(options.skip);
    }
    if (options.take !== undefined) {
      qb.take(options.take);
    }

    const data = await qb.getMany();

    return { data, total };
  }

  // ─── Private helpers ────────────────────────────────────────

  private async validateSlotAvailability(
    tenantId: string,
    date: string,
    startTime: string,
    appointmentType: ScheduleType,
    excludeAppointmentId?: string,
  ): Promise<void> {
    // Check day-of-week schedule exists
    const dateObj = new Date(date);
    const jsDay = dateObj.getUTCDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

    const schedule = await this.scheduleRepository.findOne({
      where: {
        tenantId,
        dayOfWeek: dayOfWeek as DayOfWeek,
        scheduleType: appointmentType,
        isActive: true,
      },
    });

    if (!schedule) {
      throw new BadRequestException(
        `Nessuna fascia oraria configurata per il tipo "${appointmentType}" in questo giorno della settimana`,
      );
    }

    // Check startTime is within the schedule window
    const config =
      await this.tenantSettingsService.getAppointmentConfig(tenantId);
    const slots = this.generateSlots(
      schedule.startTime,
      schedule.endTime,
      config.appointmentSlotDuration,
    );

    const validSlot = slots.find((s) => s.startTime === startTime);
    if (!validSlot) {
      throw new BadRequestException(
        `L'orario ${startTime} non corrisponde a nessuno slot disponibile. Slot validi: ${slots.map((s) => s.startTime).join(', ')}`,
      );
    }

    // Check capacity
    const maxPerSlot =
      appointmentType === ScheduleType.CHECK_IN
        ? config.checkInMaxPerSlot
        : config.checkOutMaxPerSlot;

    const whereCondition: any = {
      tenantId,
      appointmentDate: date as any,
      startTime,
      appointmentType,
      status: Not(AppointmentStatus.CANCELLED),
    };

    let booked = await this.appointmentRepository.count({
      where: whereCondition,
    });

    // If updating, exclude current appointment from count
    if (excludeAppointmentId) {
      const currentInSlot = await this.appointmentRepository.findOne({
        where: {
          id: excludeAppointmentId,
          appointmentDate: date as any,
          startTime,
          appointmentType,
          status: Not(AppointmentStatus.CANCELLED),
        },
      });
      if (currentInSlot) {
        booked--;
      }
    }

    if (booked >= maxPerSlot) {
      throw new ConflictException(
        `Lo slot ${startTime} per ${appointmentType} del ${date} ha raggiunto la capacita massima (${maxPerSlot})`,
      );
    }
  }

  private formatDate(date: Date): string {
    if (typeof date === 'string') {
      return (date as string).substring(0, 10);
    }
    return date.toISOString().substring(0, 10);
  }
}

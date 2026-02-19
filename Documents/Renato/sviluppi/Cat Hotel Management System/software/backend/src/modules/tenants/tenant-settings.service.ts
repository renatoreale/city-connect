import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSettings } from './entities/tenant-settings.entity';
import { UpdateTenantSettingsDto } from './dto';

@Injectable()
export class TenantSettingsService {
  constructor(
    @InjectRepository(TenantSettings)
    private tenantSettingsRepository: Repository<TenantSettings>,
  ) {}

  async findByTenantId(tenantId: string): Promise<TenantSettings> {
    let settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    if (!settings) {
      // Crea settings di default se non esistono
      settings = await this.createDefault(tenantId);
    }

    return settings;
  }

  async createDefault(tenantId: string): Promise<TenantSettings> {
    const settings = this.tenantSettingsRepository.create({
      tenantId,
      fivFelvValidityMonths: 12,
      vaccinationValidityMonths: 36,
      minBookingDays: 1,
      maxBookingDays: 365,
      quoteValidityDays: 7,
      depositPercentage: 30,
      checkinPaymentPercentage: 30,
      checkoutPaymentPercentage: 40,
      numSingole: 0,
      numDoppie: 0,
      cageOccupancyDays: 4,
      checkInMaxPerSlot: 1,
      checkOutMaxPerSlot: 1,
      appointmentSlotDuration: 30,
      requireCheckinPaymentAtCheckin: false,
      requireCheckoutPaymentAtCheckout: false,
      sendAppointmentConfirmation: true,
      sendAppointmentReminder: true,
      appointmentReminderHours: 24,
      sendBookingConfirmation: true,
      sendCheckInReminder: true,
      checkInReminderDays: 3,
    });

    return this.tenantSettingsRepository.save(settings);
  }

  async update(
    tenantId: string,
    updateDto: UpdateTenantSettingsDto,
  ): Promise<TenantSettings> {
    let settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    if (!settings) {
      // Crea settings con i valori forniti
      settings = this.tenantSettingsRepository.create({
        tenantId,
        ...updateDto,
      });
    } else {
      Object.assign(settings, updateDto);
    }

    return this.tenantSettingsRepository.save(settings);
  }

  async getHealthValidityConfig(tenantId: string): Promise<{
    fivFelvValidityMonths: number;
    vaccinationValidityMonths: number;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      fivFelvValidityMonths: settings.fivFelvValidityMonths,
      vaccinationValidityMonths: settings.vaccinationValidityMonths,
    };
  }

  async getBookingConfig(tenantId: string): Promise<{
    defaultCheckInTime: string | null;
    defaultCheckOutTime: string | null;
    minBookingDays: number;
    maxBookingDays: number;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      defaultCheckInTime: settings.defaultCheckInTime,
      defaultCheckOutTime: settings.defaultCheckOutTime,
      minBookingDays: settings.minBookingDays,
      maxBookingDays: settings.maxBookingDays,
    };
  }

  async getQuoteConfig(tenantId: string): Promise<{
    quoteValidityDays: number;
    depositPercentage: number;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      quoteValidityDays: settings.quoteValidityDays,
      depositPercentage: Number(settings.depositPercentage),
    };
  }

  async getCagePoolConfig(tenantId: string): Promise<{
    numSingole: number;
    numDoppie: number;
    cageOccupancyDays: number;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      numSingole: settings.numSingole,
      numDoppie: settings.numDoppie,
      cageOccupancyDays: settings.cageOccupancyDays,
    };
  }

  async getAppointmentConfig(tenantId: string): Promise<{
    checkInMaxPerSlot: number;
    checkOutMaxPerSlot: number;
    appointmentSlotDuration: number;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      checkInMaxPerSlot: settings.checkInMaxPerSlot,
      checkOutMaxPerSlot: settings.checkOutMaxPerSlot,
      appointmentSlotDuration: settings.appointmentSlotDuration,
    };
  }

  async getCheckinCheckoutConfig(tenantId: string): Promise<{
    depositPercentage: number;
    checkinPaymentPercentage: number;
    checkoutPaymentPercentage: number;
    requireCheckinPaymentAtCheckin: boolean;
    requireCheckoutPaymentAtCheckout: boolean;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      depositPercentage: Number(settings.depositPercentage),
      checkinPaymentPercentage: Number(settings.checkinPaymentPercentage),
      checkoutPaymentPercentage: Number(settings.checkoutPaymentPercentage),
      requireCheckinPaymentAtCheckin: settings.requireCheckinPaymentAtCheckin,
      requireCheckoutPaymentAtCheckout: settings.requireCheckoutPaymentAtCheckout,
    };
  }

  async getNotificationConfig(tenantId: string): Promise<{
    sendBookingConfirmation: boolean;
    sendCheckInReminder: boolean;
    checkInReminderDays: number;
    sendAppointmentConfirmation: boolean;
    sendAppointmentReminder: boolean;
    appointmentReminderHours: number;
  }> {
    const settings = await this.findByTenantId(tenantId);
    return {
      sendBookingConfirmation: settings.sendBookingConfirmation,
      sendCheckInReminder: settings.sendCheckInReminder,
      checkInReminderDays: settings.checkInReminderDays,
      sendAppointmentConfirmation: settings.sendAppointmentConfirmation,
      sendAppointmentReminder: settings.sendAppointmentReminder,
      appointmentReminderHours: settings.appointmentReminderHours,
    };
  }
}

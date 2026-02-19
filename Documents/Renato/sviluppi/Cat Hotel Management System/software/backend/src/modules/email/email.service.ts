import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { EmailLog, EmailStatus, EmailAttachment } from './entities/email-log.entity';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { Quote } from '../quotes/entities/quote.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SendQuoteEmailDto } from './dto';

export interface EmailPreview {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  attachments: { name: string; path: string }[];
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    private templateService: EmailTemplatesService,
    private configService: ConfigService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const provider = this.configService.get<string>('EMAIL_PROVIDER') || 'smtp';

    if (provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT') || 587,
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async previewQuoteEmail(
    quote: Quote,
    tenantId: string,
    templateCode: string = 'QUOTE_SEND',
  ): Promise<EmailPreview> {
    const template = await this.templateService.findByCode(templateCode, tenantId);

    const variables = this.buildQuoteVariables(quote);
    const subject = this.substituteVariables(template.subject, variables);
    const bodyHtml = this.substituteVariables(template.bodyHtml, variables);

    const attachments: { name: string; path: string }[] = [];
    if (quote.pdfPath && fs.existsSync(quote.pdfPath)) {
      attachments.push({
        name: `Preventivo_${quote.quoteNumber}.pdf`,
        path: quote.pdfPath,
      });
    }

    return {
      recipientEmail: quote.client?.email || '',
      recipientName: quote.client ? `${quote.client.firstName} ${quote.client.lastName}` : '',
      subject,
      bodyHtml,
      attachments,
    };
  }

  async sendQuoteEmail(
    quote: Quote,
    tenantId: string,
    sendDto: SendQuoteEmailDto,
    userId: string,
    templateCode: string = 'QUOTE_SEND',
  ): Promise<EmailLog> {
    // Get template for logging
    let templateId: string | null = null;
    try {
      const template = await this.templateService.findByCode(templateCode, tenantId);
      templateId = template.id;
    } catch (e) {
      // Template not found, continue without it
    }

    // Build final email content
    let subject = sendDto.subject;
    let bodyHtml = sendDto.bodyHtml;

    if (!subject || !bodyHtml) {
      const preview = await this.previewQuoteEmail(quote, tenantId, templateCode);
      subject = subject || preview.subject;
      bodyHtml = bodyHtml || preview.bodyHtml;
    }

    // Prepare attachments
    const attachments: EmailAttachment[] = [];
    const nodemailerAttachments: { filename: string; path: string; contentType: string }[] = [];

    if (quote.pdfPath && fs.existsSync(quote.pdfPath)) {
      const stats = fs.statSync(quote.pdfPath);
      attachments.push({
        name: `Preventivo_${quote.quoteNumber}.pdf`,
        path: quote.pdfPath,
        size: stats.size,
        mimeType: 'application/pdf',
      });
      nodemailerAttachments.push({
        filename: `Preventivo_${quote.quoteNumber}.pdf`,
        path: quote.pdfPath,
        contentType: 'application/pdf',
      });
    }

    // Create email log entry
    const emailLog = this.emailLogRepository.create({
      tenantId,
      templateId,
      quoteId: quote.id,
      recipientEmail: sendDto.recipientEmail,
      recipientName: sendDto.recipientName || null,
      subject,
      bodyHtml,
      attachments: attachments.length > 0 ? attachments : null,
      status: EmailStatus.PENDING,
      createdBy: userId,
    });

    const savedLog = await this.emailLogRepository.save(emailLog);

    // Send email
    try {
      const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Cat Hotel';
      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@cathotel.com';

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: sendDto.recipientEmail,
        subject,
        html: bodyHtml,
        attachments: nodemailerAttachments,
      });

      // Update log status
      savedLog.status = EmailStatus.SENT;
      savedLog.sentAt = new Date();
      await this.emailLogRepository.save(savedLog);

    } catch (error) {
      // Update log with error
      savedLog.status = EmailStatus.FAILED;
      savedLog.errorMessage = error.message;
      await this.emailLogRepository.save(savedLog);

      throw new BadRequestException(`Errore invio email: ${error.message}`);
    }

    return savedLog;
  }

  async findLogsByQuote(quoteId: string): Promise<EmailLog[]> {
    return this.emailLogRepository.find({
      where: { quoteId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllLogs(
    tenantId: string,
    options?: {
      quoteId?: string;
      appointmentId?: string;
      status?: EmailStatus;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: EmailLog[]; total: number }> {
    const queryBuilder = this.emailLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.template', 'template')
      .leftJoinAndSelect('log.quote', 'quote')
      .where('log.tenantId = :tenantId', { tenantId });

    if (options?.quoteId) {
      queryBuilder.andWhere('log.quoteId = :quoteId', { quoteId: options.quoteId });
    }

    if (options?.appointmentId) {
      queryBuilder.andWhere('log.appointmentId = :appointmentId', { appointmentId: options.appointmentId });
    }

    if (options?.status) {
      queryBuilder.andWhere('log.status = :status', { status: options.status });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('log.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findLogById(id: string): Promise<EmailLog> {
    const log = await this.emailLogRepository.findOne({
      where: { id },
      relations: ['template', 'quote', 'tenant'],
    });

    if (!log) {
      throw new NotFoundException('Log email non trovato');
    }

    return log;
  }

  // ─── Appointment Email Methods ───────────────────────────────

  buildAppointmentVariables(
    appointment: Appointment,
    booking: Booking,
    tenant: Tenant | null,
  ): Record<string, string> {
    const client = booking.client;

    const formatDate = (date: Date | string | null): string => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    const formatTime = (time: string): string => {
      return time ? time.substring(0, 5) : '';
    };

    const appointmentTypeLabel =
      appointment.appointmentType === 'check_in' ? 'Check-in' : 'Check-out';

    const clientAddress = client
      ? [client.address, client.city, client.postalCode, client.province]
          .filter(Boolean)
          .join(', ')
      : '';

    const hotelAddress = tenant
      ? [tenant.address, tenant.city, tenant.postalCode, tenant.province]
          .filter(Boolean)
          .join(', ')
      : '';

    return {
      // Client variables
      '{{client_full_name}}': client ? `${client.firstName} ${client.lastName}` : '',
      '{{client_first_name}}': client?.firstName || '',
      '{{client_last_name}}': client?.lastName || '',
      '{{client_email}}': client?.email || '',
      '{{client_phone}}': client?.phone1 || '',
      '{{client_address}}': clientAddress,

      // Appointment variables
      '{{appointment_type}}': appointmentTypeLabel,
      '{{appointment_date}}': formatDate(appointment.appointmentDate),
      '{{appointment_start_time}}': formatTime(appointment.startTime),
      '{{appointment_end_time}}': formatTime(appointment.endTime),
      '{{appointment_notes}}': appointment.notes || '',

      // Booking variables
      '{{booking_number}}': booking.bookingNumber,
      '{{check_in_date}}': formatDate(booking.checkInDate),
      '{{check_out_date}}': formatDate(booking.checkOutDate),

      // Hotel variables
      '{{hotel_name}}': tenant?.name || '',
      '{{hotel_address}}': hotelAddress,
      '{{hotel_phone}}': tenant?.phone || '',
      '{{hotel_email}}': tenant?.email || '',

      // System variables
      '{{current_date}}': formatDate(new Date()),
      '{{current_year}}': new Date().getFullYear().toString(),
    };
  }

  async sendTemplatedEmail(options: {
    tenantId: string;
    templateCode: string;
    recipientEmail: string;
    recipientName: string;
    variables: Record<string, string>;
    appointmentId?: string;
    quoteId?: string;
    userId?: string;
  }): Promise<EmailLog> {
    let templateId: string | null = null;
    let subject: string;
    let bodyHtml: string;

    try {
      const template = await this.templateService.findByCode(
        options.templateCode,
        options.tenantId,
      );
      templateId = template.id;
      subject = this.substituteVariables(template.subject, options.variables);
      bodyHtml = this.substituteVariables(template.bodyHtml, options.variables);
    } catch (e) {
      // Template not found - create a minimal log and return
      const failLog = this.emailLogRepository.create({
        tenantId: options.tenantId,
        templateId: null,
        quoteId: options.quoteId || null,
        appointmentId: options.appointmentId || null,
        recipientEmail: options.recipientEmail,
        recipientName: options.recipientName || null,
        subject: `[Template ${options.templateCode} non trovato]`,
        bodyHtml: '',
        status: EmailStatus.FAILED,
        errorMessage: `Template "${options.templateCode}" non trovato`,
        createdBy: options.userId || null,
      });
      return this.emailLogRepository.save(failLog);
    }

    const emailLog = this.emailLogRepository.create({
      tenantId: options.tenantId,
      templateId,
      quoteId: options.quoteId || null,
      appointmentId: options.appointmentId || null,
      recipientEmail: options.recipientEmail,
      recipientName: options.recipientName || null,
      subject,
      bodyHtml,
      attachments: null,
      status: EmailStatus.PENDING,
      createdBy: options.userId || null,
    });

    const savedLog = await this.emailLogRepository.save(emailLog);

    try {
      const fromName =
        this.configService.get<string>('SMTP_FROM_NAME') || 'Cat Hotel';
      const fromEmail =
        this.configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@cathotel.com';

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.recipientEmail,
        subject,
        html: bodyHtml,
      });

      savedLog.status = EmailStatus.SENT;
      savedLog.sentAt = new Date();
      await this.emailLogRepository.save(savedLog);
    } catch (error) {
      savedLog.status = EmailStatus.FAILED;
      savedLog.errorMessage = error.message;
      await this.emailLogRepository.save(savedLog);
      // Non lanciare eccezione - le email automatiche non devono bloccare il flusso
    }

    return savedLog;
  }

  // ─── Quote Email Methods ────────────────────────────────────

  private buildQuoteVariables(quote: Quote): Record<string, string> {
    const client = quote.client;
    const tenant = quote.tenant;

    const formatDate = (date: Date | string | null): string => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const catNames = quote.quoteCats
      ?.map((qc) => qc.cat?.name)
      .filter(Boolean)
      .join(', ') || '';

    const clientAddress = client
      ? [client.address, client.city, client.postalCode, client.province]
          .filter(Boolean)
          .join(', ')
      : '';

    const hotelAddress = tenant
      ? [tenant.address, tenant.city, tenant.postalCode, tenant.province]
          .filter(Boolean)
          .join(', ')
      : '';

    return {
      // Client variables
      '{{client_full_name}}': client ? `${client.firstName} ${client.lastName}` : '',
      '{{client_first_name}}': client?.firstName || '',
      '{{client_last_name}}': client?.lastName || '',
      '{{client_email}}': client?.email || '',
      '{{client_phone}}': client?.phone1 || '',
      '{{client_address}}': clientAddress,

      // Quote variables
      '{{quote_number}}': quote.quoteNumber,
      '{{quote_date}}': formatDate(quote.createdAt),
      '{{quote_valid_until}}': formatDate(quote.validUntil),
      '{{check_in_date}}': formatDate(quote.checkInDate),
      '{{check_out_date}}': formatDate(quote.checkOutDate),
      '{{number_of_nights}}': quote.numberOfNights.toString(),
      '{{number_of_cats}}': quote.numberOfCats.toString(),
      '{{cat_names}}': catNames,
      '{{total_amount}}': formatCurrency(Number(quote.totalAmount)),
      '{{total_discounts}}': formatCurrency(Number(quote.totalDiscounts)),

      // Hotel variables
      '{{hotel_name}}': tenant?.name || '',
      '{{hotel_address}}': hotelAddress,
      '{{hotel_phone}}': tenant?.phone || '',
      '{{hotel_email}}': tenant?.email || '',

      // System variables
      '{{current_date}}': formatDate(new Date()),
      '{{current_year}}': new Date().getFullYear().toString(),
    };
  }

  private substituteVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
  }
}

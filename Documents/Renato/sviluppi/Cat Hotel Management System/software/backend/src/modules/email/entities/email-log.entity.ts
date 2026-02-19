import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { EmailTemplate } from '../../email-templates/entities/email-template.entity';
import { Quote } from '../../quotes/entities/quote.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export interface EmailAttachment {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId: string | null;

  @ManyToOne(() => EmailTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: EmailTemplate | null;

  @Column({ name: 'quote_id', type: 'varchar', length: 36, nullable: true })
  quoteId: string | null;

  @ManyToOne(() => Quote, { nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote | null;

  @Column({ name: 'appointment_id', type: 'varchar', length: 36, nullable: true })
  appointmentId: string | null;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255 })
  recipientEmail: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 200, nullable: true })
  recipientName: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ type: 'json', nullable: true })
  attachments: EmailAttachment[] | null;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;
}

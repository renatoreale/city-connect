import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export interface TemplateVariable {
  name: string;
  description: string;
  example?: string;
}

@Entity('email_templates')
@Unique(['tenantId', 'code'])
export class EmailTemplate extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ name: 'body_text', type: 'text', nullable: true })
  bodyText: string | null;

  @Column({ type: 'json', nullable: true })
  variables: TemplateVariable[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}

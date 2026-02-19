import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Cat } from '../../cats/entities/cat.entity';

@Entity('clients')
export class Client extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Dati anagrafici
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'fiscal_code', type: 'varchar', length: 16, nullable: true })
  fiscalCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  phone1: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone2: string;

  // Indirizzo
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  province: string;

  // Dettagli indirizzo (citofono, piano, etc.)
  @Column({ type: 'varchar', length: 100, nullable: true })
  intercom: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  floor: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  staircase: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  apartment: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mailbox: string;

  // Contatto emergenza
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 200, nullable: true })
  emergencyContactName: string;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 50, nullable: true })
  emergencyContactPhone: string;

  @Column({ name: 'emergency_contact_email', type: 'varchar', length: 255, nullable: true })
  emergencyContactEmail: string;

  @Column({ name: 'emergency_contact_fiscal_code', type: 'varchar', length: 16, nullable: true })
  emergencyContactFiscalCode: string;

  // Veterinario
  @Column({ name: 'veterinarian_name', type: 'varchar', length: 100, nullable: true })
  veterinarianName: string;

  @Column({ name: 'veterinarian_phone', type: 'varchar', length: 50, nullable: true })
  veterinarianPhone: string;

  // Valutazione
  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ name: 'rating_notes', type: 'text', nullable: true })
  ratingNotes: string;

  // Consensi
  @Column({ name: 'privacy_accepted', type: 'boolean', default: false })
  privacyAccepted: boolean;

  @Column({ name: 'health_form_accepted', type: 'boolean', default: false })
  healthFormAccepted: boolean;

  @Column({ name: 'rules_accepted', type: 'boolean', default: false })
  rulesAccepted: boolean;

  // Note
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Blacklist (globale)
  @Column({ name: 'is_blacklisted', type: 'boolean', default: false })
  isBlacklisted: boolean;

  @Column({ name: 'blacklist_reason', type: 'text', nullable: true })
  blacklistReason: string | null;

  @Column({ name: 'blacklisted_at', type: 'timestamp', nullable: true })
  blacklistedAt: Date | null;

  @Column({ name: 'blacklisted_by_tenant_id', type: 'varchar', length: 36, nullable: true })
  blacklistedByTenantId: string | null;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'blacklisted_by_tenant_id' })
  blacklistedByTenant: Tenant;

  @Column({ name: 'blacklisted_by_user_id', type: 'varchar', length: 36, nullable: true })
  blacklistedByUserId: string | null;

  // Stato
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Relazione con gatti
  @OneToMany(() => Cat, (cat) => cat.client)
  cats: Cat[];

  // Helper per nome completo
  get fullName(): string {
    return `${this.lastName} ${this.firstName}`;
  }
}

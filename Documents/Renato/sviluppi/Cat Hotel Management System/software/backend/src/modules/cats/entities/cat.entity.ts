import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';

export enum CatGender {
  MALE = 'M',
  FEMALE = 'F',
}

export enum CatSize {
  NORMALE = 'normale',
  GRANDE = 'grande',
}

@Entity('cats')
export class Cat extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'client_id', type: 'varchar', length: 36 })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.cats)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // Dimensione e gruppo fratelli
  @Column({
    type: 'enum',
    enum: CatSize,
    default: CatSize.NORMALE,
  })
  size: CatSize;

  @Column({ name: 'sibling_group_id', type: 'varchar', length: 36, nullable: true })
  siblingGroupId: string | null;

  // Dati anagrafici
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  breed: string;

  @Column({ name: 'coat_color', type: 'varchar', length: 100, nullable: true })
  coatColor: string;

  @Column({
    type: 'enum',
    enum: CatGender,
    nullable: true,
  })
  gender: CatGender;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg: number;

  @Column({ name: 'microchip_number', type: 'varchar', length: 50, nullable: true })
  microchipNumber: string;

  @Column({ name: 'is_neutered', type: 'boolean', default: false })
  isNeutered: boolean;

  // Dati sanitari
  @Column({ name: 'vaccination_date', type: 'date', nullable: true })
  vaccinationDate: Date;

  @Column({ name: 'fiv_felv_test_date', type: 'date', nullable: true })
  fivFelvTestDate: Date;

  @Column({ name: 'fiv_felv_result', type: 'varchar', length: 50, nullable: true })
  fivFelvResult: string;

  // Medicinali
  @Column({ name: 'requires_medication', type: 'boolean', default: false })
  requiresMedication: boolean;

  @Column({ name: 'medication_notes', type: 'text', nullable: true })
  medicationNotes: string;

  // Alimentazione
  @Column({ name: 'dietary_notes', type: 'text', nullable: true })
  dietaryNotes: string;

  @Column({ type: 'text', nullable: true })
  allergies: string;

  // Comportamento
  @Column({ type: 'varchar', length: 100, nullable: true })
  temperament: string;

  // Note generali
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

  // Predisposizione per allegati futuri
  // attachments: CatAttachment[];
}

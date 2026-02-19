import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['tenantId'])
@Index(['userId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 36 })
  entityId: string;

  @Column({
    type: 'enum',
    enum: AuditOperation,
  })
  operation: AuditOperation;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'user_role', type: 'varchar', length: 50 })
  userRole: string;

  @Column({ name: 'before_data', type: 'json', nullable: true })
  beforeData?: Record<string, any> | null;

  @Column({ name: 'after_data', type: 'json', nullable: true })
  afterData?: Record<string, any> | null;

  @Column({ name: 'changed_fields', type: 'json', nullable: true })
  changedFields?: string[];

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

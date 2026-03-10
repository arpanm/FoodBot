import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100, name: 'entity_type' })
  entityType!: string;

  @Column({ type: 'varchar', length: 255, name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'simple-json', name: 'old_value_json', nullable: true })
  oldValueJson!: Record<string, unknown> | null;

  @Column({ type: 'simple-json', name: 'new_value_json', nullable: true })
  newValueJson!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

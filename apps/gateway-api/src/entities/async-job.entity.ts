import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { JobStatusUpdate } from './job-status-update.entity';
import { User } from './user.entity';

export enum AsyncJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('async_jobs')
@Index(['userId', 'status'])
export class AsyncJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 100 })
  type!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    enum: AsyncJobStatus,
    default: AsyncJobStatus.PENDING,
  })
  status!: AsyncJobStatus;

  @Column({ type: 'simple-json', name: 'input_json', nullable: true })
  inputJson!: Record<string, unknown> | null;

  @Column({ type: 'simple-json', name: 'result_json', nullable: true })
  resultJson!: Record<string, unknown> | null;

  @Column({ type: 'simple-json', name: 'error_json', nullable: true })
  errorJson!: Record<string, unknown> | null;

  @Column({ type: 'integer', default: 0 })
  progress!: number;

  @Column({ type: 'datetime', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @OneToMany(() => JobStatusUpdate, (update) => update.job, { cascade: true })
  statusUpdates!: JobStatusUpdate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

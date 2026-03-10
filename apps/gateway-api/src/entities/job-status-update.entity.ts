import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { AsyncJob } from './async-job.entity';

@Entity('job_status_updates')
export class JobStatusUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => AsyncJob, (job) => job.statusUpdates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: AsyncJob;

  @Column({ type: 'varchar', length: 100, name: 'step_name' })
  stepName!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'simple-json', name: 'metadata_json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

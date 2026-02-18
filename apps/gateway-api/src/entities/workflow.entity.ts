import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WorkflowStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 255, name: 'job_id', unique: true })
  jobId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'session_id' })
  sessionId?: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'varchar',
    enum: WorkflowStatus,
    default: WorkflowStatus.QUEUED,
  })
  status!: string;

  @Column({ type: 'simple-json', nullable: true })
  progress?: {
    currentStep: string;
    totalSteps: number;
    currentStepNumber: number;
  };

  @Column({ type: 'simple-json', nullable: true })
  result?: {
    response: string;
    restaurants?: unknown[];
    dishes?: unknown[];
  };

  @Column({ type: 'simple-json', nullable: true })
  error?: {
    code: string;
    message: string;
  };

  @Column({ type: 'simple-json', nullable: true })
  location?: {
    latitude: number;
    longitude: number;
  };

  @Column({ type: 'simple-json', nullable: true })
  preferences?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

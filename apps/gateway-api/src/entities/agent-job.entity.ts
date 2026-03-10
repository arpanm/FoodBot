import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  AWAITING_USER_ACTION = 'awaiting_user_action',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobAction {
  SEARCH_RESTAURANT = 'search_restaurant',
  OPEN_RESTAURANT = 'open_restaurant',
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT = 'checkout',
  TRACK_ORDER = 'track_order',
}

@Entity('agent_jobs')
export class AgentJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 30,
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status!: JobStatus;

  @Index()
  @Column({
    type: 'varchar',
    length: 30,
    enum: JobAction,
  })
  action!: JobAction;

  @Column({ type: 'varchar', length: 50 })
  platform!: string;

  @Column({ type: 'simple-json' })
  payload!: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  result!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  currentStep!: string | null;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;
}

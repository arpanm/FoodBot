import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Order } from './order.entity';
import { User } from './user.entity';

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  UPI = 'upi',
  WALLET = 'wallet',
}

export enum PaymentEntityStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: PaymentMethod,
  })
  method!: PaymentMethod;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_transaction_id' })
  providerTransactionId!: string | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    enum: PaymentEntityStatus,
    default: PaymentEntityStatus.PENDING,
  })
  status!: PaymentEntityStatus;

  @Column({ type: 'simple-json', name: 'metadata_json', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

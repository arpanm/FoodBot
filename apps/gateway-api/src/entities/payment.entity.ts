import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Order } from './order.entity';

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

  @OneToOne(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
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

  @Column({ type: 'varchar', length: 20 })
  method!: string;

  @Column({ type: 'varchar', length: 20, name: 'payment_method' })
  paymentMethod!: string;

  @Column({
    type: 'varchar',
    enum: PaymentEntityStatus,
    default: PaymentEntityStatus.PENDING,
  })
  status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'transaction_id' })
  transactionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'confirmation_token' })
  confirmationToken?: string;

  @Column({ type: 'simple-json', nullable: true, name: 'refund_details' })
  refundDetails?: {
    refundedAt: string;
    refundAmount: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

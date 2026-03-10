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

import { BulkOrderItem } from './bulk-order-item.entity';
import { User } from './user.entity';

export enum BulkOrderType {
  CORPORATE = 'corporate',
  EVENT = 'event',
  PERSONAL = 'personal',
}

export enum BulkOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('bulk_orders')
export class BulkOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 255, name: 'organization_name' })
  organizationName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'order_type',
    enum: BulkOrderType,
    default: BulkOrderType.PERSONAL,
  })
  orderType!: BulkOrderType;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    enum: BulkOrderStatus,
    default: BulkOrderStatus.DRAFT,
  })
  status!: BulkOrderStatus;

  @Column({ type: 'text', name: 'delivery_address' })
  deliveryAddress!: string;

  @Column({ type: 'date', name: 'delivery_date' })
  deliveryDate!: string;

  @Column({ type: 'varchar', length: 10, name: 'delivery_time' })
  deliveryTime!: string;

  @Column({ type: 'text', name: 'special_instructions', nullable: true })
  specialInstructions!: string | null;

  @Column({ type: 'integer', name: 'total_items', default: 0 })
  totalItems!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_amount', default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'tax_amount', default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'delivery_fee', default: 0 })
  deliveryFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount', default: 0 })
  totalAmount!: number;

  @OneToMany(() => BulkOrderItem, (item) => item.bulkOrder, {
    cascade: true,
    eager: false,
  })
  items!: BulkOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

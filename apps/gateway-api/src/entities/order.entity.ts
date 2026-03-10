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

import { Address } from './address.entity';
import { Feedback } from './feedback.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { Restaurant } from './restaurant.entity';
import { Review } from './review.entity';
import { User } from './user.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  DINE_IN = 'dine_in',
}

export enum OrderPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant!: Restaurant;

  @Index()
  @Column({ type: 'uuid', name: 'address_id', nullable: true })
  addressId!: string | null;

  @ManyToOne(() => Address, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'address_id' })
  address!: Address | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'order_type',
    enum: OrderType,
    default: OrderType.DELIVERY,
  })
  orderType!: OrderType;

  @Column({ type: 'simple-json', name: 'items_json', nullable: true })
  itemsJson!: Record<string, unknown>[] | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'delivery_fee' })
  deliveryFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'varchar', length: 20, name: 'payment_method' })
  paymentMethod!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: OrderPaymentStatus,
    default: OrderPaymentStatus.PENDING,
    name: 'payment_status',
  })
  paymentStatus!: OrderPaymentStatus;

  @Column({ type: 'text', nullable: true, name: 'special_instructions' })
  specialInstructions!: string | null;

  @Column({ type: 'datetime', name: 'estimated_delivery_at', nullable: true })
  estimatedDeliveryAt!: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'actual_delivery_at' })
  actualDeliveryAt!: Date | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items!: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @OneToMany(() => Feedback, (feedback) => feedback.order)
  feedbacks!: Feedback[];

  @OneToMany(() => Review, (review) => review.order)
  reviews!: Review[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

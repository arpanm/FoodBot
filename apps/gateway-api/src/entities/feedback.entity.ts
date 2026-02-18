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
import { User } from './user.entity';
import { Order } from './order.entity';
import { Restaurant } from './restaurant.entity';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid', name: 'restaurant_id', nullable: true })
  restaurantId?: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.feedbacks, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant?: Restaurant;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'integer', name: 'food_quality' })
  foodQuality!: number;

  @Column({ type: 'integer', name: 'delivery_speed' })
  deliverySpeed!: number;

  @Column({ type: 'integer' })
  packaging!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

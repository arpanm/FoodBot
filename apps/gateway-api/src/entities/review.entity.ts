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

import { Dish } from './dish.entity';
import { Order } from './order.entity';
import { Restaurant } from './restaurant.entity';
import { User } from './user.entity';

export enum ReviewStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  FLAGGED = 'flagged',
  REMOVED = 'removed',
}

@Entity('reviews')
@Index(['restaurantId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Index()
  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant!: Restaurant;

  @Column({ type: 'uuid', name: 'dish_id', nullable: true })
  dishId!: string | null;

  @ManyToOne(() => Dish, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dish_id' })
  dish!: Dish | null;

  @Column({ type: 'integer' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'simple-json', name: 'images_json', nullable: true })
  imagesJson!: string[] | null;

  @Column({ type: 'boolean', default: false, name: 'is_anonymous' })
  isAnonymous!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ReviewStatus,
    default: ReviewStatus.ACTIVE,
  })
  status!: ReviewStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

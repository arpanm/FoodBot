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

import { Dish } from './dish.entity';
import { Feedback } from './feedback.entity';
import { MenuCategory } from './menu-category.entity';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { User } from './user.entity';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.restaurants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'simple-json', name: 'cuisine_types' })
  cuisineTypes!: string[];

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lat!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  lng!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ type: 'integer', default: 0, name: 'total_ratings' })
  totalRatings!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'simple-json', name: 'opening_hours_json', nullable: true })
  openingHoursJson!: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10, name: 'delivery_radius_km' })
  deliveryRadiusKm!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'min_order_amount' })
  minOrderAmount!: number;

  @Column({ type: 'integer', default: 30, name: 'avg_delivery_time_mins' })
  avgDeliveryTimeMins!: number;

  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'varchar', length: 500, name: 'banner_url', nullable: true })
  bannerUrl!: string | null;

  @OneToMany(() => MenuCategory, (category) => category.restaurant)
  menuCategories!: MenuCategory[];

  @OneToMany(() => Dish, (dish) => dish.restaurant)
  dishes!: Dish[];

  @OneToMany(() => Order, (order) => order.restaurant)
  orders!: Order[];

  @OneToMany(() => Feedback, (feedback) => feedback.restaurant)
  feedbacks!: Feedback[];

  @OneToMany(() => Review, (review) => review.restaurant)
  reviews!: Review[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

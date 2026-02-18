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
import { User } from './user.entity';
import { Dish } from './dish.entity';
import { Order } from './order.entity';
import { Feedback } from './feedback.entity';

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

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'simple-array', default: '' })
  cuisineTypes!: string[];

  @Column({ type: 'simple-json' })
  address!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, name: 'phone_number', default: '' })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  email!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ type: 'integer', default: 0, name: 'review_count' })
  reviewCount!: number;

  @Column({ type: 'varchar', length: 20, default: 'moderate', name: 'price_range' })
  priceRange!: string;

  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_approved' })
  isApproved!: boolean;

  @Column({ type: 'simple-json', name: 'operating_hours', nullable: true })
  operatingHours!: Record<string, unknown>;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  longitude!: number;

  @Column({ type: 'simple-array', default: '' })
  images!: string[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10, name: 'delivery_radius' })
  deliveryRadius!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'minimum_order' })
  minimumOrder!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'delivery_fee' })
  deliveryFee!: number;

  @Column({ type: 'integer', default: 30, name: 'preparation_time' })
  preparationTime!: number;

  @OneToMany(() => Dish, (dish) => dish.restaurant)
  dishes!: Dish[];

  @OneToMany(() => Order, (order) => order.restaurant)
  orders!: Order[];

  @OneToMany(() => Feedback, (feedback) => feedback.restaurant)
  feedbacks!: Feedback[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

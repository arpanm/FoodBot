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

import { Restaurant } from './restaurant.entity';

@Entity('dishes')
export class Dish {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.dishes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant!: Restaurant;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  category!: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'discounted_price' })
  discountedPrice?: number;

  @Column({ type: 'simple-array', default: '' })
  images!: string[];

  @Column({ type: 'boolean', default: false, name: 'is_vegetarian' })
  isVegetarian!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_vegan' })
  isVegan!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_gluten_free' })
  isGlutenFree!: boolean;

  @Column({ type: 'simple-array', default: '' })
  allergens!: string[];

  @Column({ type: 'varchar', length: 20, default: 'none', name: 'spice_level' })
  spiceLevel!: string;

  @Column({ type: 'integer', nullable: true })
  calories?: number;

  @Column({ type: 'integer', default: 15, name: 'preparation_time' })
  preparationTime!: number;

  @Column({ type: 'boolean', default: true, name: 'is_available' })
  isAvailable!: boolean;

  @Column({ type: 'simple-array', default: '' })
  tags!: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ type: 'integer', default: 0, name: 'total_reviews' })
  totalReviews!: number;

  @Column({ type: 'simple-array', nullable: true })
  ingredients?: string[];

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'portion_size' })
  portionSize?: string;

  @Column({ type: 'simple-array', nullable: true, name: 'dietary_tags' })
  dietaryTags?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

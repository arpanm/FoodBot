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

import { MenuCategory } from './menu-category.entity';
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

  @Index()
  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => MenuCategory, (category) => category.dishes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category!: MenuCategory | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'discounted_price' })
  discountedPrice!: number | null;

  @Column({ type: 'varchar', length: 500, name: 'image_url', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_veg' })
  isVeg!: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_available' })
  isAvailable!: boolean;

  @Column({ type: 'integer', default: 15, name: 'prep_time_mins' })
  prepTimeMins!: number;

  @Column({ type: 'integer', nullable: true })
  calories!: number | null;

  @Column({ type: 'simple-json', name: 'allergens_json', nullable: true })
  allergensJson!: string[] | null;

  @Column({ type: 'simple-json', name: 'tags_json', nullable: true })
  tagsJson!: string[] | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ type: 'integer', default: 0, name: 'total_ratings' })
  totalRatings!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

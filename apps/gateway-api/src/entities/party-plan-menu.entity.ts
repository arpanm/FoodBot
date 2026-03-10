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

import { PartyPlan } from './party-plan.entity';

export enum MenuCategory {
  STARTER = 'starter',
  MAIN = 'main',
  DESSERT = 'dessert',
  BEVERAGE = 'beverage',
}

export enum DietaryType {
  VEG = 'veg',
  NON_VEG = 'non_veg',
  VEGAN = 'vegan',
}

@Entity('party_plan_menus')
export class PartyPlanMenu {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'party_plan_id' })
  partyPlanId!: string;

  @ManyToOne(() => PartyPlan, (plan) => plan.menuItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_plan_id' })
  partyPlan!: PartyPlan;

  @Column({ type: 'uuid', name: 'dish_id' })
  dishId!: string;

  @Column({ type: 'varchar', length: 255, name: 'dish_name' })
  dishName!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'varchar', length: 255, name: 'restaurant_name' })
  restaurantName!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_unit' })
  pricePerUnit!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice!: number;

  @Column({
    type: 'varchar',
    length: 20,
    enum: MenuCategory,
  })
  category!: MenuCategory;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'dietary_type',
    enum: DietaryType,
  })
  dietaryType!: DietaryType;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { DietPlan } from './diet-plan.entity';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

@Entity('diet_plan_meals')
export class DietPlanMeal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'diet_plan_id' })
  dietPlanId!: string;

  @ManyToOne(() => DietPlan, (plan) => plan.meals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'diet_plan_id' })
  dietPlan!: DietPlan;

  @Column({ type: 'integer', name: 'day_of_week' })
  dayOfWeek!: number;

  @Column({ type: 'varchar', length: 20, name: 'meal_type' })
  mealType!: MealType;

  @Column({ type: 'uuid', name: 'dish_id' })
  dishId!: string;

  @Column({ type: 'varchar', length: 255, name: 'dish_name' })
  dishName!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'varchar', length: 255, name: 'restaurant_name' })
  restaurantName!: string;

  @Column({ type: 'integer', default: 0 })
  calories!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  protein!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  carbs!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  fats!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'text', name: 'delivery_address', nullable: true })
  deliveryAddress!: string | null;

  @Column({ type: 'boolean', name: 'is_skipped', default: false })
  isSkipped!: boolean;

  @Column({ type: 'boolean', name: 'is_locked', default: false })
  isLocked!: boolean;

  @Column({ type: 'text', name: 'special_instructions', nullable: true })
  specialInstructions!: string | null;

  @Column({ type: 'datetime', name: 'scheduled_order_time', nullable: true })
  scheduledOrderTime!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

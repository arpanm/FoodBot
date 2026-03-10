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

import { DietPlanMeal } from './diet-plan-meal.entity';
import { HealthProfile } from './health-profile.entity';
import { User } from './user.entity';

export type DietPlanStatus = 'active' | 'paused' | 'completed' | 'cancelled';

@Entity('diet_plans')
export class DietPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ type: 'uuid', name: 'health_profile_id' })
  healthProfileId!: string;

  @ManyToOne(() => HealthProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'health_profile_id' })
  healthProfile!: HealthProfile;

  @Column({ type: 'datetime', name: 'week_start_date' })
  weekStartDate!: Date;

  @Column({ type: 'datetime', name: 'week_end_date' })
  weekEndDate!: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status!: DietPlanStatus;

  @Column({ type: 'integer', name: 'total_calories', default: 0 })
  totalCalories!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_cost', default: 0 })
  totalCost!: number;

  @Column({ type: 'boolean', name: 'auto_renewal', default: false })
  autoRenewal!: boolean;

  @OneToMany(() => DietPlanMeal, (meal) => meal.dietPlan, {
    cascade: true,
    eager: false,
  })
  meals!: DietPlanMeal[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

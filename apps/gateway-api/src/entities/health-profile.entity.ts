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

export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'very_active';

export type HealthGoal = 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_building';

export type DietaryPreference =
  | 'veg'
  | 'non_veg'
  | 'vegan'
  | 'eggetarian'
  | 'keto'
  | 'paleo';

@Entity('health_profiles')
export class HealthProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'target_weight' })
  targetWeight!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  height!: number;

  @Column({ type: 'integer' })
  age!: number;

  @Column({ type: 'varchar', length: 10 })
  gender!: Gender;

  @Column({ type: 'varchar', length: 20, name: 'activity_level' })
  activityLevel!: ActivityLevel;

  @Column({ type: 'varchar', length: 20, name: 'health_goal' })
  healthGoal!: HealthGoal;

  @Column({ type: 'simple-json', name: 'medical_conditions', nullable: true })
  medicalConditions!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  allergies!: string[] | null;

  @Column({ type: 'varchar', length: 20, name: 'dietary_preference' })
  dietaryPreference!: DietaryPreference;

  @Column({ type: 'integer', name: 'calorie_target', nullable: true })
  calorieTarget!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'protein_ratio', default: 0.3 })
  proteinRatio!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'carb_ratio', default: 0.4 })
  carbRatio!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'fat_ratio', default: 0.3 })
  fatRatio!: number;

  @Column({ type: 'integer', name: 'meal_frequency', default: 4 })
  mealFrequency!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'daily_budget', nullable: true })
  dailyBudget!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

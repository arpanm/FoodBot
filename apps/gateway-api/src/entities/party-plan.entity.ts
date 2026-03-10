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

import { PartyPlanMenu } from './party-plan-menu.entity';
import { User } from './user.entity';

export enum PartyPlanStatus {
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  ORDERED = 'ordered',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum EventType {
  BIRTHDAY = 'birthday',
  CORPORATE = 'corporate',
  WEDDING = 'wedding',
  CASUAL = 'casual',
  FESTIVAL = 'festival',
  OTHER = 'other',
}

export enum ServiceType {
  DELIVERY = 'delivery',
  CATERING = 'catering',
  PICKUP = 'pickup',
}

@Entity('party_plans')
export class PartyPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 255, name: 'event_name' })
  eventName!: string;

  @Column({ type: 'date', name: 'event_date' })
  eventDate!: string;

  @Column({ type: 'varchar', length: 10, name: 'event_time' })
  eventTime!: string;

  @Column({ type: 'text', name: 'venue_address' })
  venueAddress!: string;

  @Column({ type: 'simple-json', name: 'guest_count' })
  guestCount!: {
    total: number;
    veg: number;
    nonVeg: number;
    vegan: number;
  };

  @Column({ type: 'simple-json' })
  budget!: {
    total: number;
    perPerson: number;
  };

  @Column({ type: 'simple-json', name: 'cuisine_preferences' })
  cuisinePreferences!: string[];

  @Column({ type: 'simple-json', name: 'course_preferences' })
  coursePreferences!: string[];

  @Column({ type: 'text', name: 'special_requirements', nullable: true })
  specialRequirements!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'event_type',
    enum: EventType,
    default: EventType.OTHER,
  })
  eventType!: EventType;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'service_type',
    enum: ServiceType,
    default: ServiceType.DELIVERY,
  })
  serviceType!: ServiceType;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    enum: PartyPlanStatus,
    default: PartyPlanStatus.PLANNING,
  })
  status!: PartyPlanStatus;

  @OneToMany(() => PartyPlanMenu, (menu) => menu.partyPlan, {
    cascade: true,
    eager: false,
  })
  menuItems!: PartyPlanMenu[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

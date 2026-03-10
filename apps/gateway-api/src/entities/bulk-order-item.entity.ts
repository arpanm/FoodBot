import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { BulkOrder } from './bulk-order.entity';

export enum QuantityTier {
  STANDARD = 'standard',
  BULK_10 = 'bulk_10',
  BULK_25 = 'bulk_25',
  BULK_50 = 'bulk_50',
  BULK_100 = 'bulk_100',
}

@Entity('bulk_order_items')
export class BulkOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'bulk_order_id' })
  bulkOrderId!: string;

  @ManyToOne(() => BulkOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bulk_order_id' })
  bulkOrder!: BulkOrder;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'varchar', length: 255, name: 'restaurant_name' })
  restaurantName!: string;

  @Column({ type: 'uuid', name: 'dish_id' })
  dishId!: string;

  @Column({ type: 'varchar', length: 255, name: 'dish_name' })
  dishName!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice!: number;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'quantity_tier',
    enum: QuantityTier,
    default: QuantityTier.STANDARD,
  })
  quantityTier!: QuantityTier;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'discount_percentage',
    default: 0,
  })
  discountPercentage!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

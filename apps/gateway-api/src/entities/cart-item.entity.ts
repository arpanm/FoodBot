import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cart } from './cart.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'cart_id' })
  cartId!: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @Column({ type: 'varchar', length: 255, name: 'dish_id' })
  dishId!: string;

  @Column({ type: 'varchar', length: 255, name: 'dish_name' })
  dishName!: string;

  @Column({ type: 'varchar', length: 255, name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price!: number;

  @Column({ type: 'text', nullable: true, name: 'special_instructions' })
  specialInstructions?: string;
}

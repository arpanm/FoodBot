import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Cart } from './cart.entity';
import { Dish } from './dish.entity';

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

  @Index()
  @Column({ type: 'uuid', name: 'dish_id' })
  dishId!: string;

  @ManyToOne(() => Dish, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dish_id' })
  dish!: Dish;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'simple-json', name: 'customizations_json', nullable: true })
  customizationsJson!: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice!: number;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartItem } from '../../entities/cart-item.entity';
import { Cart } from '../../entities/cart.entity';
import { AuthModule } from '../auth/auth.module';
import { DishModule } from '../dish/dish.module';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem]), AuthModule, DishModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

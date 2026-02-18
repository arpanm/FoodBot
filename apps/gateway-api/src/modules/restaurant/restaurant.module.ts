import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { AuthModule } from '../auth/auth.module';
import { Restaurant } from '../../entities/restaurant.entity';
import { Dish } from '../../entities/dish.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Dish]), AuthModule],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}

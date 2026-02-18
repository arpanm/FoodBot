import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DishController } from './dish.controller';
import { DishService } from './dish.service';
import { AuthModule } from '../auth/auth.module';
import { Dish } from '../../entities/dish.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dish]), AuthModule],
  controllers: [DishController],
  providers: [DishService],
  exports: [DishService],
})
export class DishModule {}

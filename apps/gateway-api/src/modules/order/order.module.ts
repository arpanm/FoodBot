import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderItem } from '../../entities/order-item.entity';
import { Order } from '../../entities/order.entity';
import { AuthModule } from '../auth/auth.module';

import { OrderController } from './order.controller';
import { OrderRoutingService } from './order-routing.service';
import { OrderSagaService } from './order-saga.service';
import { OrderStatusService } from './order-status.service';
import { OrderService } from './order.service';
import { ScheduledOrderService } from './scheduled-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), AuthModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderSagaService,
    ScheduledOrderService,
    OrderStatusService,
    OrderRoutingService,
  ],
  exports: [OrderService, OrderStatusService, ScheduledOrderService],
})
export class OrderModule {}

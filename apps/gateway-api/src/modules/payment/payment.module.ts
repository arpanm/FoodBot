import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { Payment } from '../../entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), AuthModule, OrderModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

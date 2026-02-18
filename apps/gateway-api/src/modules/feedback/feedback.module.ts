import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { Feedback } from '../../entities/feedback.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback]), AuthModule, OrderModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}

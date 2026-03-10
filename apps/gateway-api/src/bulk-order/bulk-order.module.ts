import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BulkOrderItem } from '../entities/bulk-order-item.entity';
import { BulkOrder } from '../entities/bulk-order.entity';
import { AuthModule } from '../modules/auth/auth.module';

import { BulkDeliveryService } from './bulk-delivery.service';
import { BulkOrderController } from './bulk-order.controller';
import { BulkOrderService } from './bulk-order.service';
import { BulkPricingService } from './bulk-pricing.service';
import { CapacityValidatorService } from './capacity-validator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BulkOrder, BulkOrderItem]),
    AuthModule,
  ],
  controllers: [BulkOrderController],
  providers: [
    BulkOrderService,
    BulkPricingService,
    BulkDeliveryService,
    CapacityValidatorService,
  ],
  exports: [BulkOrderService],
})
export class BulkOrderModule {}

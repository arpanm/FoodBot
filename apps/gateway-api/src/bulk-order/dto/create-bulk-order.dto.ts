import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';

import { BulkOrderType } from '../../entities/bulk-order.entity';

export class CreateBulkOrderDto {
  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @IsEnum(BulkOrderType)
  orderType!: BulkOrderType;

  @IsString()
  @IsNotEmpty()
  deliveryAddress!: string;

  @IsDateString()
  deliveryDate!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'deliveryTime must be in HH:mm format' })
  deliveryTime!: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

/**
 * Scheduled Order DTOs
 *
 * Validated input for creating and modifying scheduled orders.
 * Supports future order placement with modification windows.
 */

import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsObject,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';

class ScheduledOrderItemDto {
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @IsOptional()
  @IsString()
  dishName?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class CreateScheduledOrderDto {
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Cart is empty' })
  @ValidateNested({ each: true })
  @Type(() => ScheduledOrderItemDto)
  items!: ScheduledOrderItemDto[];

  @IsObject({ message: 'deliveryAddress must be an object' })
  @IsNotEmpty({ message: 'deliveryAddress should not be empty' })
  deliveryAddress!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @IsDateString({}, { message: 'scheduledTime must be a valid ISO 8601 date' })
  scheduledTime!: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class ModifyScheduledOrderDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Items array must not be empty' })
  @ValidateNested({ each: true })
  @Type(() => ScheduledOrderItemDto)
  items?: ScheduledOrderItemDto[];

  @IsOptional()
  @IsObject()
  deliveryAddress?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString({}, { message: 'scheduledTime must be a valid ISO 8601 date' })
  scheduledTime?: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

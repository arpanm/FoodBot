import { IsString, IsNotEmpty, IsArray, IsObject, IsOptional, ValidateNested, IsNumber, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsOptional()
  @IsString()
  id?: string;

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

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Cart is empty' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsObject({ message: 'deliveryAddress must be an object' })
  @IsNotEmpty({ message: 'deliveryAddress should not be empty' })
  deliveryAddress!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

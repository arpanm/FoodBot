import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsUUID,
} from 'class-validator';

export class AddBulkItemDto {
  @IsUUID()
  restaurantId!: string;

  @IsString()
  @IsNotEmpty()
  restaurantName!: string;

  @IsUUID()
  dishId!: string;

  @IsString()
  @IsNotEmpty()
  dishName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class AddItemDto {
  @IsString({ message: 'dishId must be a string' })
  @IsNotEmpty({ message: 'dishId should not be empty' })
  dishId!: string;

  @IsNumber()
  @Min(1, { message: 'quantity must be at least 1' })
  quantity!: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class UpdateItemDto {
  @IsNumber()
  @Min(1, { message: 'quantity must be at least 1' })
  quantity!: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class UpdateMealDto {
  @IsOptional()
  @IsString()
  dishId?: string;

  @IsOptional()
  @IsString()
  dishName?: string;

  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  restaurantName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fats?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class ReplaceMealDto {
  @IsOptional()
  @IsString()
  preferredCuisine?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';

import { MenuCategory, DietaryType } from '../../entities/party-plan-menu.entity';

export class UpdateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @IsString()
  @IsNotEmpty()
  dishName!: string;

  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @IsString()
  @IsNotEmpty()
  restaurantName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  pricePerUnit!: number;

  @IsNumber()
  @Min(0)
  totalPrice!: number;

  @IsEnum(MenuCategory)
  category!: MenuCategory;

  @IsEnum(DietaryType)
  dietaryType!: DietaryType;
}

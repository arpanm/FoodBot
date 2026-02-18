import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsArray,
  IsOptional,
  IsNumber,
  IsObject,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsObject()
  @IsNotEmpty()
  address!: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  cuisineTypes!: string[];

  @IsString()
  priceRange!: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @Matches(/^[\d\s\+\-\(\)x\.]{7,}$/, { message: 'phoneNumber must be in international format' })
  phoneNumber!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsObject()
  operatingHours?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsNumber()
  deliveryRadius?: number;

  @IsOptional()
  @IsNumber()
  minimumOrder?: number;

  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  preparationTime?: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  totalReviews?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}

import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString({ message: 'orderId must be a string' })
  @IsNotEmpty({ message: 'orderId should not be empty' })
  orderId!: string;

  @IsNumber()
  @Min(1, { message: 'rating must be between 1 and 5' })
  @Max(5, { message: 'rating must be between 1 and 5' })
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'comment must be at most 5000 characters' })
  comment?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'foodQuality must be between 1 and 5' })
  @Max(5, { message: 'foodQuality must be between 1 and 5' })
  foodQuality?: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'deliverySpeed must be between 1 and 5' })
  @Max(5, { message: 'deliverySpeed must be between 1 and 5' })
  deliverySpeed?: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'packaging must be between 1 and 5' })
  @Max(5, { message: 'packaging must be between 1 and 5' })
  packaging?: number;
}

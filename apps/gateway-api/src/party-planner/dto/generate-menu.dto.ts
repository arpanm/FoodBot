import {
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class GenerateMenuDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coursePreferences?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBudgetPerPerson?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  startersCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  mainsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  dessertsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  beveragesCount?: number;
}

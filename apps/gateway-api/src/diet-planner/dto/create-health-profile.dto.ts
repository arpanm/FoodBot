import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateHealthProfileDto {
  @IsNumber()
  @Min(20)
  @Max(300)
  weight!: number;

  @IsNumber()
  @Min(20)
  @Max(300)
  targetWeight!: number;

  @IsNumber()
  @Min(100)
  @Max(250)
  height!: number;

  @IsNumber()
  @Min(10)
  @Max(120)
  age!: number;

  @IsEnum(['male', 'female', 'other'])
  gender!: 'male' | 'female' | 'other';

  @IsEnum(['sedentary', 'moderate', 'active', 'very_active'])
  activityLevel!: 'sedentary' | 'moderate' | 'active' | 'very_active';

  @IsEnum(['weight_loss', 'weight_gain', 'maintenance', 'muscle_building'])
  healthGoal!: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_building';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsEnum(['veg', 'non_veg', 'vegan', 'eggetarian', 'keto', 'paleo'])
  dietaryPreference!: 'veg' | 'non_veg' | 'vegan' | 'eggetarian' | 'keto' | 'paleo';

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(5000)
  calorieTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  proteinRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  carbRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  fatRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(6)
  mealFrequency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyBudget?: number;
}

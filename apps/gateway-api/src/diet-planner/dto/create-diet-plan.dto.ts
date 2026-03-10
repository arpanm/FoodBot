import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateDietPlanDto {
  @IsString()
  healthProfileId!: string;

  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;
}

export class UpdateDietPlanDto {
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}

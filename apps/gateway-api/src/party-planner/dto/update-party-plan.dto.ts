import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  ValidateNested,
  Matches,
} from 'class-validator';

import { EventType, ServiceType } from '../../entities/party-plan.entity';

class GuestCountUpdateDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  total?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  veg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nonVeg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vegan?: number;
}

class BudgetUpdateDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perPerson?: number;
}

export class UpdatePartyPlanDto {
  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'eventTime must be in HH:mm format' })
  eventTime?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GuestCountUpdateDto)
  guestCount?: GuestCountUpdateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetUpdateDto)
  budget?: BudgetUpdateDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coursePreferences?: string[];

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;
}

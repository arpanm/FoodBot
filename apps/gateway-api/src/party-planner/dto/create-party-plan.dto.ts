import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  ValidateNested,
  Matches,
  ArrayMinSize,
} from 'class-validator';

import { EventType, ServiceType } from '../../entities/party-plan.entity';

class GuestCountDto {
  @IsNumber()
  @Min(1)
  total!: number;

  @IsNumber()
  @Min(0)
  veg!: number;

  @IsNumber()
  @Min(0)
  nonVeg!: number;

  @IsNumber()
  @Min(0)
  vegan!: number;
}

class BudgetDto {
  @IsNumber()
  @Min(0)
  total!: number;

  @IsNumber()
  @Min(0)
  perPerson!: number;
}

export class CreatePartyPlanDto {
  @IsString()
  @IsNotEmpty()
  eventName!: string;

  @IsDateString()
  eventDate!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'eventTime must be in HH:mm format' })
  eventTime!: string;

  @IsString()
  @IsNotEmpty()
  venueAddress!: string;

  @ValidateNested()
  @Type(() => GuestCountDto)
  guestCount!: GuestCountDto;

  @ValidateNested()
  @Type(() => BudgetDto)
  budget!: BudgetDto;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one cuisine preference is required' })
  @IsString({ each: true })
  cuisinePreferences!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one course preference is required' })
  @IsString({ each: true })
  coursePreferences!: string[];

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsEnum(EventType)
  eventType!: EventType;

  @IsEnum(ServiceType)
  serviceType!: ServiceType;
}

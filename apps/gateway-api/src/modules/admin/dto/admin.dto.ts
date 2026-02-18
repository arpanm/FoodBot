import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class ApproveRestaurantDto {
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class RejectRestaurantDto {
  @IsString({ message: 'rejectionReason is required' })
  @IsNotEmpty({ message: 'rejectionReason should not be empty' })
  rejectionReason!: string;
}

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;
}

import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsString({ message: 'orderId must be a string' })
  @IsNotEmpty({ message: 'orderId should not be empty' })
  orderId!: string;

  @IsNumber()
  @Min(0.01, { message: 'amount must be positive' })
  amount!: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @IsOptional()
  @IsObject()
  cardDetails?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  upiId?: string;
}

export class ConfirmPaymentDto {
  @IsString({ message: 'paymentId must be a string' })
  @IsNotEmpty({ message: 'paymentId should not be empty' })
  paymentId!: string;

  @IsString()
  @IsNotEmpty()
  confirmationToken!: string;
}

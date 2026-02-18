import { IsString, IsNotEmpty, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString({ message: 'userId must be a string' })
  @IsNotEmpty({ message: 'userId should not be empty' })
  userId!: string;

  @IsString({ message: 'message must be a string' })
  @IsNotEmpty({ message: 'message should not be empty' })
  @MinLength(1, { message: 'message must not be empty' })
  @MaxLength(2000, { message: 'message must be at most 2000 characters' })
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  location?: {
    latitude: number;
    longitude: number;
  };

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

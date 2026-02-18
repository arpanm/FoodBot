import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'token must be a string' })
  @IsNotEmpty({ message: 'token should not be empty' })
  token!: string;
}

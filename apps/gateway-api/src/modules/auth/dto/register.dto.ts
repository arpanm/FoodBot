import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'email should not be empty' })
  email!: string;

  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password should not be empty' })
  @MinLength(12, { message: 'password must be at least 12 characters long' })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'password must contain uppercase, lowercase, number and special character' }
  )
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[\d\s\+\-\(\)x\.]{7,}$/, { message: 'phoneNumber must be in international format' })
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  role?: string = 'customer';
}

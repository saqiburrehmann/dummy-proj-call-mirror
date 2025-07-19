import {
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Saqib Ahmed', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'saqib@example.com', description: 'Email address' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: '+923001234567', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'securePassword123',
    minLength: 6,
    maxLength: 32,
    description: 'Password',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Must match the password field',
  })
  @IsString()
  @MinLength(6)
  @Matches('password')
  confirmPassword: string;
}

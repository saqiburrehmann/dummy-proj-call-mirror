import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FlatContactResponseDto {
  @ApiProperty({ example: 'uuid-contact-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'example@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'Example User' })
  @Expose()
  fullName: string;

  @ApiProperty({ example: '+923001234567' })
  @Expose()
  phone: string;
}

import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContactResponseDto } from 'src/contact/dto/response-contact.dto';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid-user-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'saqib@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'User FullName' })
  @Expose()
  fullName: string;

  @ApiProperty()
  @Expose()
  phone: string;

  // @Expose()
  // contacts?: ContactResponseDto[];
}

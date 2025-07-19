import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from 'src/user/dto/response.-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({ example: 'uuid-contact-id' })
  @Expose()
  id: string;

  @ApiProperty({ type: () => UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  contactUser: UserResponseDto;
}

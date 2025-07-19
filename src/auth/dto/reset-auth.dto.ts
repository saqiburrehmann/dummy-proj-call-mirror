import { PartialType } from '@nestjs/mapped-types';
import { LoginAuthDto } from './login-auth.dto';

export class UpdateAuthDto extends PartialType(LoginAuthDto) {}

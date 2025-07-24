import { IsUUID, IsEnum, IsOptional, IsNumber } from 'class-validator';

export class CreateCallDto {
  @IsUUID()
  callerId: string;

  @IsUUID()
  receiverId: string;

  @IsEnum(['missed', 'completed', 'rejected'])
  status: 'missed' | 'completed' | 'rejected';

  @IsOptional()
  @IsNumber()
  duration?: number;
}

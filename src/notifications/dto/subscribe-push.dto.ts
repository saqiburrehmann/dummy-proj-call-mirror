import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsObject()
  keys: {
    p256dh: string;
    auth: string;
  };
}

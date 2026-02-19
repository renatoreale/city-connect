import { IsString, IsNotEmpty } from 'class-validator';

export class BlacklistClientDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

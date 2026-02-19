import { IsString, IsNotEmpty } from 'class-validator';

export class BlacklistCatDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

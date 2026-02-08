import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateDailyOverrideDto {
  @IsDateString()
  overrideDate: string;

  @IsString()
  @MinLength(1)
  reason: string;
}

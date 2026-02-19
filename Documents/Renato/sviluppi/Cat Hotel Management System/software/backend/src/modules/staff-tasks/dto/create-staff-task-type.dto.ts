import { IsString, IsOptional, IsBoolean, MaxLength, Matches } from 'class-validator';

export class CreateStaffTaskTypeDto {
  @IsString()
  @MaxLength(100)
  name: string;

  /**
   * Colore esadecimale opzionale per il calendario (es. "#FF5733").
   */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve essere un colore esadecimale valido (es. #FF5733)' })
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

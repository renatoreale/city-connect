import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateTenantPriceOverrideDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  highSeasonPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

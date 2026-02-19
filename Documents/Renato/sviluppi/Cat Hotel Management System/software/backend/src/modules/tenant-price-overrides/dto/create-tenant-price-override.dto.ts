import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTenantPriceOverrideDto {
  @IsUUID()
  priceListItemId: string;

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

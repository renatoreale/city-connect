import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
  IsDateString,
  IsIn,
} from 'class-validator';

export class AddLineItemDto {
  @IsString()
  @MaxLength(50)
  itemCode: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  appliesToCatCount?: number;

  // Per segmenti di soggiorno manuali
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['high', 'low'])
  seasonType?: 'high' | 'low';

  // Per servizi per_km: numero di km da percorrere
  @IsOptional()
  @IsInt()
  @Min(1)
  km?: number;

  // Override manuale del prezzo totale (se non si vuole il calcolo automatico)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class UpdateLineItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  appliesToCatCount?: number;
}

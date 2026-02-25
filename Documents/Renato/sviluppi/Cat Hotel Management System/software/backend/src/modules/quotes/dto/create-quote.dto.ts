import {
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AccommodationSegmentDto {
  @IsString()
  @MaxLength(50)
  itemCode: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsIn(['high', 'low'])
  seasonType: 'high' | 'low';
}

export class ExtraServiceDto {
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

  @IsOptional()
  @IsInt()
  @Min(1)
  km?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class CreateQuoteDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsUUID()
  clientId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  catIds: string[];

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accommodationItemCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccommodationSegmentDto)
  accommodationSegments?: AccommodationSegmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraServiceDto)
  extraServices?: ExtraServiceDto[];

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';

export class CalculatePriceItemDto {
  @IsString()
  itemCode: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CalculatePriceDto {
  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsInt()
  @Min(1)
  numberOfCats: number;

  @IsOptional()
  @IsArray()
  extraServices?: CalculatePriceItemDto[];
}

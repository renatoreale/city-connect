import {
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';

export class UpdateQuoteDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  catIds?: string[];

  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

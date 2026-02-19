import { IsUUID, IsOptional, IsString } from 'class-validator';

export class ConvertQuoteDto {
  @IsUUID()
  quoteId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

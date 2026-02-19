import { IsEnum } from 'class-validator';
import { QuoteStatus } from '../entities/quote.entity';

export class UpdateStatusDto {
  @IsEnum(QuoteStatus)
  status: QuoteStatus;
}

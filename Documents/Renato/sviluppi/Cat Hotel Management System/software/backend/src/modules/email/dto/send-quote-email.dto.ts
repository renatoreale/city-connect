import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class SendQuoteEmailDto {
  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;
}

export class PreviewEmailDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  templateCode?: string;
}

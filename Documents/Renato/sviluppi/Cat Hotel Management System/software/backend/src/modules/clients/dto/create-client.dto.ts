import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateClientDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  fiscalCode?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsString()
  @MaxLength(50)
  phone1: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  intercom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  staircase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  apartment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mailbox?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  emergencyContactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  emergencyContactFiscalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  veterinarianName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  veterinarianPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  ratingNotes?: string;

  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  healthFormAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  rulesAccepted?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

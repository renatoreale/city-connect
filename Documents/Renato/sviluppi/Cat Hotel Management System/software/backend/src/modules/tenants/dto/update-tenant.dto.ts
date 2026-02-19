import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  postalCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsEmail({}, { message: 'Email non valida' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  vatNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  fiscalCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { CatGender, CatSize } from '../entities/cat.entity';

export class CreateCatDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsEnum(CatSize)
  size?: CatSize;

  @IsOptional()
  @IsUUID()
  siblingGroupId?: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  breed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coatColor?: string;

  @IsOptional()
  @IsEnum(CatGender)
  gender?: CatGender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  microchipNumber?: string;

  @IsOptional()
  @IsBoolean()
  isNeutered?: boolean;

  @IsOptional()
  @IsDateString()
  vaccinationDate?: string;

  @IsOptional()
  @IsDateString()
  fivFelvTestDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fivFelvResult?: string;

  @IsOptional()
  @IsBoolean()
  requiresMedication?: boolean;

  @IsOptional()
  @IsString()
  medicationNotes?: string;

  @IsOptional()
  @IsString()
  dietaryNotes?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  temperament?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

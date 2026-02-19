import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateSeasonalPeriodDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  @Max(12)
  startMonth: number;

  @IsInt()
  @Min(1)
  @Max(31)
  startDay: number;

  @IsInt()
  @Min(1)
  @Max(12)
  endMonth: number;

  @IsInt()
  @Min(1)
  @Max(31)
  endDay: number;

  @IsBoolean()
  isHighSeason: boolean;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

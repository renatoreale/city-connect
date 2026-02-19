import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class AddExtraDto {
  @IsString()
  itemCode: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  appliesToCatCount?: number;
}

import { IsOptional, IsString } from 'class-validator';

export class CancelTaskDto {
  @IsOptional()
  @IsString()
  completionNotes?: string;
}

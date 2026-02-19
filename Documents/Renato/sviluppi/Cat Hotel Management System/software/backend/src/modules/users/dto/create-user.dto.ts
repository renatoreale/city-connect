import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email non valida' })
  @IsNotEmpty({ message: 'Email obbligatoria' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password obbligatoria' })
  @MinLength(6, { message: 'La password deve avere almeno 6 caratteri' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome obbligatorio' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Cognome obbligatorio' })
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isGlobalUser?: boolean;
}

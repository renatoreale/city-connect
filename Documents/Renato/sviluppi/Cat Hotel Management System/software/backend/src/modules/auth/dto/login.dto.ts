import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email non valida' })
  @IsNotEmpty({ message: 'Email obbligatoria' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password obbligatoria' })
  @MinLength(6, { message: 'La password deve avere almeno 6 caratteri' })
  password: string;
}

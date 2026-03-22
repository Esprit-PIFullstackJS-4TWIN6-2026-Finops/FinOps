import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide.' })
  @IsNotEmpty({ message: "L'email est obligatoire." })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

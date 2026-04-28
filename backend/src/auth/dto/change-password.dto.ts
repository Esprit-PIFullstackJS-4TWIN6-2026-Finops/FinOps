import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '../../common/constants';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
  })
  @Matches(PASSWORD_REGEX, {
    message:
      'Le mot de passe doit contenir au moins 1 majuscule, 1 minuscule et 1 chiffre',
  })
  newPassword: string;
}

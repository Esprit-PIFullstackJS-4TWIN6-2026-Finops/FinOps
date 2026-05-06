import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class RequestEmailVerificationDto {
  @IsOptional()
  @IsEmail({}, { message: 'Veuillez fournir un email valide.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  newEmail?: string;
}

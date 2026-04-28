import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmEmailVerificationDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  code: string;
}

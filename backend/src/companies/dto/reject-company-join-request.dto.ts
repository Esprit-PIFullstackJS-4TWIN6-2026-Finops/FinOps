import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectCompanyJoinRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif du rejet est obligatoire' })
  @MinLength(10, {
    message: 'Le motif du rejet doit contenir au moins 10 caractères',
  })
  rejectionReason: string;
}

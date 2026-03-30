import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class LockUserDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 60;
    }
    return Number(value);
  })
  @IsInt()
  @Min(1)
  @Max(43200)
  durationMinutes = 60;
}

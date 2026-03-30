import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ActivityHistoryQueryDto {
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => {
    const next = value ? Number(value) : 20;
    return Math.min(Number.isFinite(next) ? next : 20, 100);
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

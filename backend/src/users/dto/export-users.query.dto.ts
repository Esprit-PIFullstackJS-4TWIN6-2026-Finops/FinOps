import { IsIn, IsOptional } from 'class-validator';
import { ListUsersQueryDto } from './list-users.query.dto';

export class ExportUsersQueryDto extends ListUsersQueryDto {
  @IsOptional()
  @IsIn(['csv', 'excel'])
  format?: 'csv' | 'excel';
}

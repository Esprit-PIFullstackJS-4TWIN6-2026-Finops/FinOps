import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  number: string;

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsDateString()
  date: string;

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @Min(0.01)
  total: number;

  @IsOptional()
  @IsIn(['Draft', 'Sent', 'Paid', 'Overdue'])
  status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
}

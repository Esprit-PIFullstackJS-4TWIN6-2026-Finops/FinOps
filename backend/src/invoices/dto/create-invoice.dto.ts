import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class InvoiceLineItemInputDto {
  @IsString()
  @IsNotEmpty()
  productKey: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  cost: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  number: string;

  /** Ignored when clientId is set (filled from CRM client). */
  @ValidateIf((o: CreateInvoiceDto) => !o.clientId)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  clientName?: string;

  @IsOptional()
  @IsUUID('4')
  clientId?: string;

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

  /** When set, sent to Invoice Ninja as line_items; otherwise a single line uses `total`. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemInputDto)
  lineItems?: InvoiceLineItemInputDto[];
}

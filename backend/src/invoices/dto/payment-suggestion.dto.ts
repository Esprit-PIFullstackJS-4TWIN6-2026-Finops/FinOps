import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';

export class InvoicePaymentSuggestionResult {
  @IsNotEmpty()
  @IsUUID('4')
  invoiceId: string;

  @IsNotEmpty()
  @IsString()
  recommendationType: string;

  @IsNotEmpty()
  @Min(1)
  numberOfChunks: number;

  @IsArray()
  @IsNumber({}, { each: true })
  chunkAmounts: number[];

  @IsArray()
  @IsString({ each: true })
  proposedDates: string[];

  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @IsOptional()
  @IsString()
  suggestedTerms?: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}

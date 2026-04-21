import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SmartDocumentIntakeDto {
  @IsString()
  @MinLength(10)
  sourceText: string;

  @IsOptional()
  @IsIn(['auto', 'invoice', 'receipt'])
  documentType?: 'auto' | 'invoice' | 'receipt' = 'auto';
}

export interface SmartDocumentLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SmartInvoiceDraft {
  number: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  dueDate: string;
  total: number;
  status: 'Draft';
  notes?: string;
  lineItems: SmartDocumentLineItem[];
}

export interface SmartExpenseDraft {
  amount: number;
  expenseDate: string;
  category: string;
  vendor?: string;
  notes?: string;
}

export interface SmartDocumentIntakeResult {
  detectedType: 'invoice' | 'receipt';
  suggestedAction: 'create_invoice' | 'create_expense';
  confidenceScore: number;
  summary: string;
  warnings: string[];
  missingFields: string[];
  blockingFields: string[];
  normalizedTextPreview: string;
  invoiceDraft?: SmartInvoiceDraft;
  expenseDraft?: SmartExpenseDraft;
  generatedAt: string;
}

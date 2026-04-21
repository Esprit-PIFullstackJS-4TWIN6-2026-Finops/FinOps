import { InvoiceAiExtractionService } from './invoice-ai-extraction.service';

describe('InvoiceAiExtractionService', () => {
  it('extracts an invoice draft from pasted text', async () => {
    const service = new InvoiceAiExtractionService({
      categorizeExpense: jest.fn().mockResolvedValue('Operations'),
    } as any);

    const result = await service.intakeDocument({
      documentType: 'auto',
      sourceText: `
        ACME Corporation
        Invoice # INV-2026-001
        Bill To: Globex Industries
        Invoice Date: 2026-04-10
        Due Date: 2026-05-10
        Total: 1250.00 EUR
        Contact: billing@globex.com
      `,
    });

    expect(result.detectedType).toBe('invoice');
    expect(result.invoiceDraft?.number).toBe('INV-2026-001');
    expect(result.invoiceDraft?.clientName).toContain('Globex');
    expect(result.invoiceDraft?.total).toBe(1250);
    expect(result.blockingFields).toHaveLength(0);
  });
});

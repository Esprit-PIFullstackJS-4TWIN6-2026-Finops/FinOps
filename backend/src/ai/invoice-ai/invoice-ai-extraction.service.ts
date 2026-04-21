import { Injectable } from '@nestjs/common';
import { AiService } from '../ai.service';
import {
  SmartDocumentIntakeDto,
  SmartDocumentIntakeResult,
  SmartDocumentLineItem,
} from '../dto/invoice-extraction.dto';

type ParsedDateCandidate = {
  value: string;
  index: number;
};

@Injectable()
export class InvoiceAiExtractionService {
  constructor(private readonly aiService: AiService) {}

  async intakeDocument(dto: SmartDocumentIntakeDto): Promise<SmartDocumentIntakeResult> {
    const lines = this.normalizeLines(dto.sourceText);
    const normalizedText = lines.join('\n');
    const emails = this.extractEmails(normalizedText);
    const total = this.extractPrimaryAmount(lines);
    const issueDate = this.extractIssueDate(lines) || this.todayIso();
    const dueDate = this.extractDueDate(lines) || this.addDays(issueDate, 30);
    const invoiceNumber = this.extractInvoiceNumber(lines) || `AI-${Date.now().toString().slice(-6)}`;
    const clientName = this.extractClientName(lines, emails);
    const vendorName = this.extractVendorName(lines);
    const detectedType = this.detectDocumentType(dto.documentType || 'auto', normalizedText, {
      hasDueDate: Boolean(this.extractDueDate(lines)),
      hasInvoiceNumber: Boolean(this.extractInvoiceNumber(lines)),
      hasClientName: Boolean(clientName),
    });

    const warnings: string[] = [];
    const missingFields: string[] = [];
    const blockingFields: string[] = [];

    if (!total) {
      missingFields.push(detectedType === 'invoice' ? 'total' : 'amount');
      blockingFields.push(detectedType === 'invoice' ? 'total' : 'amount');
      warnings.push('No clear total amount was detected. Review the source text before creating a draft.');
    }
    if (detectedType === 'invoice' && !clientName) {
      missingFields.push('clientName');
      blockingFields.push('clientName');
      warnings.push('No client name was detected. Add or verify the billed customer before creating the invoice.');
    }
    if (!this.extractIssueDate(lines)) {
      missingFields.push(detectedType === 'invoice' ? 'issueDate' : 'expenseDate');
      warnings.push('The document date was inferred from today because no explicit date was found.');
    }
    if (detectedType === 'invoice' && !this.extractDueDate(lines)) {
      missingFields.push('dueDate');
      warnings.push('The due date was inferred as 30 days after the issue date.');
    }
    if (detectedType === 'invoice' && !this.extractInvoiceNumber(lines)) {
      missingFields.push('invoiceNumber');
      warnings.push('The invoice number was generated automatically for this draft.');
    }

    const expenseCategory = await this.aiService.categorizeExpense({
      vendor: vendorName || undefined,
      notes: normalizedText.slice(0, 500),
      amount: total || 0,
    });

    const lineItems = this.extractLineItems(lines, total || 0, vendorName || clientName || 'Imported item');

    const confidenceScore = this.computeConfidenceScore({
      total,
      issueDateFound: Boolean(this.extractIssueDate(lines)),
      dueDateFound: Boolean(this.extractDueDate(lines)),
      invoiceNumberFound: Boolean(this.extractInvoiceNumber(lines)),
      emailFound: emails.length > 0,
      namedPartyFound: Boolean(clientName || vendorName),
      blockingCount: blockingFields.length,
      explicitType: dto.documentType !== undefined && dto.documentType !== 'auto',
    });

    const invoiceDraft =
      detectedType === 'invoice'
        ? {
            number: invoiceNumber,
            clientName: clientName || '',
            clientEmail: emails[0],
            date: issueDate,
            dueDate,
            total: total || 0,
            status: 'Draft' as const,
            notes: `Imported from AI intake on ${this.todayIso()}`,
            lineItems,
          }
        : undefined;

    const expenseDraft =
      detectedType === 'receipt'
        ? {
            amount: total || 0,
            expenseDate: issueDate,
            category: expenseCategory,
            vendor: vendorName || undefined,
            notes: `Imported from AI intake: ${(normalizedText.slice(0, 180) || '').trim()}`,
          }
        : undefined;

    return {
      detectedType,
      suggestedAction: detectedType === 'invoice' ? 'create_invoice' : 'create_expense',
      confidenceScore,
      summary:
        detectedType === 'invoice'
          ? `Detected an invoice draft${clientName ? ` for ${clientName}` : ''}${total ? ` totaling ${total.toFixed(2)}` : ''}.`
          : `Detected a receipt or expense document${vendorName ? ` from ${vendorName}` : ''}${total ? ` totaling ${total.toFixed(2)}` : ''}.`,
      warnings,
      missingFields,
      blockingFields,
      normalizedTextPreview: normalizedText.slice(0, 1200),
      invoiceDraft,
      expenseDraft,
      generatedAt: new Date().toISOString(),
    };
  }

  private normalizeLines(sourceText: string): string[] {
    return sourceText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  private extractEmails(text: string): string[] {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    return [...new Set(matches.map((value) => value.toLowerCase()))];
  }

  private detectDocumentType(
    requestedType: 'auto' | 'invoice' | 'receipt',
    text: string,
    hints: { hasDueDate: boolean; hasInvoiceNumber: boolean; hasClientName: boolean },
  ): 'invoice' | 'receipt' {
    if (requestedType === 'invoice' || requestedType === 'receipt') {
      return requestedType;
    }

    const invoiceScore =
      this.matchCount(text, [
        /invoice/gi,
        /facture/gi,
        /bill to/gi,
        /client/gi,
        /customer/gi,
        /due date/gi,
        /echeance/gi,
      ]) +
      (hints.hasDueDate ? 2 : 0) +
      (hints.hasInvoiceNumber ? 2 : 0) +
      (hints.hasClientName ? 1 : 0);

    const receiptScore =
      this.matchCount(text, [
        /receipt/gi,
        /recu/gi,
        /merchant/gi,
        /thank you/gi,
        /paid/gi,
        /transaction/gi,
        /card/gi,
      ]) + (hints.hasDueDate ? 0 : 1);

    return invoiceScore >= receiptScore ? 'invoice' : 'receipt';
  }

  private matchCount(text: string, patterns: RegExp[]): number {
    return patterns.reduce((sum, pattern) => sum + (text.match(pattern)?.length || 0), 0);
  }

  private extractIssueDate(lines: string[]): string | null {
    const labeled = this.extractDateFromLabeledLine(lines, [
      'invoice date',
      'issue date',
      'date',
      "date d'emission",
      "date d'émission",
      'receipt date',
    ]);
    if (labeled) return labeled;

    const all = this.extractAllDates(lines);
    return all[0]?.value ?? null;
  }

  private extractDueDate(lines: string[]): string | null {
    return this.extractDateFromLabeledLine(lines, [
      'due date',
      'payment due',
      "date d'echeance",
      "date d'échéance",
      'echeance',
      'échéance',
    ]);
  }

  private extractDateFromLabeledLine(lines: string[], labels: string[]): string | null {
    for (let index = 0; index < lines.length; index += 1) {
      const lower = lines[index].toLowerCase();
      if (!labels.some((label) => lower.includes(label))) continue;

      const candidate = this.extractAllDates([lines[index], lines[index + 1] || ''])[0];
      if (candidate) return candidate.value;
    }
    return null;
  }

  private extractAllDates(lines: string[]): ParsedDateCandidate[] {
    const results: ParsedDateCandidate[] = [];
    const regex = /\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/g;

    lines.forEach((line, index) => {
      const matches = line.match(regex) || [];
      matches.forEach((match) => {
        const normalized = this.normalizeDate(match);
        if (normalized) {
          results.push({ value: normalized, index });
        }
      });
    });

    return results.sort((a, b) => a.index - b.index);
  }

  private normalizeDate(input: string): string | null {
    const cleaned = input.trim().replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    const parts = cleaned.split('-');
    if (parts.length !== 3) return null;

    const [first, second, third] = parts.map((part) => Number(part));
    if (![first, second, third].every((value) => Number.isFinite(value))) return null;

    let day = first;
    let month = second;
    const year = third;

    if (first <= 12 && second > 12) {
      day = second;
      month = first;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`;
  }

  private extractInvoiceNumber(lines: string[]): string | null {
    const patterns = [
      /(invoice|facture|receipt|ref|reference|no|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i,
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match?.[2]) return match[2].trim();
      }
    }

    return null;
  }

  private extractClientName(lines: string[], emails: string[]): string | null {
    const labeled = this.extractNamedParty(lines, [
      'bill to',
      'client',
      'customer',
      'facturer a',
      'facturer à',
    ]);
    if (labeled) return labeled;

    if (emails[0]) {
      const candidate = emails[0].split('@')[0].replace(/[._-]+/g, ' ').trim();
      if (candidate.length >= 3) {
        return this.toTitleCase(candidate);
      }
    }

    return null;
  }

  private extractVendorName(lines: string[]): string | null {
    const labeled = this.extractNamedParty(lines, [
      'vendor',
      'merchant',
      'seller',
      'supplier',
      'from',
    ]);
    if (labeled) return labeled;

    for (const line of lines.slice(0, 4)) {
      if (this.isMeaningfulPartyLine(line)) return line;
    }

    return null;
  }

  private extractNamedParty(lines: string[], labels: string[]): string | null {
    for (let index = 0; index < lines.length; index += 1) {
      const lower = lines[index].toLowerCase();
      const label = labels.find((value) => lower.includes(value));
      if (!label) continue;

      const inline = lines[index].split(/:|-/).slice(1).join(' ').trim();
      if (inline && this.isMeaningfulPartyLine(inline)) return inline;

      const next = lines[index + 1];
      if (next && this.isMeaningfulPartyLine(next)) return next;
    }

    return null;
  }

  private isMeaningfulPartyLine(line: string): boolean {
    const cleaned = line.trim();
    if (cleaned.length < 3) return false;
    if (/@|https?:\/\//i.test(cleaned)) return false;
    if (/^\+?[\d\s().-]+$/.test(cleaned)) return false;
    if (/\d{4}-\d{2}-\d{2}/.test(cleaned)) return false;
    if (/total|amount|due|date|invoice|receipt|tax|vat/i.test(cleaned)) return false;
    return /[A-Za-z]/.test(cleaned);
  }

  private extractPrimaryAmount(lines: string[]): number | null {
    const preferred = [
      'grand total',
      'amount due',
      'total due',
      'total ttc',
      'total',
      'net a payer',
      'net à payer',
      'montant total',
    ];

    for (const keyword of preferred) {
      for (const line of lines) {
        if (!line.toLowerCase().includes(keyword)) continue;
        const amount = this.extractLargestAmount(line);
        if (amount) return amount;
      }
    }

    const allAmounts = lines
      .flatMap((line) => this.extractAmountsFromLine(line))
      .filter((value) => value > 0);

    if (!allAmounts.length) return null;
    return Number(Math.max(...allAmounts).toFixed(2));
  }

  private extractLargestAmount(line: string): number | null {
    const amounts = this.extractAmountsFromLine(line);
    if (!amounts.length) return null;
    return Number(Math.max(...amounts).toFixed(2));
  }

  private extractAmountsFromLine(line: string): number[] {
    const matches =
      line.match(/(?:\$|€|£)?\s*\d[\d\s.,]*\d(?:\s*(?:\$|€|£|usd|eur|tnd))?/gi) || [];

    return matches
      .map((candidate) => this.parseMoneyValue(candidate))
      .filter((value): value is number => value !== null);
  }

  private parseMoneyValue(value: string): number | null {
    let cleaned = value
      .toLowerCase()
      .replace(/[^\d,.\s-]/g, '')
      .replace(/\s+/g, '');

    if (!cleaned || cleaned === '-') {
      return null;
    }

    if (/^\d{4}$/.test(cleaned)) {
      const numeric = Number(cleaned);
      if (numeric >= 1900 && numeric <= 2100) {
        return null;
      }
    }

    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (lastComma !== -1) {
      const decimals = cleaned.length - lastComma - 1;
      cleaned = decimals === 2 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
    } else if (lastDot !== -1) {
      const decimals = cleaned.length - lastDot - 1;
      if (decimals !== 2) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }

    const parsed = Number.parseFloat(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Number(parsed.toFixed(2));
  }

  private extractLineItems(
    lines: string[],
    total: number,
    fallbackLabel: string,
  ): SmartDocumentLineItem[] {
    const detected: SmartDocumentLineItem[] = [];
    const lineItemPattern =
      /(.+?)\s+(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*=?\s*(\d+(?:[.,]\d+)?)/;

    for (const line of lines) {
      const match = line.match(lineItemPattern);
      if (!match) continue;

      const quantity = this.parseMoneyValue(match[2]) || 0;
      const unitPrice = this.parseMoneyValue(match[3]) || 0;
      const lineTotal = this.parseMoneyValue(match[4]) || Number((quantity * unitPrice).toFixed(2));
      if (!quantity || !unitPrice || !lineTotal) continue;

      detected.push({
        description: match[1].trim(),
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    if (detected.length) return detected;

    return [
      {
        description: fallbackLabel,
        quantity: 1,
        unitPrice: Number((total || 0).toFixed(2)),
        lineTotal: Number((total || 0).toFixed(2)),
      },
    ];
  }

  private computeConfidenceScore(input: {
    total: number | null;
    issueDateFound: boolean;
    dueDateFound: boolean;
    invoiceNumberFound: boolean;
    emailFound: boolean;
    namedPartyFound: boolean;
    blockingCount: number;
    explicitType: boolean;
  }): number {
    let score = 42;
    if (input.total) score += 22;
    if (input.issueDateFound) score += 10;
    if (input.dueDateFound) score += 6;
    if (input.invoiceNumberFound) score += 8;
    if (input.emailFound) score += 5;
    if (input.namedPartyFound) score += 7;
    if (input.explicitType) score += 5;
    score -= input.blockingCount * 18;
    return Math.max(18, Math.min(97, score));
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(date: string, days: number): string {
    const base = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(base.getTime())) return this.todayIso();
    base.setUTCDate(base.getUTCDate() + days);
    return base.toISOString().slice(0, 10);
  }

  private toTitleCase(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
}

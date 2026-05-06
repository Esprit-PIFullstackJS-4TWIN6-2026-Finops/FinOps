import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InvoiceRecord } from '../entities/invoice-record.entity';
import { Company } from '../entities/company.entity';
import { Client } from '../entities/client.entity';

@Injectable()
export class InvoicePdfService {
  async generateInvoicePdf(
    invoice: InvoiceRecord,
    company: Company,
    client?: Client,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const companyLines = [company.name, company.address, company.phone, company.matriculeFiscal]
          .filter(Boolean) as string[];

        doc.fontSize(20).text('Facture', { align: 'right' });
        doc.moveDown(1);

        doc.fontSize(10).text(companyLines.join('\n'), { align: 'left' });
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#111827').text('Facture à :');
        doc.fontSize(10).fillColor('#374151');
        const clientLines = [client?.name || invoice.clientName, client?.companyName, client?.email || invoice.clientEmail, client?.phone]
          .filter(Boolean) as string[];
        doc.text(clientLines.join('\n'));
        doc.moveDown(1);

        doc.fontSize(10).fillColor('#111827');
        doc.text(`Numéro de facture: ${invoice.number}`);
        doc.text(`Date d'émission: ${invoice.date}`);
        doc.text(`Date d'échéance: ${invoice.dueDate}`);
        doc.text(`Statut: ${invoice.status}`);
        doc.moveDown(1);

        doc.fillColor('#111827').fontSize(12).text('Détails de la facture', { underline: true });
        doc.moveDown(0.5);

        // Simple table using text positioning
        const startY = doc.y;
        const rowHeight = 20;
        const colWidths = [200, 60, 80, 80, 80];

        // Headers
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Description', 40, startY, { width: colWidths[0] });
        doc.text('Quantité', 40 + colWidths[0], startY, { width: colWidths[1], align: 'center' });
        doc.text('Prix unitaire', 40 + colWidths[0] + colWidths[1], startY, { width: colWidths[2], align: 'right' });
        doc.text('Taxe', 40 + colWidths[0] + colWidths[1] + colWidths[2], startY, { width: colWidths[3], align: 'right' });
        doc.text('Montant', 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], startY, { width: colWidths[4], align: 'right' });

        // Header line
        doc.moveTo(40, startY + 12).lineTo(40 + colWidths.reduce((a, b) => a + b), startY + 12).stroke('#E5E7EB');

        doc.font('Helvetica').fontSize(9);
        const itemRows = this.buildLineItems(invoice);
        let currentY = startY + rowHeight;

        itemRows.forEach((row) => {
          doc.text(row.description, 40, currentY, { width: colWidths[0] });
          doc.text(row.quantity, 40 + colWidths[0], currentY, { width: colWidths[1], align: 'center' });
          doc.text(row.unitPrice, 40 + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });
          doc.text(row.taxRate, 40 + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[3], align: 'right' });
          doc.text(row.total, 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY, { width: colWidths[4], align: 'right' });
          currentY += rowHeight;
        });

        // Move doc.y to after the table
        doc.y = currentY + 10;

        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica-Bold').text('Résumé', { underline: true });
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);

        const totalValue = Number(invoice.total ?? 0);
        const subtotal = Number.isFinite(totalValue) ? totalValue : 0;
        const taxAmount = 'N/A';
        const grandTotal = subtotal;

        doc.text(`Sous-total: ${subtotal.toLocaleString('fr-FR')} €`);
        doc.text(`Taxes: ${taxAmount}`);
        doc.text(`Total: ${grandTotal.toLocaleString('fr-FR')} €`);
        doc.moveDown(1);

        doc.fontSize(10).text('Notes:', { underline: true });
        doc.font('Helvetica').fontSize(9).text('Aucune note fournie.');
        doc.moveDown(1);

        doc.fontSize(10).text('Conditions de paiement:', { underline: true });
        doc.font('Helvetica').fontSize(9).text(invoice.status === 'Draft' ? 'Facture en brouillon' : 'Paiement dû selon les conditions convenues.');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildLineItems(invoice: InvoiceRecord) {
    if (Array.isArray((invoice as any).lineItems) && (invoice as any).lineItems.length > 0) {
      return (invoice as any).lineItems.map((line: any) => ({
        description: line.description || line.productKey || 'Ligne de facture',
        quantity: line.quantity?.toString() || '1',
        unitPrice: line.unitPrice ? `${Number(line.unitPrice).toFixed(2)} €` : `${Number(line.cost ?? invoice.total).toFixed(2)} €`,
        taxRate: line.taxRate !== undefined ? `${Number(line.taxRate).toFixed(2)}%` : 'N/A',
        total: line.lineTotal ? `${Number(line.lineTotal).toFixed(2)} €` : `${Number(line.cost ?? invoice.total).toFixed(2)} €`,
      }));
    }

    return [
      {
        description: `Facture ${invoice.number}`,
        quantity: '1',
        unitPrice: `${Number(invoice.total ?? 0).toFixed(2)} €`,
        taxRate: 'N/A',
        total: `${Number(invoice.total ?? 0).toFixed(2)} €`,
      },
    ];
  }
}

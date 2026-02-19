import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import { Quote } from '../quotes/entities/quote.entity';

@Injectable()
export class PdfService {
  private uploadPath: string;

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
  }

  async generateQuotePdf(quote: Quote): Promise<string> {
    const quotesPath = path.join(this.uploadPath, 'quotes');

    // Ensure directory exists
    if (!fs.existsSync(quotesPath)) {
      fs.mkdirSync(quotesPath, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `quote_${quote.quoteNumber}_${timestamp}.pdf`;
    const filePath = path.join(quotesPath, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Preventivo ${quote.quoteNumber}`,
            Author: quote.tenant?.name || 'Cat Hotel',
          },
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Generate PDF content
        this.generateHeader(doc, quote);
        this.generateClientInfo(doc, quote);
        this.generateStayDetails(doc, quote);
        this.generateLineItems(doc, quote);
        this.generateTotals(doc, quote);
        this.generateFooter(doc, quote);

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private generateHeader(doc: PDFKit.PDFDocument, quote: Quote): void {
    const tenant = quote.tenant;

    // Hotel name
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text(tenant?.name || 'Cat Hotel', { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    // Hotel address and contacts
    if (tenant) {
      const addressParts = [
        tenant.address,
        tenant.city,
        tenant.postalCode,
        tenant.province,
      ].filter(Boolean);

      if (addressParts.length > 0) {
        doc.text(addressParts.join(', '), { align: 'center' });
      }

      const contactParts: string[] = [];
      if (tenant.phone) contactParts.push(`Tel: ${tenant.phone}`);
      if (tenant.email) contactParts.push(`Email: ${tenant.email}`);

      if (contactParts.length > 0) {
        doc.text(contactParts.join(' - '), { align: 'center' });
      }
    }

    doc.moveDown(1);

    // Quote header box
    doc.rect(50, doc.y, 495, 40).stroke();
    const boxY = doc.y + 12;

    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`PREVENTIVO N. ${quote.quoteNumber}`, 60, boxY);

    doc.fontSize(10).font('Helvetica');
    const quoteDate = this.formatDate(quote.createdAt);
    doc.text(`Data: ${quoteDate}`, 350, boxY);

    doc.y = boxY + 40;
    doc.moveDown(1);
  }

  private generateClientInfo(doc: PDFKit.PDFDocument, quote: Quote): void {
    const client = quote.client;
    if (!client) return;

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('DATI CLIENTE');
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica');
    doc.text(`${client.firstName} ${client.lastName}`);

    if (client.address || client.city) {
      const addressParts = [
        client.address,
        client.city,
        client.postalCode,
        client.province,
      ].filter(Boolean);
      doc.text(addressParts.join(', '));
    }

    if (client.phone1) {
      doc.text(`Tel: ${client.phone1}`);
    }
    if (client.email) {
      doc.text(`Email: ${client.email}`);
    }

    doc.moveDown(1);
  }

  private generateStayDetails(doc: PDFKit.PDFDocument, quote: Quote): void {
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('DETTAGLIO SOGGIORNO');
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica');

    const checkIn = this.formatDate(quote.checkInDate);
    const checkOut = this.formatDate(quote.checkOutDate);
    const nights = quote.numberOfNights;

    doc.text(`Check-in: ${checkIn}`);
    doc.text(`Check-out: ${checkOut}`);
    doc.text(`Durata: ${nights} nott${nights === 1 ? 'e' : 'i'}`);
    doc.text(`Numero gatti: ${quote.numberOfCats}`);

    // Cat names
    if (quote.quoteCats && quote.quoteCats.length > 0) {
      const catNames = quote.quoteCats
        .map((qc) => qc.cat?.name)
        .filter(Boolean)
        .join(', ');
      if (catNames) {
        doc.text(`Gatti: ${catNames}`);
      }
    }

    doc.moveDown(1);
  }

  private generateLineItems(doc: PDFKit.PDFDocument, quote: Quote): void {
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('DETTAGLIO ECONOMICO');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = {
      description: 200,
      period: 100,
      qty: 40,
      unitPrice: 70,
      total: 85,
    };

    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(tableLeft, tableTop, 495, 20).fill('#f0f0f0').stroke();
    doc.fillColor('#000000');

    let x = tableLeft + 5;
    doc.text('Descrizione', x, tableTop + 6, { width: colWidths.description });
    x += colWidths.description;
    doc.text('Periodo', x, tableTop + 6, { width: colWidths.period });
    x += colWidths.period;
    doc.text('Q.tà', x, tableTop + 6, { width: colWidths.qty, align: 'right' });
    x += colWidths.qty;
    doc.text('Prezzo', x, tableTop + 6, { width: colWidths.unitPrice, align: 'right' });
    x += colWidths.unitPrice;
    doc.text('Totale', x, tableTop + 6, { width: colWidths.total, align: 'right' });

    // Table rows
    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    const lineItems = quote.lineItems || [];
    for (const item of lineItems) {
      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      x = tableLeft + 5;

      // Description with season indicator
      let description = item.itemName;
      if (item.seasonType) {
        description += item.seasonType === 'high' ? ' (Alta Stagione)' : ' (Bassa Stagione)';
      }
      doc.text(description, x, y, { width: colWidths.description });

      x += colWidths.description;

      // Period (for accommodation)
      let period = '-';
      if (item.startDate && item.endDate) {
        period = `${this.formatDateShort(item.startDate)} - ${this.formatDateShort(item.endDate)}`;
      }
      doc.text(period, x, y, { width: colWidths.period });

      x += colWidths.period;
      doc.text(item.quantity.toString(), x, y, { width: colWidths.qty, align: 'right' });

      x += colWidths.qty;
      doc.text(this.formatCurrency(Number(item.unitPrice)), x, y, { width: colWidths.unitPrice, align: 'right' });

      x += colWidths.unitPrice;
      doc.text(this.formatCurrency(Number(item.subtotal)), x, y, { width: colWidths.total, align: 'right' });

      y += 18;

      // Draw line separator
      doc.moveTo(tableLeft, y - 3).lineTo(tableLeft + 495, y - 3).stroke();
    }

    doc.y = y + 5;
    doc.moveDown(0.5);
  }

  private generateTotals(doc: PDFKit.PDFDocument, quote: Quote): void {
    const rightCol = 400;
    const valueCol = 480;

    doc.fontSize(10).font('Helvetica');

    // Subtotal
    doc.text('Subtotale:', rightCol, doc.y, { continued: false });
    doc.text(this.formatCurrency(Number(quote.subtotalBeforeDiscounts)), valueCol, doc.y - 12, { align: 'right', width: 65 });

    // Discounts
    if (Number(quote.totalDiscounts) > 0) {
      doc.moveDown(0.3);
      doc.fillColor('#008000');
      doc.text('Sconti:', rightCol, doc.y);
      doc.text(`-${this.formatCurrency(Number(quote.totalDiscounts))}`, valueCol, doc.y - 12, { align: 'right', width: 65 });
      doc.fillColor('#000000');

      // Discount details
      if (quote.appliedDiscounts && quote.appliedDiscounts.length > 0) {
        doc.fontSize(8);
        for (const discount of quote.appliedDiscounts) {
          doc.moveDown(0.2);
          doc.text(`  - ${discount.name}`, rightCol, doc.y);
        }
        doc.fontSize(10);
      }
    }

    // Total
    doc.moveDown(0.5);
    doc.rect(rightCol - 10, doc.y - 5, 165, 25).fill('#f0f0f0').stroke();
    doc.fillColor('#000000');

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('TOTALE:', rightCol, doc.y + 2);
    doc.text(this.formatCurrency(Number(quote.totalAmount)), valueCol, doc.y - 10, { align: 'right', width: 65 });

    doc.moveDown(1.5);
  }

  private generateFooter(doc: PDFKit.PDFDocument, quote: Quote): void {
    doc.fontSize(10).font('Helvetica');

    // Validity
    if (quote.validUntil) {
      doc.text(`Preventivo valido fino al: ${this.formatDate(quote.validUntil)}`);
      doc.moveDown(0.5);
    }

    // Notes
    if (quote.notes) {
      doc.font('Helvetica-Bold').text('Note:');
      doc.font('Helvetica').text(quote.notes);
      doc.moveDown(0.5);
    }

    // Terms and conditions placeholder
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#666666');
    doc.text('Condizioni generali:', { underline: true });
    doc.text('- Il preventivo non costituisce conferma di prenotazione.');
    doc.text('- Per confermare la prenotazione è richiesto il versamento di una caparra.');
    doc.text('- I prezzi sono comprensivi di IVA ove applicabile.');
    doc.text('- Per informazioni dettagliate consultare il regolamento della struttura.');
  }

  private formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDateShort(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  getFilePath(relativePath: string): string {
    return path.resolve(relativePath);
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

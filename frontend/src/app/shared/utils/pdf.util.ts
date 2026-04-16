
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

export class PdfUtil {
  static exportToPdf(data: any[], fileName: string, columns: { header: string; dataKey: string }[], title: string = 'Report') {
    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.text(`Generated on: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 30);

    // Prepare body
    const body = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        let value = item[col.dataKey];
        // Format dates
        if (value && (col.dataKey.toLowerCase().includes('date') || col.dataKey.toLowerCase().includes('at'))) {
          if (dayjs(value).isValid()) {
            value = dayjs(value).format('DD/MM/YYYY');
          }
        }
        // Format booleans
        if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        }
        row[col.dataKey] = value;
      });
      return row;
    });

    // Generate Table
    autoTable(doc, {
      head: [columns.map(c => c.header)],
      body: body.map(row => columns.map(c => row[c.dataKey])),
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [79, 70, 229], // Indigo-600
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Gray-50
      },

      // Footer integration (Custom page numbers)
      didDrawPage: (data: any) => {
        // Footer
        const str = 'Page ' + (doc as any).internal.getNumberOfPages();
        doc.setFontSize(10);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });

    doc.save(`${fileName}_${dayjs().format('YYYY-MM-DD')}.pdf`);
  }

  static generateSaleInvoicePdf(seller: any, sale: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('TAX INVOICE', pageWidth - 14, 22, { align: 'right' });

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(seller?.businessName || seller?.user?.name || 'Seller Name', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    let sellerY = 30;
    if (seller?.address) { doc.text(seller.address, 14, sellerY); sellerY += 5; }
    if (seller?.gstin) { doc.text(`GSTIN: ${seller.gstin}`, 14, sellerY); sellerY += 5; }
    if (seller?.stateCode) { doc.text(`State Code: ${seller.stateCode}`, 14, sellerY); }

    // Invoice Details Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - 80, 30, 66, 25, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.text('Invoice No:', pageWidth - 76, 38);
    doc.setTextColor(15, 23, 42);
    doc.text(sale.invoiceNo || '-', pageWidth - 50, 38);
    
    doc.setTextColor(100, 116, 139);
    doc.text('Date:', pageWidth - 76, 45);
    doc.setTextColor(15, 23, 42);
    doc.text(dayjs(sale.invoiceDate).format('DD MMM YYYY'), pageWidth - 50, 45);
    
    doc.setTextColor(100, 116, 139);
    doc.text('Type:', pageWidth - 76, 52);
    doc.setTextColor(15, 23, 42);
    doc.text(sale.invoiceType || 'B2B', pageWidth - 50, 52);

    // Bill To Section
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('BILL TO:', 14, sellerY + 15);
    
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(sale.customerName || '-', 14, sellerY + 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    if (sale.gstin) { doc.text(`GSTIN: ${sale.gstin}`, 14, sellerY + 28); }
    if (sale.placeOfSupply) { doc.text(`Place of Supply: ${sale.placeOfSupply}`, 14, sellerY + 34); }

    // Table
    const tableBody = [
      [
        '1',
        sale.description || 'Goods / Services',
        sale.hsnSacCode || '-',
        '1', // qty
        `Rs. ${Number(sale.baseAmount).toFixed(2)}`,
        `${sale.gstRate}%`,
        `Rs. ${Number(sale.gstAmount || 0).toFixed(2)}`,
        `Rs. ${Number(sale.totalAmount).toFixed(2)}`
      ]
    ];

    autoTable(doc, {
      startY: sellerY + 45,
      head: [['Sr', 'Description', 'HSN/SAC', 'Qty', 'Base Amt', 'GST%', 'GST Amt', 'Total']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Taxable Amount:', pageWidth - 80, finalY);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${Number(sale.baseAmount).toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });

    doc.setTextColor(100, 116, 139);
    doc.text('Total GST:', pageWidth - 80, finalY + 7);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${Number(sale.gstAmount || 0).toFixed(2)}`, pageWidth - 14, finalY + 7, { align: 'right' });

    doc.setFontSize(12);
    doc.setDrawColor(226, 232, 240);
    doc.line(pageWidth - 85, finalY + 12, pageWidth - 14, finalY + 12);
    doc.text('Grand Total:', pageWidth - 80, finalY + 20);
    doc.text(`Rs. ${Number(sale.totalAmount).toFixed(2)}`, pageWidth - 14, finalY + 20, { align: 'right' });

    // Footer Auth
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signatory', pageWidth - 14, finalY + 50, { align: 'right' });
    doc.line(pageWidth - 60, finalY + 45, pageWidth - 14, finalY + 45);

    doc.save(`Invoice_${sale.invoiceNo}.pdf`);
  }
}

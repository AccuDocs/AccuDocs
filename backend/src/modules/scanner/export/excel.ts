import ExcelJS from 'exceljs';
import { ScannerDocumentRecord, ScannerSummaryRow } from '../types';

const DOCUMENT_HEADERS = [
  'ID',
  'Type',
  'Document Number',
  'Date',
  'Vendor / Customer',
  'GSTIN',
  'Subtotal',
  'Tax Amount',
  'Discount',
  'Total Amount',
  'Currency',
  'Payment Mode',
  'Email',
  'Phone',
  'OCR Confidence',
  'S3 URL',
  'Local Path',
  'Notes',
  'Created At',
];

const makeDocumentRows = (documents: ScannerDocumentRecord[]): Array<Array<string | number | null>> =>
  documents.map((document) => [
    document.id,
    document.doc_type,
    document.document_number,
    document.date,
    document.vendor_or_customer,
    document.gstin,
    document.subtotal,
    document.tax_amount,
    document.discount,
    document.total_amount,
    document.currency,
    document.payment_mode,
    document.email,
    document.phone,
    document.ocr_confidence,
    document.s3_url,
    document.local_path,
    document.notes,
    document.created_at,
  ]);

const styleSheet = (worksheet: ExcelJS.Worksheet): void => {
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' },
  };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
    column.width = Math.max(column.width || 18, 18);
  });
};

const addDocumentSheet = (
  workbook: ExcelJS.Workbook,
  title: string,
  documents: ScannerDocumentRecord[],
): void => {
  const worksheet = workbook.addWorksheet(title);
  worksheet.addRow(DOCUMENT_HEADERS);
  makeDocumentRows(documents).forEach((row) => worksheet.addRow(row));
  styleSheet(worksheet);
};

export const buildScannerWorkbook = async (
  documents: ScannerDocumentRecord[],
  summaryRows: ScannerSummaryRow[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AccuDocs Document Scanner';
  workbook.created = new Date();

  addDocumentSheet(workbook, 'All Documents', documents);
  addDocumentSheet(workbook, 'Sales only', documents.filter((document) => document.doc_type === 'sale'));
  addDocumentSheet(workbook, 'Purchases only', documents.filter((document) => document.doc_type === 'purchase'));
  addDocumentSheet(workbook, 'Expenses only', documents.filter((document) => document.doc_type === 'expense'));

  const summary = workbook.addWorksheet('Summary');
  summary.addRow([
    'Month',
    'Type',
    'Document Count',
    'Subtotal Total',
    'Tax Total',
    'Discount Total',
    'Grand Total',
  ]);
  summaryRows.forEach((row) => {
    summary.addRow([
      row.month,
      row.doc_type,
      row.document_count,
      row.subtotal_total,
      row.tax_total,
      row.discount_total,
      row.grand_total,
    ]);
  });
  styleSheet(summary);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const escapeCsvCell = (value: string | number | null): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export const buildScannerCsv = (documents: ScannerDocumentRecord[]): Buffer => {
  const lines = [
    DOCUMENT_HEADERS.join(','),
    ...makeDocumentRows(documents).map((row) => row.map(escapeCsvCell).join(',')),
  ];

  return Buffer.from(`\uFEFF${lines.join('\n')}`, 'utf8');
};

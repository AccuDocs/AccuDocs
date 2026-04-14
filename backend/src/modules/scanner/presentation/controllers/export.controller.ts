import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { getScannerDocumentsForExport, getScannerSummaryRows } from '../../db/repository';
import { buildScannerCsv, buildScannerWorkbook } from '../../export/excel';

const buildExportFilters = (req: AuthenticatedRequest) => ({
  organizationId: req.user!.organizationId,
  type: typeof req.query.type === 'string' ? (req.query.type as 'sale' | 'purchase' | 'expense') : undefined,
  from: typeof req.query.from === 'string' ? req.query.from : undefined,
  to: typeof req.query.to === 'string' ? req.query.to : undefined,
});

export const exportScannedDocumentsExcel = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const filters = buildExportFilters(req);
  const [documents, summaryRows] = await Promise.all([
    getScannerDocumentsForExport(filters),
    getScannerSummaryRows(filters),
  ]);

  const buffer = await buildScannerWorkbook(documents, summaryRows);
  const stamp = new Date().toISOString().slice(0, 10);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="scanned-documents-${stamp}.xlsx"`,
  );
  res.status(200).send(buffer);
};

export const exportScannedDocumentsCsv = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const documents = await getScannerDocumentsForExport(buildExportFilters(req));
  const buffer = buildScannerCsv(documents);
  const stamp = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="scanned-documents-${stamp}.csv"`);
  res.status(200).send(buffer);
};

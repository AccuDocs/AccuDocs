import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import {
  getScannerDocumentById,
  listScannerDocuments,
  softDeleteScannerDocument,
  updateScannerDocument,
} from '../../db/repository';
import { buildUpdatePayload, getValidatedDocumentId, parseListPagination } from '../../middleware/validate';

export const listScannedDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const organizationId = req.user!.organizationId;
  const { page, limit } = parseListPagination(req);
  const result = await listScannerDocuments({
    organizationId,
    page,
    limit,
    type: typeof req.query.type === 'string' ? (req.query.type as 'sale' | 'purchase' | 'expense') : undefined,
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
    vendor: typeof req.query.vendor === 'string' ? req.query.vendor : undefined,
  });

  res.status(200).json({
    success: true,
    page,
    limit,
    total: result.total,
    total_pages: Math.ceil(result.total / limit),
    data: result.rows,
  });
};

export const getScannedDocument = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const documentId = getValidatedDocumentId(req);
  const document = await getScannerDocumentById(documentId, req.user!.organizationId);
  res.status(200).json({ success: true, data: document });
};

export const updateScannedDocument = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const documentId = getValidatedDocumentId(req);
  const updated = await updateScannerDocument(documentId, req.user!.organizationId, buildUpdatePayload(req));
  res.status(200).json({ success: true, data: updated });
};

export const deleteScannedDocument = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const documentId = getValidatedDocumentId(req);
  await softDeleteScannerDocument(documentId, req.user!.organizationId);
  res.status(200).json({ success: true, message: 'Document deleted successfully.' });
};

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { BadRequestError } from '../../../../utils/errors';
import { extract } from '../../extractor';
import { recognizeDocument } from '../../ocr/engine';
import { preprocessImage } from '../../ocr/preprocessor';
import { persistScannedDocument } from '../../application/services/persist-scanned-document';
import { getScannerUploadFile } from '../../middleware/upload';
import { buildSavePayload, getValidatedPreviewDocType } from '../../middleware/validate';

export const previewScannedDocument = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const file = getScannerUploadFile(req);
  if (!file) {
    throw new BadRequestError('document image is required.');
  }

  const docType = getValidatedPreviewDocType(req);
  const processedBuffer = await preprocessImage(file.buffer);
  const ocr = await recognizeDocument(processedBuffer);
  const extraction = extract(ocr.text, docType);

  res.status(200).json({
    success: true,
    ocr_confidence: ocr.confidence,
    image_base64: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    data: {
      ...extraction.data,
      doc_type: docType,
    },
    field_confidences: extraction.field_confidences,
    low_confidence_fields: extraction.low_confidence_fields,
    warnings: extraction.warnings,
    raw_ocr_text: extraction.raw_text,
  });
};

export const saveScannedDocument = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const file = getScannerUploadFile(req);
  if (!file) {
    throw new BadRequestError('document image is required.');
  }

  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    throw new BadRequestError('Organization context is missing from the request.');
  }

  const payload = buildSavePayload(req, organizationId);
  if (!payload.doc_type) {
    throw new BadRequestError('doc_type is required.');
  }
  const savedDocument = await persistScannedDocument(file, payload);

  res.status(201).json({
    success: true,
    document_id: savedDocument.id,
    s3_url: savedDocument.s3_url,
    local_path: savedDocument.local_path,
    data: savedDocument,
  });
};

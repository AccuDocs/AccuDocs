import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { BadRequestError } from '../../../../utils/errors';
import { logger } from '../../../../utils/logger';
import { extract } from '../../extractor';
import { recognizeDocument } from '../../ocr/engine';
import { preprocessImage } from '../../ocr/preprocessor';
import { getScannerUploadFile } from '../../middleware/upload';
import { buildSavePayload, getValidatedPreviewDocType } from '../../middleware/validate';
import { createScannerDocument } from '../../db/repository';
import { saveScannerDocumentToLocal } from '../../storage/local';
import { uploadScannerDocumentToS3 } from '../../storage/s3';
import { appendScannerStorageError, createStorageDescriptor } from '../../storage/utils';

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
  const descriptor = createStorageDescriptor(file.originalname, file.mimetype, payload.doc_type);

  try {
    const s3Result = await uploadScannerDocumentToS3(descriptor.s3_key, file.buffer, file.mimetype);
    payload.s3_key = s3Result.s3_key;
    payload.s3_url = s3Result.s3_url;
  } catch (error) {
    logger.error(`Scanner S3 upload failed for ${descriptor.s3_key}: ${String(error)}`);
    try {
      await appendScannerStorageError('s3', {
        error: String(error),
        key: descriptor.s3_key,
        organizationId,
        originalName: file.originalname,
      });
    } catch (logError) {
      logger.error(`Unable to write scanner S3 error log: ${String(logError)}`);
    }
  }

  try {
    const localCopy = await saveScannerDocumentToLocal(file.buffer, descriptor);
    payload.local_path = localCopy.local_path;
  } catch (error) {
    logger.warn(`Scanner local copy failed for ${descriptor.local_absolute_path}: ${String(error)}`);
    try {
      await appendScannerStorageError('local', {
        error: String(error),
        path: descriptor.local_absolute_path,
        organizationId,
        originalName: file.originalname,
      });
    } catch (logError) {
      logger.error(`Unable to write scanner local-copy error log: ${String(logError)}`);
    }
  }

  payload.image_filename = descriptor.file_name;
  const savedDocument = await createScannerDocument(payload);

  res.status(201).json({
    success: true,
    document_id: savedDocument.id,
    s3_url: savedDocument.s3_url,
    local_path: savedDocument.local_path,
    data: savedDocument,
  });
};

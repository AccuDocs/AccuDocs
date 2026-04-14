import { logger } from '../../../../utils/logger';
import { createScannerDocument } from '../../db/repository';
import { saveScannerDocumentToLocal } from '../../storage/local';
import { uploadScannerDocumentToS3 } from '../../storage/s3';
import { appendScannerStorageError, createStorageDescriptor } from '../../storage/utils';
import { SaveScannerDocumentInput, ScannerDocumentRecord } from '../../types';

export const persistScannedDocument = async (
  file: Express.Multer.File,
  payload: SaveScannerDocumentInput,
): Promise<ScannerDocumentRecord> => {
  if (!payload.doc_type) {
    throw new Error('doc_type is required to persist a scanned document.');
  }

  const nextPayload: SaveScannerDocumentInput = {
    ...payload,
    line_items: [...payload.line_items],
  };

  const descriptor = createStorageDescriptor(file.originalname, file.mimetype, payload.doc_type);

  try {
    const s3Result = await uploadScannerDocumentToS3(descriptor.s3_key, file.buffer, file.mimetype);
    nextPayload.s3_key = s3Result.s3_key;
    nextPayload.s3_url = s3Result.s3_url;
  } catch (error) {
    logger.error(`Scanner S3 upload failed for ${descriptor.s3_key}: ${String(error)}`);
    try {
      await appendScannerStorageError('s3', {
        error: String(error),
        key: descriptor.s3_key,
        organizationId: nextPayload.organization_id,
        originalName: file.originalname,
      });
    } catch (logError) {
      logger.error(`Unable to write scanner S3 error log: ${String(logError)}`);
    }
  }

  try {
    const localCopy = await saveScannerDocumentToLocal(file.buffer, descriptor);
    nextPayload.local_path = localCopy.local_path;
  } catch (error) {
    logger.warn(`Scanner local copy failed for ${descriptor.local_absolute_path}: ${String(error)}`);
    try {
      await appendScannerStorageError('local', {
        error: String(error),
        path: descriptor.local_absolute_path,
        organizationId: nextPayload.organization_id,
        originalName: file.originalname,
      });
    } catch (logError) {
      logger.error(`Unable to write scanner local-copy error log: ${String(logError)}`);
    }
  }

  nextPayload.image_filename = descriptor.file_name;
  return createScannerDocument(nextPayload);
};

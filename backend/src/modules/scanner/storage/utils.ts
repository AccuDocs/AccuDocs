import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../../../config/env.config';
import { ScannerDocType, StorageDescriptor } from '../types';

const sanitizeBaseName = (fileName: string): string => {
  const base = path.parse(fileName).name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return base;
};

const extensionFromMime = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/bmp':
      return '.bmp';
    case 'image/tiff':
    case 'image/tif':
      return '.tiff';
    default:
      return '.jpg';
  }
};

export const createStorageDescriptor = (
  originalName: string,
  mimeType: string,
  docType: ScannerDocType,
  createdAt: Date = new Date(),
): StorageDescriptor => {
  const extension = path.extname(originalName).toLowerCase() || extensionFromMime(mimeType);
  const safeBase = sanitizeBaseName(originalName);
  const uuid = randomUUID();
  const file_name = safeBase ? `${uuid}-${safeBase}${extension}` : `${uuid}${extension}`;
  const year = String(createdAt.getUTCFullYear());
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const year_month = `${year}-${month}`;
  const s3_key = `documents/${docType}/${year}/${month}/${file_name}`;
  const local_relative_path = path.join(docType, year_month, file_name);
  const local_absolute_path = path.resolve(config.scanner.localStoragePath, local_relative_path);

  return {
    extension,
    file_name,
    local_absolute_path,
    local_relative_path,
    month,
    s3_key,
    year,
    year_month,
  };
};

export const appendScannerStorageError = async (
  channel: 's3' | 'local',
  payload: Record<string, unknown>,
): Promise<void> => {
  const logPath = path.resolve(process.cwd(), 'logs', `scanner-${channel}-errors.log`);
  const logLine = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`;
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, logLine, 'utf8');
};

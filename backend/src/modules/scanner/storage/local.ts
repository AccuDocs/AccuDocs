import fs from 'fs/promises';
import path from 'path';
import { StorageDescriptor } from '../types';

export const saveScannerDocumentToLocal = async (
  buffer: Buffer,
  descriptor: StorageDescriptor,
): Promise<{ local_path: string }> => {
  await fs.mkdir(path.dirname(descriptor.local_absolute_path), { recursive: true });
  await fs.writeFile(descriptor.local_absolute_path, buffer);

  return {
    local_path: descriptor.local_absolute_path.replace(/\\/g, '/'),
  };
};

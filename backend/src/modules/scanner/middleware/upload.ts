import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError } from '../../../utils/errors';
import { config } from '../../../config/env.config';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/tif',
];

const limits = {
  fileSize: config.scanner.maxFileSizeMb * 1024 * 1024,
  files: 1,
};

const fileFilter = (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(new BadRequestError('Only JPG, JPEG, PNG, WEBP, BMP, and TIFF files are allowed.'));
    return;
  }

  callback(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits,
  fileFilter,
});

const wrapUpload =
  (middleware: ReturnType<typeof upload.single> | ReturnType<typeof upload.fields>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          next(new BadRequestError(`File size exceeds ${config.scanner.maxFileSizeMb}MB limit.`));
          return;
        }

        next(new BadRequestError('Unable to process the uploaded file.'));
        return;
      }

      next(error);
    });
  };

export const uploadScannerPreviewDocument = wrapUpload(upload.single('document'));
export const uploadScannerSaveDocument = wrapUpload(
  upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
);

export const getScannerUploadFile = (req: Request): Express.Multer.File | undefined => {
  if (req.file) {
    return req.file;
  }

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return files?.document?.[0] || files?.image?.[0];
};

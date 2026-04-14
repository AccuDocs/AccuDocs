import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../../middlewares/error.middleware';
import { uploadScannerPreviewDocument, uploadScannerSaveDocument } from '../../middleware/upload';
import { previewScannedDocument, saveScannedDocument } from '../controllers/scan.controller';

const router = Router();

router.use(authenticate);
router.post('/preview', uploadScannerPreviewDocument, asyncHandler(previewScannedDocument));
router.post('/save', uploadScannerSaveDocument, asyncHandler(saveScannedDocument));

export default router;

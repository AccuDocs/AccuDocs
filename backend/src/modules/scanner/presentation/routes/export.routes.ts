import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../../middlewares/error.middleware';
import { exportScannedDocumentsCsv, exportScannedDocumentsExcel } from '../controllers/export.controller';

const router = Router();

router.use(authenticate);
router.get('/excel', asyncHandler(exportScannedDocumentsExcel));
router.get('/csv', asyncHandler(exportScannedDocumentsCsv));

export default router;

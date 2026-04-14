import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../../middlewares/error.middleware';
import {
  deleteScannedDocument,
  getScannedDocument,
  listScannedDocuments,
  updateScannedDocument,
} from '../controllers/documents.controller';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(listScannedDocuments));
router.get('/:id', asyncHandler(getScannedDocument));
router.put('/:id', asyncHandler(updateScannedDocument));
router.delete('/:id', asyncHandler(deleteScannedDocument));

export default router;

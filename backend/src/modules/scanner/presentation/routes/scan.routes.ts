import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../../middlewares/error.middleware';
import { uploadScannerPreviewDocument, uploadScannerSaveDocument } from '../../middleware/upload';
import { previewScannedDocument, saveScannedDocument } from '../controllers/scan.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Scanner
 *   description: Document scanning and OCR operations
 */

router.use(authenticate);

/**
 * @openapi
 * /scan/preview:
 *   post:
 *     tags: [Scanner]
 *     summary: Preview scanned document with OCR extraction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: OCR preview results
 */
router.post('/preview', uploadScannerPreviewDocument, asyncHandler(previewScannedDocument));

/**
 * @openapi
 * /scan/save:
 *   post:
 *     tags: [Scanner]
 *     summary: Save scanned document to storage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document saved successfully
 */
router.post('/save', uploadScannerSaveDocument, asyncHandler(saveScannedDocument));

export default router;

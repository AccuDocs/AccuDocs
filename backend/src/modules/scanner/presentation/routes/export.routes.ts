import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../../middlewares/error.middleware';
import { exportScannedDocumentsCsv, exportScannedDocumentsExcel } from '../controllers/export.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Scanner
 *   description: Document scanning, OCR, and export operations
 */

router.use(authenticate);

/**
 * @openapi
 * /scanner/export/excel:
 *   get:
 *     tags: [Scanner]
 *     summary: Export scanned documents as Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file downloaded
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/excel', asyncHandler(exportScannedDocumentsExcel));

/**
 * @openapi
 * /scanner/export/csv:
 *   get:
 *     tags: [Scanner]
 *     summary: Export scanned documents as CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file downloaded
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/csv', asyncHandler(exportScannedDocumentsCsv));

export default router;

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

/**
 * @openapi
 * tags:
 *   name: Scanner
 *   description: Scanned document management
 */

router.use(authenticate);

/**
 * @openapi
 * /scanner/documents:
 *   get:
 *     tags: [Scanner]
 *     summary: List all scanned documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scanned documents retrieved
 */
router.get('/', asyncHandler(listScannedDocuments));

/**
 * @openapi
 * /scanner/documents/{id}:
 *   get:
 *     tags: [Scanner]
 *     summary: Get a scanned document by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scanned document retrieved
 *       404:
 *         description: Document not found
 */
router.get('/:id', asyncHandler(getScannedDocument));

/**
 * @openapi
 * /scanner/documents/{id}:
 *   put:
 *     tags: [Scanner]
 *     summary: Update scanned document metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Document updated successfully
 */
router.put('/:id', asyncHandler(updateScannedDocument));

/**
 * @openapi
 * /scanner/documents/{id}:
 *   delete:
 *     tags: [Scanner]
 *     summary: Delete a scanned document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router.delete('/:id', asyncHandler(deleteScannedDocument));

export default router;

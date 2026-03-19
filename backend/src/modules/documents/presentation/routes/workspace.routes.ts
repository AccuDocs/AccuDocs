import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Alias /workspace/files to document listing logic
// The frontend calls /workspace/files?page=1&limit=50&sortBy=createdAt&sortOrder=desc
// We can use getInvoices-like pagination if we had a getDocuments method.
// Let's add a list method to DocumentController or just reuse getFolderDocuments if we handle 'all'

/**
 * @openapi
 * /workspace/files:
 *   get:
 *     tags: [Documents]
 *     summary: List all accessible files in the workspace with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of files retrieved
 */
router.get('/files', DocumentController.listFiles);

export default router;

import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Diagnostic test route
router.get('/test', (req, res) => res.json({ status: 'ok', msg: 'workspace route reached' }));

router.get('/clients/:clientId', DocumentController.getFolders);

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
 *         description: List of files retrieved
 */
router.get('/files', DocumentController.listFiles);

/**
 * @openapi
 * /workspace/clients/{clientId}:
 *   get:
 *     tags: [Documents]
 *     summary: Get client workspace (folders)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client workspace folders retrieved
 */
router.get('/clients/:clientId', DocumentController.getFolders);

export default router;

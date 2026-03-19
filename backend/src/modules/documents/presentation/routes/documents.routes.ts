import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

/**
 * @openapi
 * tags:
 *   name: Documents
 *   description: Document management and storage
 */

router.use(authenticate);

/**
 * @openapi
 * /documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document
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
 *         description: Document uploaded successfully
 */
router.post('/upload', upload.single('file'), DocumentController.upload);

/**
 * @openapi
 * /documents/clients/{clientId}/folders:
 *   get:
 *     tags: [Documents]
 *     summary: Get folders for a specific client
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
 *         description: Folders list retrieved
 */
router.get('/clients/:clientId/folders', DocumentController.getFolders);

/**
 * @openapi
 * /documents/folders/{folderId}/documents:
 *   get:
 *     tags: [Documents]
 *     summary: Get documents inside a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Documents list retrieved
 */
router.get('/folders/:folderId/documents', DocumentController.getFolderDocuments);

/**
 * @openapi
 * /documents/download/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Download document by ID
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
 *         description: File downloaded
 */
router.get('/download/:id', DocumentController.download);

/**
 * @openapi
 * /documents/{id}/share:
 *   patch:
 *     tags: [Documents]
 *     summary: Share document with other users
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
 *         description: Share successful
 */
router.patch('/:id/share', DocumentController.share);

/**
 * @openapi
 * /documents/stats:
 *   get:
 *     tags: [Documents]
 *     summary: Get document statistics (count, storage size)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get('/stats', DocumentController.getStats);

export default router;
